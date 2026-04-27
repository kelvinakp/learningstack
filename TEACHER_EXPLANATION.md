# StudyStack Code Explanation Guide

This document is designed to help you explain the codebase step-by-step to your teacher. It breaks down the most important files in the project, explaining what the code does and why it was written that way.

---

## 1. Database Connection (`lib/db.js`)
This file is responsible for connecting our Node.js server to the MySQL database.

```javascript
import mysql from 'mysql2/promise';

export const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'studystack',
  connectionLimit: 10,
});

export default mysqlPool;
```
**Explanation:**
- We use the `mysql2/promise` library to allow us to write modern, asynchronous JavaScript (`async/await`) when talking to the database.
- `createPool` is better than a single connection because it manages multiple connections (up to 10 at once). If multiple users use the app at the same time, the pool hands out available connections so the server doesn't crash or slow down.
- Environment variables (`process.env`) are used for security, so we don't hardcode passwords in the codebase.

---

## 2. Authentication (`lib/auth.js` & `app/api/auth/[...nextauth]/route.js`)
We use **NextAuth.js** to handle user login and sessions securely using JSON Web Tokens (JWT).

```javascript
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import pool from './db';

export const authOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // 1. Find user in the database
        const [rows] = await pool.query(
          'SELECT * FROM users WHERE username = ?',
          [credentials.username]
        );
        if (rows.length === 0) return null;

        const user = rows[0];
        
        // 2. Compare the provided password with the hashed password
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        // 3. Return user data to be stored in the session
        return { id: String(user.id), name: user.username };
      },
    }),
  ],
  // ... callbacks to save the user ID in the token ...
};
```
**Explanation:**
- **CredentialsProvider:** We defined a custom login method because we are using our own MySQL database, not Google or GitHub login.
- **bcrypt.compare:** When users register, their passwords are mathematically scrambled (hashed). When they log in, `bcrypt` scrambles the entered password and checks if it matches the one in the database. This means if the database is ever hacked, the hackers cannot see the real passwords.
- NextAuth automatically creates the `/api/auth/session` endpoint for our frontend to check if someone is logged in.

---

## 3. The Resources API (`app/api/resources/route.js`)
This is the core backend file. It handles fetching resources (GET) and creating new ones (POST).

### Fetching Data (The `GET` method)
```javascript
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || 1;
  const search = searchParams.get('search');
  
  let query = `
    SELECT r.*, c.name AS category_name,
      (ru.user_id IS NOT NULL) AS user_has_upvoted
    FROM resources r
    JOIN categories c ON r.category_id = c.id
    LEFT JOIN resource_upvotes ru ON ru.resource_id = r.id AND ru.user_id = ?
    WHERE 1=1
  `;
  // ... we dynamically add "AND r.title LIKE ?" if they searched for something
  // ... we add "LIMIT ? OFFSET ?" for pagination
  
  const [rows] = await pool.query(query, params);
  return NextResponse.json({ data: rows, page, totalPages });
}
```
**Explanation:**
- **SQL JOINs:** We join the `resources` table with the `categories` table to get the category's name. We also `LEFT JOIN` the `resource_upvotes` table to check if the currently logged-in user has already upvoted this specific resource.
- **Dynamic Queries:** We start with `WHERE 1=1` so we can easily append filters like `AND category_id = 5` or `AND title LIKE '%react%'` using JavaScript `if` statements.
- **Pagination:** Instead of sending all 10,000 resources to the browser at once (which would be slow), we use `LIMIT` and `OFFSET` to only send 9 at a time.

### Creating Data (The `POST` method)
```javascript
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Check if category exists, if not, create it
    const [existingCat] = await conn.query('SELECT id FROM categories WHERE name = ?', [category_name]);
    let categoryId = existingCat.length ? existingCat[0].id : (await conn.query('INSERT INTO categories...', [category_name]))[0].insertId;

    // 2. Insert the resource
    await conn.query(
      'INSERT INTO resources (title, url, type, category_id, user_id) VALUES (?, ?, ?, ?, ?)',
      [title, url, type, categoryId, session.user.id]
    );

    await conn.commit(); // Save changes permanently
    return NextResponse.json({ message: 'Success' });
  } catch(err) {
    await conn.rollback(); // Undo changes if something broke
  } finally {
    conn.release(); // Give the connection back to the pool
  }
}
```
**Explanation:**
- **Transactions (`beginTransaction` / `commit` / `rollback`):** Because adding a resource might require adding a new category *first*, we wrap both steps in a transaction. If the category creates successfully but the resource fails, `rollback()` undoes the category creation. This prevents junk data from accumulating in the database.
- **Security:** We check `getServerSession()` first. If the user isn't logged in, we reject the request with a `401 Unauthorized` status.

