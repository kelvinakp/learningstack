# StudyStack Codebase Documentation

StudyStack is a full-stack Next.js web application that allows university students to share, categorize, and rank learning resources.

## 1. Tech Stack Overview
- **Framework:** Next.js 15 (App Router)
- **Frontend:** React 19, CSS Modules for scoped styling
- **Backend:** Next.js API Routes (`app/api/*`)
- **Database:** MySQL via `mysql2/promise` connection pool
- **Authentication:** NextAuth.js (`next-auth`) with JWT strategy and custom credentials provider
- **Password Hashing:** `bcryptjs`

## 2. Directory Structure
```text
/app
  globals.css              # Global styles and CSS variables
  layout.js                # Root layout with <Providers> and <Navbar>
  page.js & page.module.css # Main dashboard page
  providers.js             # Client-side NextAuth SessionProvider wrapper
  /add                     # Page to create a new resource
  /history                 # Page displaying "My uploads" with pagination
    /edit/[id]             # Dynamic route to edit an uploaded resource
  /login                   # Login page
  /register                # Registration page
  /api                     # Backend API routes
  /components              # Reusable React UI components
/lib
  auth.js                  # NextAuth configuration and credentials logic
  db.js                    # MySQL connection pool setup
schema.sql                 # SQL script containing table definitions and seed data
```

## 3. Database Schema (`schema.sql`)
The application uses a MySQL database named `studystack`.
- **`users`:** `id`, `username` (unique), `password` (bcrypt hashed).
- **`categories`:** `id`, `name`.
- **`resources`:** `id`, `title`, `url`, `type` (e.g., Video, Article), `category_id` (FK), `user_id` (FK, owner), `upvotes`, `created_at`.
- **`resource_upvotes`:** A many-to-many link table tracking upvotes to prevent duplicates. Contains `user_id` and `resource_id` (composite primary key).

## 4. Backend Architecture (API Routes)
The backend is built entirely within the Next.js App Router using route handlers.

### Authentication
- **`POST /api/register`:** Handles user registration. Validates input, hashes the password using `bcrypt`, and inserts it into the `users` table.
- **`POST /api/auth/[...nextauth]`:** Built-in NextAuth endpoint. Configured via `lib/auth.js` using `CredentialsProvider`. Validates credentials against the `users` table.

### Resources
- **`GET /api/resources`:** 
  - Fetches resources joined with categories and checks if the logged-in user has upvoted them.
  - Supports filtering by `category`, text `search`, and a `mine=1` flag to only fetch the logged-in user's uploads.
  - Implements **server-side pagination** (`page` and `pageSize`), returning `data`, `total`, and `totalPages`.
- **`POST /api/resources`:** 
  - Creates a new resource. Requires authentication.
  - Dynamically searches for an existing category (case-insensitive) or creates a new one using a database transaction.
- **`GET /api/resources/[id]`:** 
  - Retrieves a single resource by ID for the edit page.
- **`PUT /api/resources/[id]`:** 
  - Updates an existing resource's details. Verifies that the requester is the resource owner.
- **`DELETE /api/resources/[id]`:** 
  - Deletes a resource. Verifies ownership and cascading deletes its upvotes (handled by DB constraints).
- **`PUT /api/resources/[id]/upvote`:** 
  - Increments the `upvotes` counter. Uses `INSERT IGNORE` into `resource_upvotes` within a transaction to enforce exactly one upvote per user per resource.

### Categories
- **`GET /api/categories`:** 
  - Returns a list of all unique categories ordered alphabetically, used by the filter bar and the add/edit forms.

## 5. Frontend Architecture
The frontend leverages Next.js App Router's client components (`'use client'`) where interactivity and state are needed.

### Key Pages
- **Dashboard (`app/page.js`)**: 
  - The main landing page. Displays the `FilterBar`, a search input, and a grid of `ResourceCard` components.
  - Automatically debounces search inputs and fetches server-side paginated resources.
- **Add Resource (`app/add/page.js`)**: 
  - Form capturing resource details (title, URL, type, category). Submits to `POST /api/resources`.
- **History ("My Uploads") (`app/history/page.js`)**: 
  - Displays resources uploaded by the current user using `GET /api/resources?mine=1`.
  - Includes edit and delete buttons on the resource cards. Uses the `Pagination` component.
- **Edit Resource (`app/history/edit/[id]/page.js`)**: 
  - Fetches details of a specific resource and pre-fills the form. Checks ownership. Submits to `PUT /api/resources/[id]`.
- **Auth (`app/login/page.js` & `app/register/page.js`)**: 
  - Forms for user authentication.

### Reusable Components (`app/components/`)
- **`Navbar.js`:** Global navigation. Shows login/register links if unauthenticated, or user info, "My uploads", and "Logout" buttons when authenticated via NextAuth.
- **`ResourceCard.js`:** Visual display for a resource. Handles color-coded type badges, upvote buttons (with conditional styling and logic if already upvoted), and optional owner actions (Edit/Delete).
- **`FilterBar.js`:** Horizontal scrolling list of category tabs. Triggers refetches on the dashboard.
- **`Pagination.js`:** A simple "Prev | X / Y | Next" navigation component used on the dashboard and history views to navigate server-side pages.

## 6. Styling Strategy
- **`app/globals.css`:** Defines CSS custom properties (`--color-primary`, `--color-surface`, etc.), basic resets, and font-family settings.
- **CSS Modules (`*.module.css`)**: Used across pages and components to scope CSS class names locally, preventing style collisions and enforcing modularity. Responsive layouts use CSS grid (`auto-fill`) and flexbox.