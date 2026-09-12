# Sandeep Messenger (mobile)

React Native app for iOS and Android, built with Expo. It is a client for the
same backend as the web app on `main` — every rule (connections, deletions,
read receipts, signed attachment URLs) stays server-side and is reused, not
reimplemented.

## Setup

```bash
cd mobile
npm install
cp .env.example .env.local     # then edit the values
npx expo start
```

Press `i` for the iOS simulator, `a` for Android, or scan the QR code with
Expo Go on a real device.

## Environment

`.env.local`:

```bash
# A phone cannot reach "localhost". Use your machine's LAN IP in development,
# or the deployed URL in production.
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The web app must allow the app's origin. Set `ALLOWED_ORIGINS` there when the
app runs on web; native builds do not need it, because CORS is a browser rule.

## What is in it

| Area      | Included                                                                 |
| --------- | ------------------------------------------------------------------------ |
| Auth      | Sign in with username **or** email, sign up with a live username check, claim-a-username prompt |
| Chats     | Conversation list with previews, unread badges, search, new-message picker |
| Thread    | Text, photos, documents, voice notes, replies, delete for me / everyone, read receipts |
| Gate      | Connection requests: request, accept, decline, withdraw — the owner is exempt |
| Things    | Posts feed with images, likes and comments                               |
| Owner     | Sees every conversation; third-party threads are read-only               |

## Not included yet

- **Voice and video calls.** WebRTC needs `react-native-webrtc`, which does not
  run in Expo Go and requires a development build.
- **Push notifications when the app is closed.** Needs a push token registry
  and APNs/FCM credentials. In-app updates work through Supabase realtime.

## Building

```bash
npx expo run:ios        # needs Xcode
npx expo run:android    # needs Android Studio
npx eas build -p all    # cloud builds for the stores
```
