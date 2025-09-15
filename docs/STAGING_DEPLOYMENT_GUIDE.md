# Staging Deployment Guide for Push Notifications Feature

This guide provides step-by-step instructions for deploying the push notifications feature to a staging environment without affecting your production setup.

## Prerequisites

1. Ensure you have the following files created:
   - `nginx/staging.studiodtw.net`
   - `deploy-backend-staging.sh`
   - `deploy-frontend-staging.sh`
   - `ecosystem-staging.config.js`

2. Verify your DNS settings have an A record for `staging.studiodtw.net` pointing to your server IP.

## Deployment Steps

### 1. Configure Environment Files

Create staging-specific environment files:

```bash
# Create backend staging environment file
cp backend/.env.example backend/.env.staging
# Edit backend/.env.staging with staging-specific values (database, VAPID keys, etc.)

# Create frontend staging environment file
cp .env.example .env.staging
# Edit .env.staging with staging-specific values
```

### 2. Update Configuration Files

Ensure the staging environment files contain the correct values:
- Different database connection (recommended)
- Separate VAPID keys for staging
- Different ports where applicable

### 3. Deploy Nginx Configuration

Copy the nginx configuration to your server and enable it:

```bash
# Copy the nginx config to your server
scp -i ~/.ssh/id_ed25519_tencentHK nginx/staging.studiodtw.net ubuntu@124.156.174.180:/etc/nginx/sites-available/

# SSH into your server
ssh -i ~/.ssh/id_ed25519_tencentHK ubuntu@124.156.174.180

# Enable the site
sudo ln -s /etc/nginx/sites-available/staging.studiodtw.net /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload nginx
```

### 4. Deploy Backend to Staging

Run the backend staging deployment script:

```bash
chmod +x deploy-backend-staging.sh
./deploy-backend-staging.sh
```

### 5. Deploy Frontend to Staging

Run the frontend staging deployment script:

```bash
chmod +x deploy-frontend-staging.sh
./deploy-frontend-staging.sh
```

## Testing the Staging Environment

1. Access your staging environment at: https://staging.studiodtw.net
2. Test the push notification functionality:
   - Enable notifications in the settings
   - Trigger events that should generate notifications
   - Verify notifications are received

## Promoting to Production

Once testing is complete and successful:

1. Merge your feature branch to main
2. Deploy to production using your existing deployment scripts
3. Update production environment files with the new VAPID keys
4. Test in production environment

## Troubleshooting

- If nginx fails to reload, check the configuration syntax with `nginx -t`
- If deployment fails, check the console output for specific error messages
- Ensure all environment variables are correctly set for staging
- Verify that the staging backend is running on port 4200 with `pm2 list`