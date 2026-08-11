KOI 💗 — FOUNDATION 2.0

This is the next production-minded Koi build.

WHAT CHANGED
- Added Supabase-ready production folder structure.
- Added real account authentication UI.
- Added Create Pair / Join Pair with one-time invite code.
- Added multi-tenant pair_id architecture and Row Level Security migration.
- Added private Storage policies for future media.
- Added scalable private Realtime Broadcast architecture.
- Migrated Little Things as the FIRST real cloud-synced feature.
- Added an offline sync queue for Little Things.
- Kept the remaining Koi features working locally for now.
- Included the latest borderless Koi icon set.

IMPORTANT
The app will continue to work in local mode until you fill in:
config/supabase-config.js

DO NOT PUT A SECRET KEY IN THAT FILE.
Use only the Supabase Project URL and browser-safe publishable key.

START HERE
docs/SUPABASE_SETUP.txt

DATABASE FILE
supabase/migrations/202608110001_koi_foundation_v1.sql

THIS IS INTENTIONAL
We are NOT migrating all fourteen features in one shot.
First prove two-account security and syncing on Little Things, then migrate
the rest feature-by-feature without destabilizing Koi.
