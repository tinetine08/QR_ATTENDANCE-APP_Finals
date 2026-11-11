# QR Attendance — Feature & UI Update

## Student workspace
- Personalized dashboard greeting using the signed-in profile.
- Live count of the student's saved attendance records.
- Upcoming school events loaded from Supabase.
- Quick access to QR scanning, attendance history, and profile.
- Manual dashboard refresh and clear empty/loading states.
- Profile screen now shows the correct Student, Teacher, or Admin role.
- Password-reset email action from the profile screen.

## Teacher workspace
- Teacher overview with total events and total attendance scans for their events.
- Recent events list with live attendee counts.
- Direct link to the teacher's attendance history.
- Event creation validates the event title, code, and start/end schedule.
- Event codes are inserted as new records; duplicate codes are rejected rather than overwriting an existing event.

## Admin workspace
- Role-protected admin dashboard.
- Live database totals for students, teachers, events, and attendance records.
- Quick links to event management, attendance management, reports, and user lists.
- Recently created events preview.
- Pull-to-refresh and explicit refresh action.

## Attendance validation improvement
- Legacy/static QR scans now require an existing event created in the database.
- A student scan can no longer create a new event by submitting arbitrary QR contents.
- Event start and end times are checked against the database record, not just values embedded in the QR code.
- Duplicate attendance is reported using the database unique-constraint response.

## Visual branding
- Updated app palette to midnight navy, electric blue, gold, and white.
- Updated app icon, splash artwork, favicon, and Android launcher icon variants with the QR Attendance logo.
- Dark status bar treatment and matching splash background.

## Existing features retained
- Supabase authentication and profile roles.
- Student QR scanner and attendance history.
- Teacher rotating QR generation.
- Offline scan queue and background sync.
- Admin event, attendance, report, student, and teacher management screens.

## Important deployment notes
1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for your own Supabase project.
2. Confirm Supabase RLS policies permit students to insert only their own attendance and read only their own records; teachers should only manage their own events; admin permissions should be granted only to trusted accounts.
3. The rotating QR currently uses app-side validation. For a production school deployment, move token signing and validation into a Supabase Edge Function (or another trusted server) and keep the signing secret off the mobile app. A rotating code alone is not complete anti-cheating protection.
4. After changing icon/splash assets, create a fresh Android build to see the new launcher icon on installed devices.

## Verification
- Updated TypeScript/TSX files passed a TypeScript transpile syntax check.
- A full dependency install, type-check, and Android APK build could not be completed in this environment. Run the commands in README.md on your development computer before deployment.
