# Sandeep Portfolio

Modern multi-page portfolio rebuilt in Next.js and now driven by Supabase as the content source.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Add these values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_CONTACT_TABLE=contact_submissions
```

## Supabase Schema

Run these SQL files in the Supabase SQL editor, in this order:

1. [supabase/portfolio_schema.sql](/Users/macbook/Documents/Projects/trialone/supabase/portfolio_schema.sql)
2. [supabase/portfolio_seed.sql](/Users/macbook/Documents/Projects/trialone/supabase/portfolio_seed.sql)

This creates tables for:

- site profile
- navigation
- homepage stats
- collaboration cards
- skill groups and items
- featured skills
- experiences and highlights
- projects and stacks
- blog posts
- terminal commands
- contact submissions

## Dynamic Site Notes

- Layout, homepage, skills, experience, projects, blog, contact, and terminal pages now read from Supabase on the server.
- Resume data is also loaded from Supabase through `/api/portfolio`.
- Contact form submissions go through `/api/contact` and write to Supabase using the server role key, so the secret is not exposed in the browser.

## Important Security Note

Your current service role key should stay only in local or deployment environment variables and should never be committed publicly. If this repo will be published, rotate that key after testing.
