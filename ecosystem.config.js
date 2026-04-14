// PM2 config for server deployment
module.exports = {
  apps: [{
    name: 'afy-fashion-billing',
    script: 'node',
    args: 'server.js',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'file:./prisma/afy_fashion.db'
    }
  }]
}
