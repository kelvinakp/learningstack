import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const [result] = await pool.query(
      'UPDATE resources SET upvotes = upvotes + 1 WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Upvoted successfully' });
  } catch (error) {
    console.error('PUT /api/resources/[id]/upvote error:', error);
    return NextResponse.json(
      { error: 'Failed to upvote' },
      { status: 500 }
    );
  }
}
