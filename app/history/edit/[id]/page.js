'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from '../../edit.module.css';

export default function EditResourcePage() {
  const { id: idParam } = useParams();
  const id = String(idParam);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'Article',
    category: '',
  });
  const [loadError, setLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      setLoading(false);
      return;
    }
    if (sessionStatus !== 'authenticated' || !session?.user?.id) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      setForbidden(false);
      try {
        const res = await fetch(`/api/resources/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) setLoadError('Resource not found.');
          } else {
            if (!cancelled) setLoadError('Failed to load resource.');
          }
          return;
        }
        const data = await res.json();
        if (String(data.user_id) !== String(session.user.id)) {
          if (!cancelled) setForbidden(true);
          return;
        }
        if (!cancelled) {
          setFormData({
            title: data.title || '',
            url: data.url || '',
            type: data.type || 'Article',
            category: data.category_name || '',
          });
        }
      } catch {
        if (!cancelled) setLoadError('Failed to load resource.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, session?.user?.id, sessionStatus]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          url: formData.url,
          type: formData.type,
          category_name: formData.category.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update resource');
      }

      router.push('/history');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>Edit resource</h1>
        <p className={styles.hint}>
          <Link href="/login">Log in</Link> to edit your resources.
        </p>
      </div>
    );
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.muted}>Loading...</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>Cannot edit this resource</h1>
        <p className={styles.hint}>You can only edit resources you uploaded.</p>
        <Link href="/history" className={styles.backLink}>
          &larr; Back to my uploads
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{loadError}</p>
        <Link href="/history" className={styles.backLink}>
          &larr; Back to my uploads
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/history" className={styles.backLink}>
        &larr; Back to my uploads
      </Link>
      <h1 className={styles.heading}>Edit resource</h1>
      <p className={styles.subheading}>Update the details and save your changes</p>

      {submitError && <p className={styles.error}>{submitError}</p>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="url">URL</label>
          <input
            id="url"
            name="url"
            type="url"
            value={formData.url}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="type">Type</label>
            <select id="type" name="type" value={formData.type} onChange={handleChange}>
              <option value="Article">Article</option>
              <option value="Video">Video</option>
              <option value="Course">Course</option>
              <option value="Tool">Tool</option>
              <option value="Book">Book</option>
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="category">Category</label>
            <input
              id="category"
              name="category"
              type="text"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g. Web Dev, Calculus"
              required
            />
          </div>
        </div>

        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
