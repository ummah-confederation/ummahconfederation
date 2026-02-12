# Supabase Migration Setup Guide

This guide walks you through setting up Supabase and migrating your data.

## Prerequisites

- A [Supabase account](https://supabase.com) (free tier works)
- Node.js installed
- This codebase

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `ummah-confederation` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait (~2 minutes)

## Step 2: Get API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (under "Configuration")
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" - click "Reveal")

## Step 3: Create Environment File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual values:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Step 4: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste and click **Run**
5. You should see "Success. No rows returned" - this is expected

## Step 5: Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click "New bucket"
3. Fill in:
   - **Name**: `ummah-images`
   - **Public bucket**: ✅ Enable
4. Click "Create bucket"

## Step 6: Configure Storage Policies

1. Go to **Storage** → `ummah-images` bucket
2. Click "Policies" tab
3. Click "New Policy" → "For full customization"
4. Create two policies:

   **Policy 1: Public Read**
   - Policy name: `Public read access`
   - Allowed operations: `SELECT`
   - Target roles: `anon`, `authenticated`
   - Using expression: `true`
   
   **Policy 2: Service Role Write**
   - Policy name: `Service role write access`
   - Allowed operations: `ALL`
   - Target roles: `service_role`
   - Using expression: `true`

## Step 7: Install Dependencies

```bash
npm install
```

This will install `@supabase/supabase-js` and other dependencies.

## Step 8: Run Migration Script

```bash
npm run migrate:supabase
```

This script will:
- Upload all images to Supabase Storage
- Insert institutions, jurisdictions, documents into database
- Extract document HTML content from your files

**Expected output:**
```
🚀 Starting migration to Supabase...

📋 Migrating institutions...
  ✓ Uploaded avatar: ummah-cabinet.webp
  ✓ Uploaded cover: default-cover.webp
  ✓ Inserted: Ummah Cabinet
  ...

✅ Migration completed successfully!

📊 Summary:
   Institutions: 10
   Jurisdictions: 7
   Documents: 18
```

## Step 9: Update Frontend Configuration

### Option A: Environment Variables (Recommended for Vercel)

Add these environment variables in your Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Option B: Hardcoded (For quick testing)

Edit `js/supabase-config.js` and replace the default values:

```javascript
const DEFAULT_SUPABASE_URL = 'https://your-project-id.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'your-anon-key';
```

## Step 10: Build and Test

```bash
npm run build
```

Then open `document-viewer.html?doc=book0` in your browser to test.

## Step 11: Deploy to Vercel

1. Push your changes to Git
2. Vercel will auto-deploy
3. Add environment variables in Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Managing Data in Supabase

### Editing Institutions/Jurisdictions

1. Go to **Table Editor** in Supabase
2. Select `institutions` or `jurisdictions` table
3. Click any row to edit
4. Changes are reflected immediately on your site

### Editing Documents

1. Go to **Table Editor** → `documents`
2. Find your document by `doc_id`
3. Edit the `content` field (HTML)
4. Changes are reflected immediately

### Uploading New Images

1. Go to **Storage** → `ummah-images`
2. Upload files to appropriate folder:
   - `avatars/institutions/` for institution avatars
   - `avatars/jurisdictions/` for jurisdiction avatars
   - `covers/` for cover images
   - `carousels/` for carousel images
3. Copy the public URL and update in table

### Creating New Documents

1. Go to **Table Editor** → `documents`
2. Click "Insert" → "Insert row"
3. Fill in:
   - `doc_id`: Unique identifier (e.g., "book7")
   - `title`: Document title
   - `item_type`: "Book", "Policy", "Decision", etc.
   - `institution_id`: ID from institutions table
   - `jurisdiction_id`: ID from jurisdictions table
   - `content`: HTML content (inside paper-sheet div)
   - `visible`: true

## Troubleshooting

### "Failed to fetch" errors
- Check that your Supabase URL and anon key are correct
- Verify the project is not paused (free tier pauses after inactivity)

### Images not loading
- Check storage bucket is public
- Verify image URLs in tables are correct

### Migration script fails
- Ensure you have the service role key (not anon key)
- Check all JSON config files exist
- Verify storage bucket exists

## Security Notes

- **Never** commit `.env` to Git
- **Never** expose service role key in frontend code
- The anon key is safe for frontend use (read-only by default)
- All write operations require service role key
