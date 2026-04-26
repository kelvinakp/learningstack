'use client';

import styles from './ResourceCard.module.css';

const TYPE_COLORS = {
  Video: '#e74c3c',
  Article: '#3498db',
  Course: '#2ecc71',
  Tool: '#f39c12',
  Book: '#9b59b6',
};

export default function ResourceCard({
  resource,
  sessionUserId,
  onUpvote,
  onDelete,
  onEdit,
  showDate = false,
}) {
  const badgeColor = TYPE_COLORS[resource.type] || '#95a5a6';
  const isOwner = sessionUserId && String(resource.user_id) === String(sessionUserId);
  const loggedIn = Boolean(sessionUserId);
  const alreadyUpvoted =
    resource.user_has_upvoted === true ||
    resource.user_has_upvoted === 1 ||
    resource.user_has_upvoted === '1';
  const upvoteDisabled = !loggedIn || alreadyUpvoted;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${resource.title}"?`)) {
      onDelete(resource.id);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.typeBadge} style={{ backgroundColor: badgeColor }}>
          {resource.type}
        </span>
        <span className={styles.category}>{resource.category_name}</span>
      </div>

      <h3 className={styles.title}>{resource.title}</h3>

      {showDate && resource.created_at && (
        <p className={styles.date}>
          Uploaded {new Date(resource.created_at).toLocaleString()}
        </p>
      )}

      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.openButton}
      >
        Open Resource
      </a>

      <div className={styles.cardFooter}>
        <button
          type="button"
          className={`${styles.upvoteButton} ${upvoteDisabled ? styles.upvoteDisabled : ''}`}
          disabled={upvoteDisabled}
          title={
            !loggedIn
              ? 'Log in to upvote'
              : alreadyUpvoted
                ? 'You already upvoted this'
                : 'Upvote'
          }
          onClick={() => onUpvote(resource.id)}
        >
          {alreadyUpvoted ? 'Upvoted' : '▲'} {resource.upvotes}
        </button>
        {isOwner && (
          <div className={styles.ownerActions}>
            {onEdit && (
              <button
                type="button"
                className={styles.editButton}
                onClick={() => onEdit(resource.id)}
              >
                Edit
              </button>
            )}
            <button type="button" className={styles.deleteButton} onClick={handleDelete}>
              ✕ Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
