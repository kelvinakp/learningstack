import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id ? Number(session.user.id) : null;

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');
    const search = searchParams.get('search')?.trim();
    const mineOnly = searchParams.get('mine') === '1';

    if (mineOnly && !sessionUserId) {
      return NextResponse.json(
        { error: 'You must be logged in to view your resources' },
        { status: 401 }
      );
    }

    let whereFilter = '';
    const filterParams = [];

    if (categoryId) {
      whereFilter += ' AND r.category_id = ?';
      filterParams.push(categoryId);
    }

    if (search) {
      whereFilter += ' AND (r.title LIKE ? OR r.url LIKE ? OR c.name LIKE ?)';
      const pattern = `%${search}%`;
      filterParams.push(pattern, pattern, pattern);
    }

    if (mineOnly) {
      whereFilter += ' AND r.user_id = ?';
      filterParams.push(sessionUserId);
    }

    const orderBy = mineOnly
      ? ' ORDER BY r.created_at DESC'
      : ' ORDER BY r.upvotes DESC, r.created_at DESC';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM resources r
      JOIN categories c ON r.category_id = c.id
      WHERE 1=1
      ${whereFilter}
    `;

    let query = `
      SELECT r.*, c.name AS category_name,
        (ru.user_id IS NOT NULL) AS user_has_upvoted
      FROM resources r
      JOIN categories c ON r.category_id = c.id
      LEFT JOIN resource_upvotes ru ON ru.resource_id = r.id AND ru.user_id = ?
      WHERE 1=1
      ${whereFilter}
    `;
    const params = [sessionUserId, ...filterParams];

    const pageParam = searchParams.get('page');
    if (pageParam != null && pageParam !== '') {
      const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
      const pageSize = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get('pageSize') || '9', 10) || 9)
      );
      const offset = (page - 1) * pageSize;

      const [countRows] = await pool.query(countSql, filterParams);
      const total = Number(countRows[0].total) || 0;
      const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

      query += `${orderBy} LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);

      const [rows] = await pool.query(query, params);
      const normalized = rows.map((row) => ({
        ...row,
        user_has_upvoted: row.user_has_upvoted ? 1 : 0,
      }));
      return NextResponse.json({
        data: normalized,
        page,
        pageSize,
        total,
        totalPages,
      });
    }

    query += orderBy;
    const [rows] = await pool.query(query, params);
    const normalized = rows.map((row) => ({
      ...row,
      user_has_upvoted: row.user_has_upvoted ? 1 : 0,
    }));
    return NextResponse.json(normalized);
  } catch (error) {
    console.error('GET /api/resources error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'You must be logged in' }, { status: 401 });
  }

  const conn = await pool.getConnection();
  try {
    const { title, url, type, category_name } = await request.json();
    const trimmedCategory = category_name?.trim();

    if (!title || !url || !type || !trimmedCategory) {
      conn.release();
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER(?)',
      [trimmedCategory]
    );

    let categoryId;
    if (existing.length > 0) {
      categoryId = existing[0].id;
    } else {
      const [catResult] = await conn.query(
        'INSERT INTO categories (name) VALUES (?)',
        [trimmedCategory]
      );
      categoryId = catResult.insertId;
    }

    const [result] = await conn.query(
      'INSERT INTO resources (title, url, type, category_id, user_id) VALUES (?, ?, ?, ?, ?)',
      [title, url, type, categoryId, session.user.id]
    );

    await conn.commit();

    return NextResponse.json(
      { id: result.insertId, message: 'Resource created' },
      { status: 201 }
    );
  } catch (error) {
    await conn.rollback();
    console.error('POST /api/resources error:', error);
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
