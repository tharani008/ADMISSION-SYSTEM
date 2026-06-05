// PM2 Ecosystem Config - runs on VPS
// Usage: pm2 start ecosystem.config.cjs
// Or:   pm2 restart all

module.exports = {
    apps: [
        {
            name: 'lasak-api',
            script: './server/server.js',
            cwd: '/var/www/lasak',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
            // PM2 will read .env from the server/ folder automatically
            // because dotenv.config() is called in server.js
            error_file: '/var/log/pm2/lasak-api-error.log',
            out_file: '/var/log/pm2/lasak-api-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
