# DuoBull

> Competitive gaming community platform for players, teams, tournaments, loyalty rewards, and digital prize management.

**Live site:** [duobull.com](https://duobull.com)

## Overview

DuoBull brings together competitive players and team captains in a single platform. Players can discover teammates, join tournaments, complete daily missions, earn Bull Points, and spend rewards in the digital store.

## Highlights

- Email authentication, account verification, MFA, and recovery-code support
- Player profiles, team discovery, team creation, and role-based roster management
- Tournament publishing, applications, brackets, and participation workflows
- Daily missions, loyalty XP, levels, subscriptions, Bull Points, and reward store
- Community posts, private/team conversations, support requests, and referrals
- Admin workflows for moderation, orders, content, stock, and platform configuration
- Responsive React interface with Turkish localization

## Tech stack

- React 19, Vite, React Router, Tailwind CSS
- Supabase Auth, PostgreSQL, Storage, Realtime, and Row Level Security
- Lucide React icons, image cropping, Playwright E2E test setup

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set these browser-safe values in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never place `service_role`, SMTP, payment, or any other private key in a `VITE_` variable.

## Production build

```bash
npm run build
npm run preview
```

Vite writes deployable output to `dist/`. Source changes belong in `src/`, `public/`, and `supabase/`.

## Project structure

```text
src/        React pages, components, contexts, services, and styling
public/     Static brand, icon, product, and background assets
supabase/   Schema, migrations, RLS policies, and Edge Functions
docs/       Editing and project documentation
tests/      Playwright end-to-end tests
```

## Demo access

For security, administrator credentials are not published in this repository. A restricted demo account can be provided to portfolio reviewers on request. Public demo access never includes administrative privileges.

## Security

Environment files, deployment output, local database backups, test artifacts, private keys, and logs are excluded through `.gitignore`. Privileged operations are protected by Supabase RLS and database functions rather than UI-only checks.

For a detailed codebase map, see [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md).
