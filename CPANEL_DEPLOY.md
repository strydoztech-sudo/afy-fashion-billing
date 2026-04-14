# AFY Fashion Billing — cPanel Deployment Guide
## Developed by www.strydoz.in

---

## ⚠️ IMPORTANT: cPanel Limitation

Next.js (Node.js app) requires **Node.js hosting** — not standard PHP/cPanel hosting.
Standard cPanel shared hosting does NOT support Next.js directly.

## ✅ Option 1 — cPanel with Node.js Support (Recommended)

Providers that support this: **Hostinger Business, SiteGround, A2 Hosting, Namecheap EasyWP**

### Steps:

**1. Build the app locally:**
```bash
cd afy-fashion-billing-v2
npm install
npm run db:push
npm run db:seed
npm run build
```

**2. Zip for upload:**
```bash
# Upload these folders/files to cPanel:
# .next/
# public/
# prisma/
# node_modules/  (or run npm install on server)
# package.json
# next.config.js
# .env
```

**3. In cPanel → Node.js App:**
- Create a new Node.js app
- Set Node.js version: 18 or 20
- Application root: `/public_html/billing` (or your folder)
- Application URL: `yourdomain.com/billing`
- Application startup file: `node_modules/.bin/next`
- Click "Run NPM Install"

**4. Start command in cPanel:**
```
node_modules/.bin/next start -p 3000
```

**5. Set Environment Variables in cPanel:**
```
DATABASE_URL=file:./prisma/afy_fashion.db
NODE_ENV=production
```

---

## ✅ Option 2 — VPS / Cloud (Best for Production)

Use **DigitalOcean, Hostinger VPS, AWS EC2, or Google Cloud**

### Steps:

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 (keeps app running)
npm install -g pm2

# 4. Upload project (use FileZilla or SCP)
scp -r afy-fashion-billing-v2/ root@your-server:/var/www/billing

# 5. Setup
cd /var/www/billing
npm install
npm run db:push
npm run db:seed
npm run build

# 6. Start with PM2
pm2 start npm --name "afy-billing" -- start
pm2 save
pm2 startup

# 7. Nginx config (reverse proxy)
# /etc/nginx/sites-available/billing
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ Option 3 — Run on Local PC (LAN Access)

Run on your shop computer, access from any device on same WiFi:

```bash
# 1. Run with network access
npm run build
npm start -- --hostname 0.0.0.0 -p 3000

# 2. Find your PC IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# 3. Access from any phone/tablet on same WiFi:
http://192.168.1.XXX:3000
```

---

## ✅ Option 4 — Vercel (Free, Easiest — but no SQLite)

For Vercel, you need to switch from SQLite to PostgreSQL (free on Neon.tech):

**1. Create free database at neon.tech**
**2. Change .env:**
```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```
**3. Change prisma/schema.prisma provider:**
```
provider = "postgresql"
```
**4. Deploy:**
```bash
npm install -g vercel
vercel
```

---

## 🔐 Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| admin    | admin123 | Admin |
| cashier  | cash123  | Cashier |

**Change passwords after first login via Prisma Studio:**
```bash
npm run db:studio
# Opens at http://localhost:5555
```

---

## 📞 Support: www.strydoz.in
