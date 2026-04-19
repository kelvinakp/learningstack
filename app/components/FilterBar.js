'use client';

import styles from './FilterBar.module.css';

export default function FilterBar({ categories, activeCategory, onFilterChange }) {
  return (
    <div className={styles.filterBar}>
      <button
        className={`${styles.filterButton} ${activeCategory === null ? styles.active : ''}`}
        onClick={() => onFilterChange(null)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`${styles.filterButton} ${activeCategory === cat.id ? styles.active : ''}`}
          onClick={() => onFilterChange(cat.id)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
