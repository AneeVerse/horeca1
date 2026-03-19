import Razorpay from 'razorpay';

const globalForRazorpay = globalThis as unknown as { razorpay: Razorpay };

export const razorpay =
  globalForRazorpay.razorpay ??
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

if (process.env.NODE_ENV !== 'production') globalForRazorpay.razorpay = razorpay;
