module.exports = {
  production: {
    // Server Details
    host: '44.200.209.160',
    hostname: 'ec2-44-200-209-160.compute-1.amazonaws.com',
    user: 'ec2-user',
    
    // SSH Configuration
    sshKey: '/Users/ssoward/.ssh/saygoodbye.pem',
    sshCommand: 'ssh -i "saygoodbye.pem" ec2-user@ec2-44-200-209-160.compute-1.amazonaws.com',
    
    // AWS Configuration
    awsCredentials: '/Users/ssoward/.aws/credentials',
    region: 'us-east-1', // Based on compute-1.amazonaws.com
    
    // Deployment Paths
    deployPath: '/home/ec2-user/saygoodbye',
    backupPath: '/home/ec2-user/backups',
    
    // Application Configuration
    pm2: {
      name: 'saygoodbye-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    
    // Database
    mongodb: {
      url: process.env.MONGODB_URI || 'mongodb://localhost:27017/saygoodbye_prod'
    },
    
    // SSL/HTTPS
    ssl: {
      enabled: true,
      certPath: '/etc/letsencrypt/live/yourdomain.com',
      nginxConfig: '/etc/nginx/sites-available/saygoodbye'
    },
    
    // Environment Variables (to be set on server)
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      JWT_SECRET: 'your-production-jwt-secret',
      MONGODB_URI: 'your-production-mongodb-uri',
      GOOGLE_CLOUD_PROJECT_ID: 'your-project-id',
      GOOGLE_CLOUD_KEY_FILE: '/path/to/service-account-key.json',
      STRIPE_SECRET_KEY: 'your-stripe-secret-key',
      REDIS_URL: 'redis://localhost:6379'
    }
  }
};
