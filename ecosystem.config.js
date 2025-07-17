module.exports = {
  apps: [
    {
      name: 'saygoodbye-backend',
      script: './backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
        MONGODB_URI: process.env.MONGODB_URI,
        JWT_SECRET: process.env.JWT_SECRET
      },
      // Logging
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_type: 'json',
      merge_logs: true,
      
      // Process management
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Memory management
      max_memory_restart: '1G',
      
      // Health monitoring
      health_check_grace_period: 5000,
      
      // Environment-specific settings
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        MONGODB_URI: process.env.MONGODB_URI_STAGING
      }
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/saygoodbye.git',
      path: '/var/www/saygoodbye',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'npm install pm2 -g'
    },
    
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/saygoodbye.git',
      path: '/var/www/saygoodbye-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
