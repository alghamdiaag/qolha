# Hostinger VPS Deployment Guide

This guide deploys the current "قلها" web prototype on a Hostinger VPS with:

- Node.js + Express on port `3000`
- PM2 process manager
- Nginx reverse proxy
- Custom domain
- HTTPS with Certbot

## 1. VPS Prerequisites

SSH into your VPS:

```bash
ssh root@YOUR_VPS_IP
```

Update the server:

```bash
apt update && apt upgrade -y
```

Install Node.js, npm, git, Nginx, and Certbot:

```bash
apt install -y nodejs npm git nginx certbot python3-certbot-nginx
```

Recommended: install a recent Node.js LTS if the default VPS version is old:

```bash
node -v
npm -v
```

Install PM2 globally:

```bash
npm install -g pm2
```

## 2. Upload Or Clone The Project

Choose a deployment directory:

```bash
mkdir -p /var/www
cd /var/www
```

Clone your repository:

```bash
git clone YOUR_GITHUB_REPO_URL qolha
cd /var/www/qolha
```

If you are uploading manually instead of using Git, upload the project folder to:

```text
/var/www/qolha
```

Do not upload `server/.env` to GitHub. Create it directly on the VPS.

## 3. Install Server Dependencies

```bash
cd /var/www/qolha/server
npm ci
```

If `npm ci` fails because there is no matching lockfile, use:

```bash
npm install
```

## 4. Environment Variables

Create the production environment file:

```bash
cd /var/www/qolha/server
cp .env.production.example .env
nano .env
```

Put your real values inside:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
REQUEST_BODY_LIMIT=256kb
CORS_ORIGIN=https://YOUR_DOMAIN.com

OPENAI_API_KEY=your_openai_key_if_used
OPENAI_MODEL=gpt-4.1-mini
OPENAI_FAST_MODEL=gpt-4.1-mini

ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-sonnet-4-5

GEMINI_API_KEY=your_gemini_key_if_used
GEMINI_MODEL=gemini-2.5-flash

LLM_PROVIDER=anthropic
```

Where to put environment variables:

```text
/var/www/qolha/server/.env
```

API keys must stay only in:

```text
server/.env
```

Never put API keys in frontend files, README, GitHub, Nginx config, or browser-visible code.

## 5. Test Locally On The VPS

```bash
cd /var/www/qolha/server
npm start
```

In another SSH session:

```bash
curl http://127.0.0.1:3000/health
```

Expected:

```json
{"status":"ok","provider":"anthropic"}
```

Stop the manual server with `Ctrl+C`.

## 6. Start With PM2

```bash
cd /var/www/qolha/server
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

PM2 will print a command. Copy and run that command, then run:

```bash
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs qolha
pm2 restart qolha
pm2 stop qolha
```

## 7. Point Your Domain To The VPS

In Hostinger DNS settings for your domain:

Create or update this record:

```text
Type: A
Name: @
Value: YOUR_VPS_IP
TTL: default
```

Optional `www` record:

```text
Type: CNAME
Name: www
Value: YOUR_DOMAIN.com
TTL: default
```

Where to put the domain:

- DNS: Hostinger domain DNS panel
- Nginx: `server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;`
- `.env`: `CORS_ORIGIN=https://YOUR_DOMAIN.com`

## 8. Configure Nginx Reverse Proxy

Create an Nginx site:

```bash
nano /etc/nginx/sites-available/qolha
```

Paste this, replacing `YOUR_DOMAIN.com`:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

    client_max_body_size 256k;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/qolha /etc/nginx/sites-enabled/qolha
nginx -t
systemctl reload nginx
```

## 9. Enable HTTPS

After DNS points to your VPS:

```bash
certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
```

Follow the prompts and choose redirect HTTP to HTTPS.

Test renewal:

```bash
certbot renew --dry-run
```

## 10. Verify Public Deployment

Open:

```text
https://YOUR_DOMAIN.com
```

Check health:

```bash
curl https://YOUR_DOMAIN.com/health
```

Test API:

```bash
curl -X POST https://YOUR_DOMAIN.com/api/process \
  -H "Content-Type: application/json" \
  -d '{"transcript":"اكتب لي رد واتساب محترم على شخص تأخر علي في الدفع"}'
```

## 11. Updating The App Later

```bash
cd /var/www/qolha
git pull
cd server
npm ci
pm2 restart qolha
```

If you change `.env`:

```bash
pm2 restart qolha --update-env
```

## 12. Security Notes

- Keep API keys only in `/var/www/qolha/server/.env`.
- Do not commit `.env`.
- Express uses Helmet security headers.
- Request body size is limited by Express and Nginx.
- Nginx proxies public traffic to local port `3000`.
- Internal orchestration logs stay in server logs and are not exposed to the frontend.
