'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ResourceCard from '../components/ResourceCard';
import Pagination from '../components/Pagination';
import styles from './history.module.css';

const PAGE_SIZE = 6;

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [resources, setResources] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadResources = useCallback(async (pageToLoad) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/resources?mine=1&page=${pageToLoad}&pageSize=${PAGE_SIZE}`
      );
      if (res.status === 401) {
        setError('You must be logged in to view your uploads.');
        setResources([]);
        setTotalPages(0);
        return;
      }
      if (!res.ok) {
        setError('Failed to load your resources.');
        return;
      }
      const body = await res.json();
      setResources(body.data);
      setTotalPages(body.totalPages);
    } catch {
      setError('Failed to load your resources.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setLoading(false);
      return;
    }
    if (status === 'authenticated') {
      loadResources(page);
    }
  }, [status, page, loadResources]);

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
        prev.map((r) =>
          Number(r.id) === Number(id)
            ? { ...r, upvotes: r.upvotes + 1, user_has_upvoted: 1 }
            : r
        )
      );
    } catch {
      setError('Failed to upvote');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      if (res.status === 401) {
        setError('You must be logged in.');
        return;
      }
      if (res.status === 403) {
        setError('You can only delete your own resources.');
        return;
      }
      if (!res.ok) {
        setError('Failed to delete resource');
        return;
      }
      if (resources.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        loadResources(page);
      }
    } catch {
      setError('Failed to delete resource');
    }
  };

  const onPageChange = (next) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>My uploads</h1>
        <p className={styles.hint}>
          <Link href="/login">Log in</Link> to see resources you have shared and manage them.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <Link href="/" className={styles.backLink}>
          &larr; Back to dashboard
        </Link>
        <h1 className={styles.heading}>My uploads</h1>
        <p className={styles.subheading}>
          Resources you have added. Edit details or remove any entry.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading your resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <p className={styles.empty}>
          You have not added any resources yet.{' '}
          <Link href="/add" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Add a resource
          </Link>
        </p>
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
                onEdit={(rid) => router.push(`/history/edit/${rid}`)}
                showDate
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
