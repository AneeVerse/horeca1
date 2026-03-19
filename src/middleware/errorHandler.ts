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
  // Zod validation error
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false as const,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { fields: error.flatten().fieldErrors },
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
};
