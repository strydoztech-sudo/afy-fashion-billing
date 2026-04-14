# Deploy AFY Fashion Billing to Vercel + Neon PostgreSQL
# FREE hosting — Both Vercel and Neon have free tiers!
# Developed by www.strydoz.in

=====================================================
TOTAL TIME: ~15 minutes
COST: FREE (Vercel free + Neon free)
=====================================================

STEP 1 — Create FREE PostgreSQL database on Neon
=====================================================

1. Go to: https://neon.tech
2. Click "Sign Up" → Sign in with Google (easiest)
3. Click "New Project"
4. Project name: afy-fashion-billing
5. Region: Choose Asia Pacific (Singapore) for India
6. Click "Create Project"

7. You will see connection strings. Copy BOTH:
   - Connection string (pooled)  → This is your DATABASE_URL
   - Direct connection           → This is your DIRECT_URL

They look like:
postgresql://user:password@ep-cool-name-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

SAVE THESE — you need them in next steps!

STEP 2 — Upload code to GitHub
=====================================================

1. Go to: https://github.com
2. Sign up / Sign in (free)
3. Click "+" → "New Repository"
4. Name: afy-fashion-billing
5. Private repository (recommended)
6. Click "Create Repository"

7. On your PC, open Command Prompt in project folder:
   cd afy-fashion-billing-v2

8. Run these commands one by one:

   git init
   git add .
   git commit -m "AFY Fashion Billing - initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/afy-fashion-billing.git
   git push -u origin main

(Replace YOUR_USERNAME with your GitHub username)

STEP 3 — Deploy to Vercel
=====================================================

1. Go to: https://vercel.com
2. Sign up → "Continue with GitHub" (use same GitHub account)
3. Click "Add New Project"
4. Find your "afy-fashion-billing" repository → Click "Import"
5. Framework: Next.js (auto-detected)
6. DO NOT change build settings

7. Click "Environment Variables" → Add these:

   Name: DATABASE_URL
   Value: (paste your Neon pooled connection string)

   Name: DIRECT_URL  
   Value: (paste your Neon direct connection string)

8. Click "Deploy"
9. Wait ~3 minutes for build to finish

STEP 4 — Setup Database
=====================================================

After Vercel deployment:

1. Go to Vercel dashboard → Your project → Settings → Functions
2. OR open Vercel CLI:

   npm install -g vercel
   vercel login
   vercel env pull .env.local
   
3. Then run locally to seed database:
   npx prisma db push
   npx prisma db seed

OR use Neon SQL Editor:
1. Go to neon.tech → Your project → SQL Editor
2. The tables will be created automatically by Vercel build

STEP 5 — Seed data via Vercel
=====================================================

Create a temporary seed API route, or use Neon directly:

Option A - Via terminal with your .env:
   npm install
   npx prisma db push
   npx prisma db seed

Option B - Visit this URL after deploy:
   https://your-app.vercel.app/api/seed
   (See seed API route created below)

STEP 6 — Access Your App
=====================================================

Your app is live at:
   https://afy-fashion-billing.vercel.app
   (or your custom domain)

Default Login:
   Username: admin
   Password: admin123

   Username: cashier
   Password: cash123

Change passwords from Settings → Users after first login!

=====================================================
CUSTOM DOMAIN (Optional)
=====================================================

If you have a domain (e.g. billing.afyfashion.com):

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. In your domain registrar (GoDaddy, Namecheap etc):
   Add CNAME record: @ → cname.vercel-dns.com
4. Done! SSL certificate is automatic (free)

=====================================================
TROUBLESHOOTING
=====================================================

Error: "Environment variable not found: DATABASE_URL"
Fix: Add DATABASE_URL in Vercel → Settings → Environment Variables

Error: "Can't reach database server"
Fix: Check Neon connection string is correct
     Make sure you used POOLED connection for DATABASE_URL

Error: Build fails with Prisma error
Fix: Make sure vercel.json has:
     "buildCommand": "prisma generate && prisma db push && next build"

Error: "P1001: Can't reach database server"
Fix: In Neon dashboard → check project is not suspended
     Free tier suspends after 5 days of inactivity

=====================================================
NEON FREE TIER LIMITS
=====================================================

- Storage: 512 MB (enough for thousands of bills)
- Compute: 100 hours/month
- Auto-suspend after 5 minutes of inactivity
  (first request may take 2-3 seconds to wake up)
- For production: Upgrade to $19/month plan

VERCEL FREE TIER LIMITS
- 100 GB bandwidth/month
- Unlimited deployments
- Custom domain supported
- Perfect for this app!

=====================================================
Need help? Contact: www.strydoz.in
