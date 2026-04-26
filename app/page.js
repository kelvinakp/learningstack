'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import FilterBar from './components/FilterBar';
import ResourceCard from './components/ResourceCard';
import Pagination from './components/Pagination';
import styles from './page.module.css';

const PAGE_SIZE = 9;

export default function Home() {
  const { data: session } = useSession();
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (activeCategory) params.set('category', activeCategory);
      const trimmed = searchQuery.trim();
      if (trimmed) params.set('search', trimmed);

      const res = await fetch(`/api/resources?${params.toString()}`);
      const data = await res.json();
      setResources(data.data);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery, page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResources();
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [activeCategory, searchQuery, page, session?.user?.id, fetchResources]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch {
      setError('Failed to load categories');
    }
  };

  const handleUpvote = async (id) => {
    if (!session?.user?.id) {
      setError('Log in to upvote.');
      return;
    }
    try {
      const res = await fetch(`/api/resources/${id}/upvote`, { method: 'PUT' });
      if (res.status === 401) {
        setError('You must be logged in to upvote.');
        return;
      }
      if (res.status === 409) {
        setError('You already upvoted this resource.');
        setResources((prev) =>
          prev.map((r) =>
            Number(r.id) === Number(id) ? { ...r, user_has_upvoted: 1 } : r
          )
        );
        return;
      }
      if (!res.ok) {
        setError('Failed to upvote');
        return;
      }
      setResources((prev) =>
        prev
          .map((r) =>
            Number(r.id) === Number(id)
              ? { ...r, upvotes: r.upvotes + 1, user_has_upvoted: 1 }
              : r
          )
          .sort((a, b) => b.upvotes - a.upvotes)
      );
    } catch {
      setError('Failed to upvote');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 403) {
          setError('You can only delete your own resources.');
          return;
        }
        setError('Failed to delete resource');
        return;
      }
      if (resources.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchResources();
      }
    } catch {
      setError('Failed to delete resource');
    }
  };

  const onPageChange = (next) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.heading}>Learning Stack</h1>
        <p className={styles.subheading}>
          Share, discover, and upvote the best learning resources
        </p>
      </div>

      <div className={styles.searchWrapper}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search resources by title, URL, or category..."
          value={searchQuery}
          onChange={(e) => {
            setPage(1);
            setSearchQuery(e.target.value);
          }}
        />
      </div>

      <FilterBar
        categories={categories}
        activeCategory={activeCategory}
        onFilterChange={(id) => {
          setPage(1);
          setActiveCategory(id);
        }}
      />

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <p className={styles.empty}>No resources found. Be the first to add one!</p>
      ) : (
        <>
          <div className={styles.grid}>
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                sessionUserId={session?.user?.id}
                onUpvote={handleUpvote}
                onDelete={handleDelete}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
