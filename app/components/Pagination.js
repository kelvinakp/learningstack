'use client';

import styles from './Pagination.module.css';

export default function Pagination({ page, totalPages, onPageChange, disabled }) {
  if (totalPages < 1) {
    return null;
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const atOnlyPage = totalPages === 1;

  return (
    <nav className={styles.nav} aria-label="Pagination">
      <button
        type="button"
        className={styles.btn}
        disabled={disabled || !canPrev}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        Prev
      </button>
      <span className={styles.pageIndicator} aria-current="page">
        {atOnlyPage ? page : `${page} / ${totalPages}`}
      </span>
      <button
        type="button"
        className={styles.btn}
        disabled={disabled || !canNext}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
