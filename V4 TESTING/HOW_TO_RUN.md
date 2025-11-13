# How to Run Blake's Encryptor/Decryptor Locally

## The Problem
Firebase Authentication requires the app to run on a web server (http:// or https://), not directly from a file (file://).

## The Solution
Use the included launcher files to automatically start a local web server.

---

## Quick Start (Super Easy!)

### Windows Users:
1. **Double-click** `START_SERVER.bat`
2. Your browser will open automatically
3. Sign in with Google
4. Done! 🎉

### Alternative (PowerShell):
1. Right-click `START_SERVER.ps1`
2. Select "Run with PowerShell"
3. If you get a security warning, type: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
4. Run the script again

---

## What It Does:
- Automatically detects if you have Python, Node.js, or PHP installed
- Starts a local web server on port 8000
- Opens your browser to `http://localhost:8000/Main.html`
- Keeps running until you close the window

---

## Troubleshooting:

### "No web server found" Error:
You need to install **Python** (easiest option):
1. Download: https://www.python.org/downloads/
2. During installation, check "Add Python to PATH"
3. Restart your computer
4. Double-click `START_SERVER.bat` again

### Port 8000 Already in Use:
1. Close any other programs using port 8000
2. Or edit the batch file and change `8000` to another port like `8080`

### Browser Doesn't Open Automatically:
Manually open your browser and go to: `http://localhost:8000/Main.html`

### Firebase Auth Still Not Working:
1. Make sure you added `localhost` to Firebase authorized domains:
   - Go to https://console.firebase.google.com/
   - Select project: **encryptor-decryptor-1e110**
   - Click **Authentication** → **Settings**
   - Add `localhost` to **Authorized domains**

---

## Stopping the Server:
- Press **CTRL + C** in the command window
- Or simply close the window

---

## Why Can't It Run from a File?
Firebase Authentication uses browser security features that only work when the page is served from a web server (http:// or https://). Opening HTML files directly (file://) doesn't provide these security features, so Firebase blocks the authentication.

Running a local web server is the standard way to develop and test web applications locally!

---

## Still Need Help?
Check the console for error messages and make sure:
1. ✅ Firebase credentials are in `js/FirebaseConfig.js`
2. ✅ Google Authentication is enabled in Firebase Console
3. ✅ `localhost` is added to authorized domains
4. ✅ You're accessing via `http://localhost:8000/Main.html` (not file://)