---

## 4. Upvoting logic (`app/api/resources/[id]/upvote/route.js`)
```javascript
export async function PUT(request, { params }) {
  const { id } = await params; // resource ID
  
  // INSERT IGNORE will silently fail if the user already upvoted this resource
  const [insertResult] = await conn.query(
    'INSERT IGNORE INTO resource_upvotes (user_id, resource_id) VALUES (?, ?)',
    [userId, id]
  );

  if (insertResult.affectedRows === 0) {
    return NextResponse.json({ error: 'Already upvoted' }, { status: 409 });
  }

  // If insert was successful, increase the count
  await conn.query('UPDATE resources SET upvotes = upvotes + 1 WHERE id = ?', [id]);
}
```
**Explanation:**
- Our database schema has a composite primary key on the `resource_upvotes` table combining `(user_id, resource_id)`.
- **INSERT IGNORE:** If a user tries to upvote twice, the database sees a duplicate primary key and rejects it. `INSERT IGNORE` catches this gracefully, returning `affectedRows: 0`. We use this to return a `409 Conflict` error to the frontend, ensuring users can't cheat the ranking system.

---

## 5. The Main Dashboard Frontend (`app/page.js`)
This React component renders the homepage.

```javascript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export default function Home() {
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fetchResources = useCallback(async () => {
    // 1. Build the API URL with query parameters
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    
    // 2. Fetch from our backend
    const res = await fetch(`/api/resources?${params.toString()}`);
    const data = await res.json();
    setResources(data.data);
  }, [searchQuery]);

  // 3. Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResources();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchResources]);

  // 4. Render the UI
  return (
    <div>
      <input 
        onChange={(e) => setSearchQuery(e.target.value)} 
        placeholder="Search..." 
      />
      {resources.map(resource => (
         <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  )
}
```
**Explanation:**
- **`'use client'`:** We tell Next.js this component runs in the browser, allowing us to use React hooks like `useState` and `useEffect`.
- **Debouncing (`setTimeout` in `useEffect`):** When the user types "React" into the search bar, the `onChange` event fires 5 times (R, e, a, c, t). If we fetched the database every time they pressed a key, it would crash the server. `setTimeout(..., 300)` waits until the user *stops typing for 300 milliseconds* before asking the database for results.
- **State mapping:** We map over the `resources` array to dynamically render `ResourceCard` components, passing the data as "props" so the card knows what title and URL to display.

---

## 6. Resource Card Component (`app/components/ResourceCard.js`)
This is a reusable UI component that displays a single resource.

```javascript
export default function ResourceCard({ resource, sessionUserId, onUpvote, onDelete }) {
  const isOwner = String(resource.user_id) === String(sessionUserId);
  const alreadyUpvoted = resource.user_has_upvoted === 1;

  return (
    <div className={styles.card}>
      <h3>{resource.title}</h3>
      <a href={resource.url} target="_blank">Open Resource</a>
      
      <button 
        disabled={alreadyUpvoted}
        onClick={() => onUpvote(resource.id)}
      >
        Upvote {resource.upvotes}
      </button>

      {isOwner && (
        <button onClick={() => onDelete(resource.id)}>Delete</button>
      )}
    </div>
  );
}
```
**Explanation:**
- **Props:** We pass `sessionUserId` to the card to determine if the person viewing the card is the person who uploaded it. If they are the owner (`isOwner` is true), we use **Conditional Rendering** (`{isOwner && ...}`) to reveal the Delete and Edit buttons.
- **State synchronization:** When `onUpvote` is clicked, the parent component (`app/page.js`) tells the database to increment the count, and then updates the React state to disable the button instantly without refreshing the page.

---

## Conclusion
By combining **Next.js API routes** for a secure backend, **MySQL transactions** for data integrity, and **React Hooks** for a fast, responsive user interface, we've built a robust, modern web application. Every feature (from debounced searching to paginated SQL queries) was designed to handle real-world scale and prevent cheating or bugs.