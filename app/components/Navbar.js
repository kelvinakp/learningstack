'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>📚</span> Learning Stack
        </Link>
        <div className={styles.links}>
          <Link href="/" className={styles.link}>
            Dashboard
          </Link>
          {session ? (
            <>
              <Link href="/history" className={styles.link}>
                My uploads
              </Link>
              <Link href="/add" className={styles.addButton}>
                + Add Resource
              </Link>
              <span className={styles.username}>{session.user.name}</span>
              <button
                className={styles.logoutButton}
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.link}>
                Login
              </Link>
              <Link href="/register" className={styles.addButton}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
