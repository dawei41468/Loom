# Loom Production Deployment Steps

After running `./deploy-backend.sh` and `./deploy-frontend.sh`, follow these steps to complete the deployment:

## 1. Configure Nginx

**Current Status**: Nginx configuration has been moved to `/etc/nginx/conf.d/loom.conf` and is working correctly on the server.

If you need to redeploy the nginx configuration:

```bash
# On your local machine
scp -i ~/.ssh/id_rsa loom-nginx.conf root@111.230.109.143:/tmp/loom.conf

# Then on the server, move it to the correct location:
ssh -i ~/.ssh/id_rsa root@111.230.109.143 "sudo mv /tmp/loom.conf /etc/nginx/conf.d/loom.conf"

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

**Note**: Nginx automatically loads all `.conf` files in `/etc/nginx/conf.d/` directory. No manual symlinks or sites-enabled configuration is needed.

## 2. Set Up SSL Certificate

First, make sure the domain `loom.cna-los.life` is properly pointing to your server's IP address and that port 80 is accessible from the internet.

```bash
# Obtain SSL certificate with Let's Encrypt using standalone mode (bypasses nginx issues)
sudo certbot certonly --standalone -d loom.cna-los.life --non-interactive --agree-tos --email your-email@example.com

# Then manually configure nginx to use the SSL certificate
# Edit the nginx config to include the SSL certificate paths
# The loom-nginx.conf file already includes these lines:
# ssl_certificate /etc/letsencrypt/live/loom.cna-los.life/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/loom.cna-los.life/privkey.pem;

# After obtaining the certificate, restart nginx
sudo systemctl restart nginx

**Note**: Since LOSMAX is already running on this server, you need to temporarily stop nginx to free up port 80 for the standalone certificate acquisition:
1. Temporarily stop nginx: `sudo systemctl stop nginx`
2. Run certbot: `sudo certbot certonly --standalone -d loom.cna-los.life --non-interactive --agree-tos --email dtwrain@gmail.com`
3. Start nginx again: `sudo systemctl start nginx`

**Alternative DNS validation**: If stopping nginx is not feasible, you can use DNS validation instead:
```bash
sudo certbot certonly --manual --preferred-challenges dns -d loom.cna-los.life --non-interactive --agree-tos --email dtwrain@gmail.com
```
This will provide DNS TXT records you need to add to your domain's DNS configuration.

**Important**: The error shows that Tencent Cloud is intercepting HTTP requests and returning a web blocking page instead of the Let's Encrypt validation response. This affects both HTTP methods (nginx and standalone). The only reliable solution is to use DNS validation:

```bash
# Run interactively (remove --non-interactive flag)
sudo certbot certonly --manual --preferred-challenges dns -d loom.cna-los.life --agree-tos --email dtwrain@gmail.com

# Or use certbot-dns plugins if available (e.g., for Cloudflare, DigitalOcean, etc.)
# First install the appropriate DNS plugin, then use:
# sudo certbot certonly --dns-cloudflare -d loom.cna-los.life --non-interactive --agree-tos --email dtwrain@gmail.com

# If using Tencent Cloud DNS, you may need to manually add the TXT record through their console
```

Follow the interactive prompts to add the DNS TXT record to your domain's DNS configuration. This method bypasses HTTP entirely and is not affected by Tencent Cloud's web blocking.

**Note**: Manual certificates require manual renewal. You'll need to repeat this process before the certificate expires (typically every 90 days) or set up automated renewal with authentication hooks.
```

## 3. Set Up Auto-Renewal for SSL

```bash
# Edit crontab for root
sudo crontab -e

# Add this line to run renewal daily at noon:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 4. Verify Deployment

- Backend should be running on port 8001 via PM2
- Frontend should be served from `/usr/share/nginx/html/loom` (consistent with LOSMAX structure)
- Check PM2 status: `pm2 status`
- Check nginx status: `sudo systemctl status nginx`
- Access the app at: https://loom.cna-los.life

## 5. Troubleshooting

### Common Issues:
- **DNS Blocking**: If external connections fail with "connection reset", this may be DNS-level blocking by Tencent Cloud. The main domain `cna-los.life` works, but subdomains may require ICP licensing.
- **Nginx Configuration**: Ensure loom.conf is in `/etc/nginx/conf.d/` (not sites-enabled)
- **SSL Certificates**: Verify certificates are valid for the correct domain

### Log Checking:
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log` or `sudo tail -n 100 /var/log/nginx/error.log`
- Check PM2 logs: `pm2 logs loom-backend` or `pm2 logs loom-backend --lines 100`
- Check nginx access logs: `sudo tail -f /var/log/nginx/access.log`

### Service Management:
- Restart services if needed:
  - `sudo systemctl restart nginx`
  - `pm2 restart loom-backend`
  - `pm2 restart loom-frontend` (if frontend was deployed with PM2)

## 6. Database

MongoDB is already configured to use the same instance as LOSMAX at `mongodb://127.0.0.1:27017` with database `loom`.

**Important**: Make sure MongoDB authentication is properly configured in the backend `.env` file:
```
MONGODB_URI=mongodb://username:password@127.0.0.1:27017/loom?authSource=admin
```

## 7. Port Configuration

Loom backend runs on port 8001 to avoid conflict with LOSMAX (which uses 8000).
- Backend: Port 8001
- API proxy: nginx proxies /api/ to localhost:8001
- WebSocket: nginx proxies /ws/ to localhost:8001/ws/

## 8. Redis Configuration

Redis is used for WebSocket connections and background tasks. Make sure Redis is running and configured in the backend `.env`:
```
REDIS_URL=redis://localhost:6379
```

## Notes

- The backend runs with PM2 process name `loom-backend`
- Frontend is built with Vite and served statically by nginx
- WebSocket support is configured for `/ws/` paths
- CORS is configured for `https://loom.cna-los.life`
- Environment variables must be properly set in the backend `.env` file for database and Redis connections
- Check PM2 logs for any authentication or connection issues with MongoDB/Redis