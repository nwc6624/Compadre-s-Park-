# Android Setup Checklist

## Quick Command Checklist

Run these commands in order to build and run your Android app:

### 1. Build the Vite app
```bash
npm run build
```

### 2. Copy built files into Android project
```bash
npx cap sync
```

**OR** use the combined command:
```bash
npm run cap:build
```

### 3. Open Android project in Android Studio
```bash
npx cap open android
```

**OR** use the npm script:
```bash
npm run cap:open
```

### 4. Build and run in Android Studio
- Wait for Gradle sync to complete (may take a few minutes on first run)
- Connect an Android device via USB (with USB debugging enabled) OR start an Android emulator
- Click the green "Run" button (▶️) or press `Shift+F10`
- Select your device/emulator when prompted

## Configuration Summary

✅ **Capacitor Config:**
- App ID: `com.noah.blueslidepark`
- App Name: `Blue Slide Park`
- Web Dir: `dist`

✅ **Android Configuration:**
- **Fullscreen:** Enabled (no status bar, no navigation bar)
- **Orientation:** Portrait only
- **Local Files:** MainActivity loads from local assets (no remote URL)
- **Immersive Mode:** System UI bars are hidden with sticky immersive mode

## Additional Notes

- The app will automatically load your built Vite files from `dist/`
- All changes to your web code require rebuilding (`npm run build`) and syncing (`npx cap sync`)
- If you modify native Android code, you only need to rebuild in Android Studio
- The first Gradle sync may take several minutes as it downloads dependencies


