import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

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
