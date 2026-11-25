# NXTHUB

A premium, responsive developer platform starter built with React, Vite, and Supabase.

## Features in this first build

- Email/password sign-up and sign-in with Supabase Auth
- User profile creation and session handling
- Public repository discovery
- Create public and private repositories
- Star and unstar public repositories
- Search repositories by name, description, and language
- Responsive dark interface

## Local development

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Add your Supabase project URL and publishable key.
4. Run `npm install`.
5. Run `npm run dev`.

## Vercel environment variables

Add these for Production, Preview, and Development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never put a Supabase service-role or secret key in browser code.

## Backend

This app uses the existing NXTHUB Supabase tables in the `public` schema:
`nxthub_profiles`, `nxthub_repositories`, `nxthub_files`, `nxthub_stars`, `nxthub_issues`, and `nxthub_issue_comments`.

The file browser, issue workflow, and collaboration tools are planned for subsequent iterations.
