# UniWay - Complete Setup Guide

This guide will walk you through setting up and running the UniWay app from scratch.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Running the App](#running-the-app)
4. [Testing the App](#testing-the-app)
5. [Generating QR Codes](#generating-qr-codes)
6. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

### Step 1.1: Install Node.js

Node.js is required to run the Expo development server.

**Windows:**
1. Visit https://nodejs.org/
2. Download the **LTS version** (recommended)
3. Run the installer
4. Follow the installation wizard (use default settings)
5. Restart your computer

**Verify Installation:**
```bash
node --version
# Should show: v18.x.x or higher

npm --version
# Should show: 9.x.x or higher
```

### Step 1.2: Install Expo Go on Your Mobile Device

**Android:**
- Open Google Play Store
- Search for "Expo Go"
- Install the app
- Link: https://play.google.com/store/apps/details?id=host.exp.exponent

**iOS:**
- Open App Store
- Search for "Expo Go"
- Install the app
- Link: https://apps.apple.com/app/expo-go/id982107779

---

## 2. Installation

### Step 2.1: Open Terminal/Command Prompt

**Windows:**
- Press `Win + R`
- Type `cmd` or `powershell`
- Press Enter

**Or use VS Code terminal:**
- Open VS Code
- Press `` Ctrl + ` `` (backtick)

### Step 2.2: Navigate to Project Directory

```bash
cd "d:\React Native\UniWay"
```

### Step 2.3: Install Dependencies

This will download all required packages (may take 2-5 minutes):

```bash
npm install
```

**Expected Output:**
```
added 1234 packages in 3m
```

---

## 3. Running the App

### Step 3.1: Start the Development Server

```bash
npm start
```

**Expected Output:**
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### Step 3.2: Connect Your Device

**Make sure your phone and computer are on the same Wi-Fi network!**

**Android:**
1. Open Expo Go app
2. Tap "Scan QR code"
3. Scan the QR code from your terminal
4. Wait for the app to load (first time may take 1-2 minutes)

**iOS:**
1. Open Camera app
2. Point at the QR code
3. Tap the notification that appears
4. Expo Go will open automatically

### Step 3.3: Alternative - Run on Emulator

**Android Emulator:**
```bash
npm run android
```
*Requires Android Studio to be installed*

**iOS Simulator (Mac only):**
```bash
npm run ios
```
*Requires Xcode to be installed*

---

## 4. Testing the App

### Step 4.1: Generate Test QR Codes

You need to create QR codes for testing. Use any online QR code generator:

**Recommended:** https://www.qr-code-generator.com/

**QR Codes to Generate:**

1. **Main Gate**
   - Text: `CAMPUS_MAIN_GATE`
   - Save as: `main_gate_qr.png`

2. **Admin Block**
   - Text: `CAMPUS_ADMIN_BLOCK`
   - Save as: `admin_block_qr.png`

3. **Library**
   - Text: `CAMPUS_LIBRARY`
   - Save as: `library_qr.png`

4. **Computer Lab**
   - Text: `CAMPUS_COMPUTER_LAB`
   - Save as: `computer_lab_qr.png`

### Step 4.2: Test the Navigation Flow

1. **Open the app** on your device
2. **Grant permissions** when prompted:
   - Camera permission
   - Location permission
3. **Scan QR code**:
   - Display one of your generated QR codes on another screen
   - Point your phone camera at it
   - Wait for detection
4. **Select destination**:
   - Browse the list of locations
   - Tap on any destination
5. **Navigate**:
   - Follow the step-by-step instructions
   - Test voice guidance toggle
   - Try manual "Next Step" button

### Step 4.3: Test Offline Mode

1. Enable airplane mode on your device
2. Close and reopen the app
3. The app should still work (data is stored locally)

---

## 5. Generating QR Codes

### Method 1: Online Generator (Easiest)

1. Visit: https://www.qr-code-generator.com/
2. Select "Text" type
3. Enter the campus code (e.g., `CAMPUS_MAIN_GATE`)
4. Click "Create QR Code"
5. Download and print

### Method 2: Batch Generation (Python)

If you want to generate all QR codes at once:

```python
# Install: pip install qrcode pillow

import qrcode

locations = [
    "CAMPUS_MAIN_GATE",
    "CAMPUS_ADMIN_BLOCK",
    "CAMPUS_LIBRARY",
    "CAMPUS_PLAYGROUND",
    "CAMPUS_COMPUTER_LAB",
    "CAMPUS_CANTEEN",
    "CAMPUS_SEMINAR_HALL"
]

for location in locations:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(location)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(f"{location}.png")
    print(f"Generated {location}.png")
```

### Method 3: Node.js Script

```bash
npm install qrcode
```

```javascript
// generate-qr.js
const QRCode = require('qrcode');

const locations = [
  'CAMPUS_MAIN_GATE',
  'CAMPUS_ADMIN_BLOCK',
  'CAMPUS_LIBRARY',
  'CAMPUS_PLAYGROUND',
  'CAMPUS_COMPUTER_LAB',
  'CAMPUS_CANTEEN',
  'CAMPUS_SEMINAR_HALL'
];

locations.forEach(location => {
  QRCode.toFile(`${location}.png`, location, {
    width: 300,
    margin: 2
  }, (err) => {
    if (err) console.error(err);
    else console.log(`Generated ${location}.png`);
  });
});
```

Run: `node generate-qr.js`

---

## 6. Troubleshooting

### Issue: "npx/npm command not found"

**Solution:**
- Node.js is not installed or not in PATH
- Reinstall Node.js
- Restart your terminal/computer

### Issue: "Cannot connect to Metro"

**Solution:**
1. Check if phone and computer are on same Wi-Fi
2. Disable VPN if active
3. Try restarting the development server:
   ```bash
   # Press Ctrl+C to stop
   npm start
   ```

### Issue: "Camera permission denied"

**Solution:**
1. Go to phone Settings
2. Find "UniWay" app
3. Enable Camera permission
4. Restart the app

### Issue: "QR code not scanning"

**Solution:**
- Ensure good lighting
- Hold phone steady
- Make sure QR code has `CAMPUS_` prefix
- Try displaying QR code larger

### Issue: "GPS not working"

**Solution:**
1. Enable Location Services on device
2. Grant location permission to app
3. Try outdoors for better GPS signal
4. On Android, enable "High Accuracy" mode

### Issue: "App crashes on startup"

**Solution:**
1. Clear Expo cache:
   ```bash
   npm start -- --clear
   ```
2. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Issue: "Voice guidance not working"

**Solution:**
- Check device volume
- Ensure voice is enabled in app settings
- Test with different speech rate
- On iOS, check if silent mode is off

### Issue: "Module not found" errors

**Solution:**
```bash
# Clear cache and reinstall
npm start -- --clear
# Or
rm -rf node_modules package-lock.json
npm install
```

---

## 📱 App Usage Guide

### First Time Setup

1. **Launch app**
2. **Grant permissions** (camera + location)
3. **Scan QR code** at campus entrance
4. **Select destination** from list
5. **Start navigating**

### Daily Usage

1. Open app
2. Scan QR code at your current location
3. Choose where you want to go
4. Follow voice and visual instructions
5. App auto-advances through steps

### Tips for Best Experience

- **Use outdoors** for better GPS accuracy
- **Enable voice guidance** for hands-free navigation
- **Check accessibility toggle** if needed
- **Look for event alerts** near classrooms
- **Works offline** - no internet needed after first load

---

## 🎯 Next Steps

### For Development

1. **Customize campus map**: Edit `data/campusMap.json`
2. **Add new locations**: Follow JSON structure
3. **Change colors**: Edit `utils/constants.ts`
4. **Modify voice settings**: Adjust pitch/rate in constants

### For Production

1. **Build standalone app**:
   ```bash
   npx expo build:android
   npx expo build:ios
   ```

2. **Publish updates**:
   ```bash
   npx expo publish
   ```

---

## 📞 Support

If you encounter issues not covered here:

1. Check the main README.md
2. Review error messages carefully
3. Search Expo documentation: https://docs.expo.dev/
4. Check React Native docs: https://reactnative.dev/

---

## ✅ Quick Checklist

Before running the app, make sure:

- [ ] Node.js installed (v18+)
- [ ] Expo Go installed on phone
- [ ] Phone and computer on same Wi-Fi
- [ ] Dependencies installed (`npm install`)
- [ ] QR codes generated
- [ ] Camera permission ready to grant
- [ ] Location permission ready to grant

**You're all set! Run `npm start` and enjoy navigating! 🎉**
