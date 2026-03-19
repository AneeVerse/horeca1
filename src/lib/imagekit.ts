import ImageKit from '@imagekit/nodejs';

const globalForImageKit = globalThis as unknown as { imagekit: ImageKit };

export const imagekit =
  globalForImageKit.imagekit ??
  new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
  });

if (process.env.NODE_ENV !== 'production') globalForImageKit.imagekit = imagekit;
