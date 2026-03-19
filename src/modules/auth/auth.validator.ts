import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+91\d{10}$/, 'Invalid phone number').optional(),
  role: z.enum(['customer', 'vendor']).default('customer'),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const otpRequestSchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/, 'Invalid phone number'),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().regex(/^\+91\d{10}$/).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  image: z.string().url().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
