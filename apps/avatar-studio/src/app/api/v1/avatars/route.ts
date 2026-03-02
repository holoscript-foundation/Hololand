import { NextRequest, NextResponse } from 'next/server';
import {
  createAvatar,
  listAvatars,
} from '@/lib/avatarStore';

/**
 * GET /api/v1/avatars
 *
 * List avatars for the authenticated user/app.
 * Supports pagination via limit/offset query params.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const appId = request.headers.get('X-App-ID') ?? undefined;
  const userToken = request.headers.get('X-User-Token') ?? undefined;
  const tagsParam = searchParams.get('tags');
  const tags = tagsParam ? tagsParam.split(',') : undefined;

  const result = listAvatars({
    userId: userToken,
    appId,
    limit,
    offset,
    tags,
  });

  return NextResponse.json({
    data: result.avatars,
    total: result.total,
    hasMore: result.hasMore,
  });
}

/**
 * POST /api/v1/avatars
 *
 * Create a new avatar from a blueprint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blueprint, tags, isPublic } = body;

    if (!blueprint) {
      return NextResponse.json(
        { error: 'Missing blueprint in request body', code: 'MISSING_BLUEPRINT' },
        { status: 400 },
      );
    }

    if (!blueprint.id || !blueprint.name) {
      return NextResponse.json(
        { error: 'Blueprint must include id and name', code: 'INVALID_BLUEPRINT' },
        { status: 400 },
      );
    }

    const appId = request.headers.get('X-App-ID') ?? 'studio';
    const userToken = request.headers.get('X-User-Token') ?? undefined;

    const avatar = createAvatar(blueprint, {
      appId,
      userId: userToken ?? 'anonymous',
      tags,
      isPublic,
    });

    return NextResponse.json({ data: avatar }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create avatar',
        code: 'CREATE_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/v1/avatars
 *
 * Handle CORS preflight requests.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-App-ID, X-User-Token',
    },
  });
}
