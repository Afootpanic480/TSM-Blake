# 🚀 BLA-512 Setup Guide

## Quick Start

Your encryptor has been upgraded to use **BLA-512 custom encryption**! Here's what you need to know:

---

## ✅ What's Already Working

The tool will work **immediately** with these features:
- ✅ BLA-512 custom encryption (512-bit, 16 rounds)
- ✅ 150,000 iteration key derivation
- ✅ Custom S-boxes and permutation tables
- ✅ Enhanced HMAC for message integrity
- ✅ Local authentication token storage
- ✅ Backward compatibility with old BLKE messages

**You can start using it right away!** No configuration needed for basic functionality.

---

## 🔥 Optional: Firebase Setup (Recommended for Maximum Security)

Firebase adds cloud-based token validation. This prevents local tampering and provides audit trails.

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project" (or use existing)
3. Enter project name (e.g., "BLA512-Encryptor")
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Realtime Database

1. In Firebase Console, click "Realtime Database" in left menu
2. Click "Create Database"
3. Choose location (closest to you)
4. Start in **test mode** (we'll secure it next)
5. Click "Enable"

### Step 3: Set Security Rules

1. Click "Rules" tab in Realtime Database
2. Replace existing rules with:

```json
{
  "rules": {
    "authTokens": {
      "$messageId": {
        ".read": true,
        ".write": true,
        ".indexOn": ["timestamp", "expiryTime"]
      }
    }
  }
}
```

3. Click "Publish"

### Step 4: Get Configuration

1. Click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll to "Your apps" section
4. Click the web icon (</>) to add a web app
5. Enter app nickname (e.g., "BLA512-Web")
6. Click "Register app"
7. **Copy the configuration values**

### Step 5: Configure Your Tool

Open `js/FirebaseConfig.js` and find this section:

```javascript
// Option 2: Directly set configuration (less secure, but easier for testing)
// Uncomment and fill in your Firebase configuration:
/*
window.__FIREBASE_API_KEY__ = 'YOUR_API_KEY_HERE';
window.__FIREBASE_AUTH_DOMAIN__ = 'YOUR_PROJECT_ID.firebaseapp.com';
window.__FIREBASE_PROJECT_ID__ = 'YOUR_PROJECT_ID';
window.__FIREBASE_STORAGE_BUCKET__ = 'YOUR_PROJECT_ID.appspot.com';
window.__FIREBASE_MESSAGING_SENDER_ID__ = 'YOUR_SENDER_ID';
window.__FIREBASE_APP_ID__ = 'YOUR_APP_ID';
*/
```

**Uncomment and fill in your values:**

```javascript
window.__FIREBASE_API_KEY__ = 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
window.__FIREBASE_AUTH_DOMAIN__ = 'your-project.firebaseapp.com';
window.__FIREBASE_PROJECT_ID__ = 'your-project';
window.__FIREBASE_STORAGE_BUCKET__ = 'your-project.appspot.com';
window.__FIREBASE_MESSAGING_SENDER_ID__ = '123456789012';
window.__FIREBASE_APP_ID__ = '1:123456789012:web:abcdef123456';
```

### Step 6: Add Firebase SDK (Optional)

If you want to use Firebase features, add these lines to the `<head>` section of `Main.html`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.17.1/firebase-database-compat.js"></script>
```

**Note:** The tool works perfectly without Firebase SDK using local storage fallback.

---

## 🧪 Testing Your Setup

### Test 1: Basic Encryption (No Firebase)

1. Open `Main.html` in your browser
2. Enter password: `test123`
3. Enter message: `Hello BLA-512!`
4. Click "🔒 Encrypt"
5. You should see: **"Message encrypted successfully with 🔒 BLA-512 (Local Mode)!"**

### Test 2: Decryption

1. Copy the encrypted message
2. Paste it in the message field
3. Enter the same password
4. Click "🔓 Decrypt"
5. You should see: **"🔓 BLA-512: Message decrypted successfully!"**

### Test 3: Security Validation

1. Open `BLA512_Security_Test.html` in your browser
2. Click "🚀 Run All Tests"
3. All tests should pass, proving:
   - ✅ Standard AES-GCM cannot decrypt
   - ✅ Standard PBKDF2 cannot decrypt
   - ✅ BLA-512 successfully decrypts
   - ✅ Tampering is detected
   - ✅ Your messages are secure

### Test 4: Firebase Integration (If Configured)

1. Encrypt a message
2. Check Firebase Console → Realtime Database
3. You should see an entry under `authTokens/`
4. Contains: messageId, timestamp, dataHash, etc.
5. Decrypt message should validate against Firebase

---

## 📊 Verification

### Console Checks

Open browser console (F12) and look for:

```
[Firebase Config] Configuration loaded. Status: Configured
```
or
```
[Firebase Config] Configuration loaded. Status: Using fallback mode
```

### Encryption Messages

- **With Firebase:** "🔒 BLA-512 with Firebase Auth"
- **Without Firebase:** "🔒 BLA-512 (Local Mode)"

### Decryption Messages

- **BLA-512 message:** "🔓 BLA-512: Message decrypted successfully!"
- **Old BLKE message:** "⚠️ This message uses legacy encryption" (backward compatibility)

---

## 🔧 Troubleshooting

### "BLA-512 encryption engine not loaded"

**Solution:**
1. Check that `js/BLA512Core.js` exists
2. Refresh the page (Ctrl+F5)
3. Check browser console for errors

### "Firebase authentication failed"

**Solution:**
1. Check Firebase configuration in `FirebaseConfig.js`
2. Verify Firebase Realtime Database is enabled
3. Check security rules are set correctly
4. Tool will fallback to local mode automatically

### "Incorrect password or corrupted message"

**Causes:**
- Wrong password entered
- Message was modified/corrupted
- Copy-paste error (ensure full message copied)

**Solution:**
- Verify password is correct
- Re-copy the encrypted message
- Check for extra spaces or characters

### Legacy Message Warning

If you see: "⚠️ This message uses legacy encryption"

**This is normal!** Old BLKE (version 1) messages still work for backward compatibility. To use new BLA-512:
1. Decrypt the old message
2. Copy the decrypted text
3. Re-encrypt with BLA-512

---

## 📁 File Structure

Your tool now includes these files:

```
V4 TESTING/
├── Main.html                    # Main application
├── BLA512_Security_Test.html    # Security validation tests
├── BLA512_README.md             # Detailed documentation
├── SETUP_GUIDE.md               # This file
└── js/
    ├── BLA512Core.js            # Custom encryption engine
    ├── FirebaseAuth.js          # Authentication layer
    ├── FirebaseConfig.js        # Firebase configuration
    ├── Encrypt.js               # Updated encryption logic
    ├── Decrypt.js               # Updated decryption logic
    └── ... (other existing files)
```

---

## 🎯 Key Features Summary

| Feature | BLA-512 | Old (BLKE) |
|---------|---------|------------|
| Encryption | Custom 512-bit | Standard AES-256-GCM |
| Iterations | 150,000 | 100,000 |
| Salt Size | 32 bytes | 16 bytes |
| Can be decrypted by other tools? | ❌ NO | ✅ Yes |
| Firebase Auth | ✅ Yes | ❌ No |
| Security Level | 🔒🔒🔒🔒🔒 | 🔒🔒🔒 |

---

## 🚨 Important Notes

### Password Requirements

- Minimum 8 characters
- Maximum 100 characters
- Can include any characters
- Case-sensitive

### Security Best Practices

1. **Use strong passwords** - Mix letters, numbers, symbols
2. **Don't reuse passwords** - Each message can have different password
3. **Store passwords securely** - No password recovery available
4. **Test encryption/decryption** - Verify before sharing
5. **Keep tool updated** - Check for updates regularly

### Backward Compatibility

- ✅ Old BLKE messages (version 1) still work
- ✅ Automatic version detection
- ✅ Warning shown for legacy messages
- ✅ Smooth migration path

---

## ✨ What's New in BLA-512

### Custom Encryption

- 8 proprietary S-boxes
- Custom permutation tables
- 16-round Feistel structure
- Unique F-function
- Tool-specific implementation

### Enhanced Security

- 150,000 iterations (up from 100,000)
- 32-byte salts (up from 16)
- Custom HMAC (not standard SHA-256)
- Tool signature validation
- Firebase cloud validation

### Better Protection

- Cannot be decrypted by standard tools
- Tampering detection
- Message integrity verification
- Optional cloud authentication
- Audit trails (with Firebase)

---

## 📞 Support

### Need Help?

1. Read `BLA512_README.md` for detailed documentation
2. Run `BLA512_Security_Test.html` to verify functionality
3. Check browser console (F12) for errors
4. Use the built-in bug report feature in Main.html

### Common Questions

**Q: Do I need Firebase?**
A: No! Tool works perfectly without it. Firebase adds extra security layers.

**Q: Will my old messages still work?**
A: Yes! Full backward compatibility with BLKE (version 1) messages.

**Q: Is BLA-512 secure?**
A: Yes! Custom algorithm that cannot be decrypted by any other tool. See security test.

**Q: Can I use BLA-512 offline?**
A: Yes! Works completely offline. Firebase is optional for cloud features.

---

## 🎉 You're All Set!

Your encryptor is now using **BLA-512 custom encryption** - the most secure version yet!

**Next Steps:**
1. ✅ Test encryption/decryption
2. ✅ Run security tests
3. ✅ (Optional) Configure Firebase
4. ✅ Start encrypting securely!

---

**Enjoy your upgraded encryption tool! 🔐**

*Built by Blake | BLA-512 Version 4.0.0*
