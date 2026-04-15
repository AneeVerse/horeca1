// PM2 ecosystem file for production deployment on the DO droplet.
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'horeca1-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      instances: 'max',
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1G',
    },
    {
      name: 'horeca1-notification-worker',
      script: 'npx',
      args: 'tsx src/workers/notification.worker.ts',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '512M',
      autorestart: true,
    },
  ],
};
