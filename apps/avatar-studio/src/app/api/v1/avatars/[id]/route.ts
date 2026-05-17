import { NextRequest, NextResponse } from 'next/server';
import { getAvatar, updateAvatar, deleteAvatar } from '@/lib/avatarStore';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/avatars/:id
 *
 * Retrieve a single avatar by ID.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const avatar = getAvatar(id);

  if (!avatar) {
    return NextResponse.json({ error: 'Avatar not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ data: avatar });
}

/**
 * PUT /api/v1/avatars/:id
 *
 * Update an existing avatar's blueprint.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { blueprint, changeDescription } = body;

    if (!blueprint) {
      return NextResponse.json(
        { error: 'Missing blueprint in request body', code: 'MISSING_BLUEPRINT' },
        { status: 400 }
      );
    }

    const updated = updateAvatar(id, blueprint, changeDescription);

    if (!updated) {
      return NextResponse.json({ error: 'Avatar not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update avatar',
        code: 'UPDATE_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/avatars/:id
 *
 * Delete an avatar by ID.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const deleted = deleteAvatar(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Avatar not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

/**
 * OPTIONS /api/v1/avatars/:id
 *
 * Handle CORS preflight.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-ID, X-User-Token',
    },
  });
}
