'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './add.module.css';

export default function AddResource() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'Article',
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          url: formData.url,
          type: formData.type,
          category_name: formData.category.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add resource');
      }

      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Add a New Resource</h1>
      <p className={styles.subheading}>Share a helpful learning resource with the community</p>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. JavaScript Crash Course"
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
            placeholder="https://example.com/resource"
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
              placeholder="e.g. English, Calculus, Web Dev"
              required
            />
          </div>
        </div>

        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Resource'}
        </button>
      </form>
    </div>
  );
}
