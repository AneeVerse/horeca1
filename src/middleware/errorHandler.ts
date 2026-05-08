import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Standard API error class
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Standard error response format
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function errorResponse(error: unknown): NextResponse<ErrorResponse> {
  // Zod validation error — surface the FIRST failing field so the user knows what to fix
  // instead of a generic "Invalid input". Full per-field details still in details.fields.
  if (error instanceof ZodError) {
    const flat = error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const firstField = Object.entries(flat).find(([, msgs]) => Array.isArray(msgs) && msgs.length > 0);
    const message = firstField
      ? `${firstField[0]}: ${firstField[1]?.[0] ?? 'invalid'}`
      : 'Invalid input';
    return NextResponse.json(
      {
        success: false as const,
        error: {
          code: 'VALIDATION_ERROR',
          message,
          details: { fields: flat },
        },
      },
      { status: 400 }
    );
  }

  // Known API error
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false as const,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // Unknown error
  console.error('[API Error]', error);
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
      },
    },
    { status: 500 }
  );
}

// Common error factories
export const Errors = {
  unauthorized: (message = 'Authentication required') =>
    new ApiError('UNAUTHORIZED', message, 401),

  forbidden: (message = "You don't have permission for this action") =>
    new ApiError('FORBIDDEN', message, 403),

  notFound: (resource: string) =>
    new ApiError('NOT_FOUND', `${resource} not found`, 404),

  duplicate: (field: string) =>
    new ApiError('DUPLICATE', `${field} already exists`, 409),

  belowMOV: (vendorName: string, mov: number, current: number) =>
    new ApiError('BELOW_MOV', `Minimum order value is ₹${mov} for ${vendorName}`, 400, {
      min_order_value: mov,
      current_total: current,
    }),

  outOfStock: (productName: string, available: number) =>
    new ApiError('OUT_OF_STOCK', `${productName} has only ${available} units available`, 400, {
      available,
    }),

  insufficientCredit: (available: number, required: number) =>
    new ApiError('INSUFFICIENT_CREDIT', `Available credit ₹${available}, required ₹${required}`, 400, {
      available,
      required,
    }),

  conflict: (message: string) =>
    new ApiError('CONFLICT', message, 409),

  badRequest: (message: string) =>
    new ApiError('BAD_REQUEST', message, 400),
};
