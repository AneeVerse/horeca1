import ImageKit from '@imagekit/nodejs';

const globalForImageKit = globalThis as unknown as { imagekit: ImageKit };

// Lazy getter — only creates client when image upload code actually runs
// @imagekit/nodejs v7+ only needs privateKey for server-side operations
// (publicKey is only used client-side for upload authentication)
export function getImageKit(): ImageKit {
  if (!globalForImageKit.imagekit) {
    if (!process.env.IMAGEKIT_PRIVATE_KEY) {
      throw new Error('IMAGEKIT_PRIVATE_KEY must be set in environment');
    }
    globalForImageKit.imagekit = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    });
  }
  return globalForImageKit.imagekit;
}
