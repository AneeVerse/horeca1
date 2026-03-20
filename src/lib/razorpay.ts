import Razorpay from 'razorpay';

const globalForRazorpay = globalThis as unknown as { razorpay: Razorpay };

// Lazy getter — only creates client when payment code actually runs
// Without this, missing RAZORPAY_KEY_ID/SECRET would crash the app at startup
export function getRazorpay(): Razorpay {
  if (!globalForRazorpay.razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment');
    }
    globalForRazorpay.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return globalForRazorpay.razorpay;
}
