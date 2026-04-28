# Learning Stack

Learning Stack is a full-stack learning resource sharing platform where students can upload, discover, search, filter, and upvote useful study materials.

## Live Website

- [https://learningstack.vercel.app](https://learningstack.vercel.app)

## Group Members

- Thatoe Nyi - 6708351
- Aung Kyaw Phyo - 6708142
- Hein Htet Zaw - 6708120

## Project Features

- User authentication (register, login, logout) with NextAuth Credentials
- Upload learning resources with custom categories
- Search resources by title, URL, and category
- Filter by category
- Upvote system (one upvote per user per resource)
- Owner-only edit and delete for uploaded resources
- Personal upload history page with pagination
- Responsive UI using standard CSS and CSS Modules

## Tech Stack

### Frontend

- Next.js (App Router)
- React
- CSS Modules + global CSS

### Backend

- Next.js API Routes (`app/api/...`)
- NextAuth (`next-auth`)
- `bcryptjs` for password hashing

### Database

- MySQL / TiDB Cloud
- `mysql2` for DB connection

## Getting Started (Local Development)

### 1) Install dependencies

```bash
npm install
```

### 2) Set environment variables

Create a `.env` file in the project root:

```env
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=your_db_name
DB_PORT=4000
DB_SSL=true
```

### 3) Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - start development server
- `npm run build` - build for production
- `npm run start` - start production server

## Deployment

This project is deployed on Vercel and connected to TiDB Cloud.

Production URL: [https://learningstack.vercel.app](https://learningstack.vercel.app)
