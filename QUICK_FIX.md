# Quick Fix for TurboModule Error

## The Error You're Seeing
```
Invariant Violation: TurboModuleRegistry.getEnforcing(...): 
'PlatformConstants' could not be found
```

This is caused by React Native 0.76.5 incompatibility.

## ✅ The Fix (Run These Commands)

### Step 1: Stop the Server
Press `Ctrl+C` in your terminal to stop the current server

### Step 2: Install Fixed Version
```bash
npm install
```

### Step 3: Clear Cache and Restart
```bash
npx expo start --clear
```

### Step 4: Reload on Your Phone
When the QR code appears:
1. Scan it again with Expo Go
2. If you see the error again, tap "RELOAD (R, R)"
3. The app should now work!

---

## What I Fixed
- ✅ Downgraded React Native from 0.76.5 → 0.76.1 (stable)
- ✅ This version is fully compatible with Expo SDK 54
- ✅ All other dependencies remain at SDK 54

---

## After It Works - QR Codes for Testing

Once the app loads successfully, you'll see a camera scanner asking "Where are you?"

### Generate These QR Codes:
Go to https://www.qr-code-generator.com/ and create QR codes with these exact texts:

1. **CAMPUS_MAIN_GATE** (your starting location)
2. **CAMPUS_LIBRARY** (destination to test)
3. **CAMPUS_ADMIN_BLOCK** (optional)
4. **CAMPUS_COMPUTER_LAB** (optional)

### How to Test:
1. Open app → Camera appears
2. Scan **CAMPUS_MAIN_GATE** QR code
3. Select "Library" as destination
4. See step-by-step navigation
5. Tap **"AR Guide"** button
6. See live camera with directional arrow! 🎉

---

## Quick Commands

**Just run this batch file:**
```
start-app.bat
```

It will:
1. Kill old processes
2. Start the server
3. Show QR code to scan
