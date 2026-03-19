# Voice Trainer — Universal (iOS + Web)

Real-time pitch detection & vocal training app built with **Expo** (React Native) supporting both **iOS** and **Web** from a single codebase.

## Features

- **Real-time pitch detection** — YIN algorithm on web (Web Audio API), metering-based on native
- **Guided warmups** — Box breathing, lip trills, humming, vocal sirens
- **Scale exercises** — 16 exercises across beginner/intermediate/advanced
- **Song matching** — 12 songs with note-by-note scoring + combo system
- **Vocal range test** — Find your range and voice type classification
- **Onboarding flow** — Mic permission, range test, personalization
- **Gamification** — XP, levels, gems, achievements, daily goals, streak calendar
- **Supabase auth** — Email/password, cross-device sync
- **Dark mode** — Full dark theme throughout

## Architecture

```
app/                    # Expo Router (file-based routing)
  _layout.tsx           # Root layout (onboarding gate)
  (tabs)/               # Tab navigation
    index.tsx → HomeScreen
    warmup.tsx → WarmupScreen
    pitch.tsx → PitchDetectorScreen
    scales.tsx → ScalesScreen
    songs.tsx → SongMatchScreen
    progress.tsx → ProgressScreen

src/
  hooks/
    usePitchDetection.ts      # Native (expo-av metering)
    usePitchDetection.web.ts  # Web (Web Audio API + YIN)
  auth/                       # Supabase auth layer
  screens/                    # All screen components
  components/                 # PitchMeter, WaveformDisplay
  utils/                      # storage, pitchUtils, scales
  constants/                  # theme
```

### Platform Split

The pitch detection hook uses Expo's platform-specific file resolution:
- `usePitchDetection.ts` → used on iOS/Android (expo-av metering)
- `usePitchDetection.web.ts` → used on web (Web Audio API with real YIN)

## Getting Started

```bash
npm install
npx expo start        # Dev server (press i for iOS, w for web)
npx expo start --web  # Web only
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase keys:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Deployment

**Web (Vercel):** Push to `main` → auto-deploys via Vercel
**iOS:** `npx eas build --platform ios`

## Tech Stack

- **Framework:** Expo 52 + React Native 0.76
- **Routing:** Expo Router 4
- **Auth:** Supabase
- **Storage:** AsyncStorage (cross-platform)
- **Pitch Detection:** YIN algorithm (web), expo-av metering (native)
