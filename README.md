# QR Attendance Management System

Expo SDK 54 + React Native + TypeScript + Supabase. This project includes Student, Teacher, and Admin workspaces.

## Updated features

See [FEATURES-UPDATE.md](./FEATURES-UPDATE.md) for the latest improvements, role-specific features, branding changes, and deployment notes.

## Requirements

- Node.js LTS
- VS Code
- Expo-compatible Android device / Expo Go, or an Android development build
- Supabase project with the required `profiles`, `events`, and `attendance` tables and correct RLS policies

## Setup on Windows PowerShell

```powershell
# Open the extracted project folder first
Copy-Item .env.example .env
# Edit .env and set your Supabase URL and anon key

npm.cmd install
npx.cmd expo start -c
```

If PowerShell blocks `npm`, use `npm.cmd` and `npx.cmd` as shown above.

## Android APK build

```powershell
npm.cmd install
npx.cmd eas-cli login
npx.cmd eas-cli build:configure
npx.cmd eas-cli build --platform android --profile preview
```

The `preview` profile in `eas.json` is intended for an installable APK if configured accordingly. Create a new build after changing the app icon or splash assets.

## Before real school deployment

- Review Supabase Row Level Security policies for every table.
- Restrict admin role assignment to trusted administrators; never expose admin registration publicly.
- Use a server-side signed QR token / Supabase Edge Function for production anti-cheating validation.
- Test duplicate scans, expired events, event time boundaries, offline sync, and all three roles.

## Useful checks

```powershell
npx.cmd tsc --noEmit
npx.cmd expo-doctor
```

A successful Metro launch does not replace database policy testing or an Android release build.
