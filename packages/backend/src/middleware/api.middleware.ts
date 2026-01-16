// API middleware for validation, error handling, pagination, rate limiting
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

// Global error handler
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: ValidationError[]
  ) {
    super(message);
  }
}

// Validation helper
export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new ApiError(400, 'Validation failed', errors);
    }
    throw new ApiError(400, 'Invalid request body');
  }
}

// Pagination helper
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  maxLimit = 100
): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Rate limiting middleware
export function getRateLimitKey(request: NextRequest, userId?: string): string {
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
  return userId ? `user:${userId}` : `ip:${ip}`;
}

export function checkRateLimit(
  key: string,
  limit = 100,
  windowMs = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Response helpers
export function successResponse<T>(data: T, statusCode = 200): Response {
  return NextResponse.json({ success: true, data }, { status: statusCode });
}

export function errorResponse(
  statusCode: number,
  message: string,
  errors?: ValidationError[]
): Response {
  return NextResponse.json(
    { success: false, error: message, ...(errors && { errors }) },
    { status: statusCode }
  );
}

// Async error handler (wraps route handlers)
export function asyncHandler(fn: Function) {
  return async (request: NextRequest) => {
    try {
      return await fn(request);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error.statusCode, error.message, error.errors);
      }

      if (error instanceof z.ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return errorResponse(400, 'Validation failed', errors);
      }

      console.error('Unhandled error:', error);
      return errorResponse(500, 'Internal server error');
    }
  };
}

// Common validation schemas
export const schemas = {
  signup: z.object({
    email: z.string().email('Invalid email format'),
    username: z.string().min(3).max(50),
    password: z.string().min(8),
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string(),
  }),

  createWorld: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    data: z.record(z.any()).optional(),
  }),

  updateWorld: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    data: z.record(z.any()).optional(),
  }),

  createReview: z.object({
    rating: z.number().min(1).max(5),
    review_text: z.string().max(1000).optional(),
  }),

  updateProfile: z.object({
    display_name: z.string().max(100).optional(),
    bio: z.string().max(500).optional(),
    avatar_url: z.string().url().optional(),
  }),
};

// Middleware wrapper with auth check
export async function protectedRoute(
  request: NextRequest,
  handler: (request: NextRequest, userId: string) => Promise<Response>
): Promise<Response> {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    // Verify JWT (simplified - use proper JWT library in production)
    // const userId = verifyJWT(token);
    // For now, assume token contains user ID in payload
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    ) as { sub: string };

    if (!decoded.sub) {
      return errorResponse(401, 'Invalid token');
    }

    // Check rate limit
    if (!checkRateLimit(getRateLimitKey(request, decoded.sub), 100, 60000)) {
      return errorResponse(429, 'Too many requests');
    }

    return await handler(request, decoded.sub);
  } catch (error) {
    return errorResponse(401, 'Unauthorized');
  }
}
