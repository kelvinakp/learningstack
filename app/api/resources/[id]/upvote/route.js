import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'You must be logged in to upvote' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const conn = await pool.getConnection();

  try {
    const { id } = await params;
    const resourceId = Number(id);

    await conn.beginTransaction();

    // INSERT IGNORE works on MySQL + TiDB: duplicate (user_id, resource_id) => affectedRows 0
    const [insertResult] = await conn.query(
      'INSERT IGNORE INTO resource_upvotes (user_id, resource_id) VALUES (?, ?)',
      [userId, resourceId]
    );

    if (insertResult.affectedRows === 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: 'You have already upvoted this resource' },
        { status: 409 }
      );
    }

    const [updateResult] = await conn.query(
      'UPDATE resources SET upvotes = upvotes + 1 WHERE id = ?',
      [resourceId]
    );

    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    await conn.commit();
    return NextResponse.json({ message: 'Upvoted successfully' });
  } catch (error) {
    await conn.rollback();
    console.error('PUT /api/resources/[id]/upvote error:', error);
    return NextResponse.json({ error: 'Failed to upvote' }, { status: 500 });
  } finally {
    conn.release();
  }
}
