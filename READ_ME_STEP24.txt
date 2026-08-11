KOI 💗 — STEP 24: KOI WORLD

COPY THIS UPDATE INTO YOUR EXISTING KOI REPOSITORY.
Choose Replace/Merge when Windows asks.

IMPORTANT
- KEEP your existing migration files 001, 002, 003, and 004.
- ADD 202608110005_koi_world_features.sql beside them.
- Do NOT delete config/supabase-config.js or replace your Supabase credentials.

FILES IN THIS UPDATE
index.html
style.css
service-worker.js
services/cloud-bootstrap.js
services/world.js                  [NEW]
features/koi-world.js              [NEW]
supabase/migrations/202608110005_koi_world_features.sql [NEW]

NEW KOI WORLD FEATURES
CONNECT
- Thinking of You
- Mood Bubble
- Daily Photo
- One-Line Today
- Love Notes
- Compliment Jar
- Open When...
- Things I Love About You
- Reasons I Chose You

PLAY
- This or That
- Who's More Likely To
- Who Knows Who Better?
- Couple Bingo
- Draw for Me
- Existing I Bet You / Blind Date remain available

OUR STORY
- Relationship Timeline
- Our Firsts
- Time Capsules
- Future Us
- On This Day
- Monthly Koi Recap
- Relationship Wrapped
- Memory Map board
- Photo Collections
- Photo of Us
- Existing Lore / Eras / Traditions / Then vs Now remain available

TOGETHER
- Shared Bucket List
- Places We Want To Go
- Watch Together
- Eat Together
- Gift Hints
- Trip Together
- Existing Date Jar remains available

KNOW ME
- My Manual
- Favorites
- Current Obsessions

AWAY & FUTURE
- Next Time We See Each Other
- Our Time Zones
- Secret Memory
- Private Draft
- Surprise Mode

OUR WORLD
- Existing Our Room + Koi Hearts/activity
- Existing Our Museum
- Seasonal Koi status

SYNC / PRIVACY
- Koi World items are pair-scoped in Supabase.
- Private Draft stays visible only to its creator.
- Time Capsule / Secret Memory / Surprise payloads are redacted from the partner until reveal time.
- Reveal-together game answers are redacted until both partners answer.
- Realtime events send only safe refresh metadata; private payloads are re-fetched through the redacting RPC.
- Daily Photo and Draw for Me use the existing private Memories/Storage system.

DEPLOY
1. Copy these files/folders into the main Koi repository.
2. Confirm migration 005 is inside supabase/migrations/ beside 001-004.
3. GitHub Desktop: commit all changes.
   Suggested summary: Add Koi World features
4. Push origin.
5. Let the existing Supabase GitHub integration apply migration 005.
6. After GitHub Pages deploys, fully close and reopen Koi on both phones.

FIRST TEST
- Open Extras. It should now be grouped into Connect, Play, Our Story, Together,
  Know Me, Away & Future, and Our World.
- Try Thinking of You from one phone and verify the other phone refreshes.
- Try a shared Bucket List item from each phone.
- Try This or That from both phones and verify answers stay hidden until both answer.
