# AFY Fashion Billing — cPanel Upload Guide
# Developed by www.strydoz.in

=====================================================
STEP 1 — BUILD ON YOUR PC FIRST
=====================================================

Open terminal/command prompt in your project folder:

    cd afy-fashion-billing-v2
    npm install
    npm run db:push
    npm run db:seed
    npm run build

Wait for build to finish. You will see:
✓ Compiled successfully

=====================================================
STEP 2 — WHICH FILES TO UPLOAD
=====================================================

After build, upload ONLY these files/folders to cPanel:

    .next/standalone/          ← Main app (IMPORTANT)
    .next/static/              ← CSS, JS files
    public/                    ← Images, icons
    prisma/schema.prisma       ← Database schema
    .env                       ← Environment config
    package.json               ← Package info

DO NOT UPLOAD:
    node_modules/    ← Too large, not needed
    .next/cache/     ← Not needed
    src/             ← Source only

=====================================================
STEP 3 — CREATE .env FILE FOR PRODUCTION
=====================================================

Create a file called .env with this content:

    DATABASE_URL=file:./prisma/afy_fashion.db
    NODE_ENV=production
    PORT=3000

=====================================================
STEP 4A — UPLOAD VIA cPANEL FILE MANAGER
=====================================================

1. Login to cPanel → File Manager
2. Go to public_html folder
3. Create new folder: billing
4. Upload as ZIP then extract:

   a. On your PC, zip the files:
      Right-click → Send to → Compressed folder
      OR run: zip -r upload.zip .next/standalone .next/static public prisma .env

   b. In File Manager → Upload → upload.zip
   c. Right-click upload.zip → Extract
   d. Move files to public_html/billing/

=====================================================
STEP 4B — UPLOAD VIA FTP (FileZilla) EASIER!
=====================================================

1. Download FileZilla: https://filezilla-project.org
2. Open FileZilla
3. Enter your cPanel FTP details:
   Host:     ftp.yourdomain.com
   Username: your_cpanel_username
   Password: your_cpanel_password
   Port:     21

4. On LEFT side (your PC), navigate to:
   afy-fashion-billing-v2/.next/standalone

5. On RIGHT side (server), go to:
   public_html/billing/

6. Drag and drop ALL files from standalone/ to billing/

7. Also upload:
   - .next/static/  → public_html/billing/.next/static/
   - public/        → public_html/billing/public/
   - .env           → public_html/billing/.env
   - prisma/        → public_html/billing/prisma/

=====================================================
STEP 5 — SETUP NODE.JS IN cPANEL
=====================================================

1. In cPanel → look for "Node.js" or "Setup Node.js App"
   (Available in: Hostinger, A2 Hosting, SiteGround, Namecheap)

2. Click "Create Application"

3. Fill in:
   Node.js version:    18 (or 20)
   Application mode:   Production
   Application root:   public_html/billing
   Application URL:    yourdomain.com/billing
   Application startup file: server.js

4. Click CREATE

5. In the app settings, click "Run NPM Install"
   (This installs packages on the server)

6. Set Environment Variables:
   Click "Environment Variables" → Add:
   DATABASE_URL = file:./prisma/afy_fashion.db
   NODE_ENV     = production

7. Click START / RESTART

=====================================================
STEP 6 — SETUP DATABASE ON SERVER
=====================================================

In cPanel → Terminal (or SSH):

    cd public_html/billing
    node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.\$connect().then(()=>console.log('DB OK')).catch(e=>console.log(e))"

If error, run:
    npx prisma db push
    npx prisma db seed

=====================================================
STEP 7 — ACCESS YOUR APP
=====================================================

Open browser:
    https://yourdomain.com/billing

Login with:
    Username: admin
    Password: admin123

Change password after first login!

=====================================================
TROUBLESHOOTING
=====================================================

Problem: "Module not found" error
Fix: In cPanel Terminal → cd public_html/billing → npm install

Problem: Database error
Fix: npx prisma db push

Problem: App not starting
Fix: Check Node.js version is 18+
     Check server.js file exists in billing folder

Problem: 502 Bad Gateway
Fix: Restart the Node.js app in cPanel

Problem: cPanel doesn't have Node.js option
Solution: Your hosting doesn't support Node.js
Use these alternatives:

  OPTION A — Hostinger Business Plan (₹200/month)
  → Has Node.js support built-in
  → Best for this app

  OPTION B — VPS Hosting (₹300-500/month)
  → Full control, install anything
  → DigitalOcean, AWS, or Hostinger VPS

  OPTION C — Run on Local PC only
  → No hosting needed
  → All staff access via WiFi
  → npm start -- --hostname 0.0.0.0 -p 3000
  → Access: http://YOUR-PC-IP:3000

=====================================================
OPTION C DETAILED — LOCAL NETWORK (EASIEST!)
=====================================================

If you want to use it on your shop network only:

1. Keep app running on ONE computer (shop PC/server)

2. Find your PC IP address:
   Windows: Open CMD → type ipconfig
   Look for "IPv4 Address" e.g. 192.168.1.5

3. Start app for network access:
   npm run build
   npm start

   OR for permanent background running:
   npm install -g pm2
   pm2 start npm --name "afy" -- start
   pm2 save

4. Access from ANY device on same WiFi:
   Open browser → http://192.168.1.5:3000

5. Works on:
   ✓ Any phone on same WiFi
   ✓ Tablets
   ✓ Other computers
   ✓ Billing counter PC

=====================================================
CONTACT FOR DEPLOYMENT HELP
=====================================================

Developer: www.strydoz.in
For deployment assistance, contact the developer.

