import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const [rows] = await pool.query(
      `SELECT r.*, c.name AS category_name
       FROM resources r
       JOIN categories c ON r.category_id = c.id
       WHERE r.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('GET /api/resources/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'You must be logged in' }, { status: 401 });
  }

  const { id } = await params;
  const [existing] = await pool.query('SELECT user_id FROM resources WHERE id = ?', [id]);
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }
  if (String(existing[0].user_id) !== String(session.user.id)) {
    return NextResponse.json(
      { error: 'You can only edit your own resources' },
      { status: 403 }
    );
  }

  const { title, url, type, category_name } = await request.json();
  const trimmedCategory = category_name?.trim();

  if (!title || !url || !type || !trimmedCategory) {
    return NextResponse.json(
      { error: 'All fields are required' },
      { status: 400 }
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [catRows] = await conn.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER(?)',
      [trimmedCategory]
    );

    let categoryId;
    if (catRows.length > 0) {
      categoryId = catRows[0].id;
    } else {
      const [catResult] = await conn.query(
        'INSERT INTO categories (name) VALUES (?)',
        [trimmedCategory]
      );
      categoryId = catResult.insertId;
    }

    await conn.query(
      'UPDATE resources SET title = ?, url = ?, type = ?, category_id = ? WHERE id = ?',
      [title, url, type, categoryId, id]
    );

    await conn.commit();
    return NextResponse.json({ message: 'Resource updated' });
  } catch (error) {
    await conn.rollback();
    console.error('PUT /api/resources/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update resource' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 });
    }

    const { id } = await params;

    const [rows] = await pool.query('SELECT user_id FROM resources WHERE id = ?', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    if (String(rows[0].user_id) !== String(session.user.id)) {
      return NextResponse.json({ error: 'You can only delete your own resources' }, { status: 403 });
    }

    await pool.query('DELETE FROM resources WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Resource deleted' });
  } catch (error) {
    console.error('DELETE /api/resources/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 }
    );
  }
}
