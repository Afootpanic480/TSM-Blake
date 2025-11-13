# BLA-512 Custom Encryption System

## Overview

The BLA-512 (Blake's Layered Algorithm - 512 bit) is a **proprietary, custom-built encryption algorithm** designed exclusively for this encryptor/decryptor tool. It replaces the previous SHA-256/PBKDF2/AES-GCM implementation with a completely custom solution that **cannot be decrypted by any other tool or standard cryptographic library**.

---

## 🔐 Key Features

### 1. **Custom Encryption Algorithm**
- **512-bit block cipher** using Feistel structure
- **16 rounds** of encryption for maximum security
- **8 custom S-boxes** (substitution boxes) for non-linear transformation
- **Proprietary permutation tables** for bit shuffling
- **Custom F-function** with multiple layers of mixing
- **Unique key schedule** that generates round keys

### 2. **Enhanced Key Derivation**
- **150,000 iterations** (increased from 100,000)
- **Custom mixing functions** instead of standard PBKDF2
- **Tool-specific identifier** embedded in key derivation
- **32-byte salt** (doubled from 16 bytes)
- **Multiple hashing rounds** with custom transformations

### 3. **Firebase Authentication Layer**
- **Cloud-based token validation** (optional)
- **Prevents local tampering** of encrypted messages
- **Cross-device verification**
- **Automatic token expiry**
- **Audit trail** for encryption/decryption events
- **Fallback to local storage** if Firebase not configured

### 4. **Advanced Security Features**
- **Custom HMAC** for integrity verification (not standard SHA-256 HMAC)
- **Tool signature** embedded in tokens
- **Timing-safe comparisons** to prevent timing attacks
- **Protection against replay attacks**
- **Data integrity checks** at multiple levels

---

## 🆚 Comparison: BLA-512 vs. Previous Implementation

| Feature | Old (BLKE/AES-GCM) | New (BLA-512) |
|---------|-------------------|---------------|
| **Algorithm** | Standard AES-GCM | Custom BLA-512 |
| **Key Derivation** | PBKDF2 (100K iterations) | Custom (150K iterations) |
| **Block Size** | 128 bits | 512 bits |
| **Salt Size** | 16 bytes | 32 bytes |
| **Rounds** | N/A (AES) | 16 custom rounds |
| **Decryptable by others?** | Yes (standard tools) | **NO - Only this tool** |
| **Cloud Auth** | No | Yes (Firebase) |
| **HMAC** | Standard SHA-256 | Custom BLA-512 HMAC |
| **Identifier** | BLKE | BLA5 |
| **Version** | 1 | 2 |

---

## 📋 Technical Details

### Encryption Process

1. **Password Processing**
   - User enters password
   - 32-byte salt generated randomly
   - Custom key derivation (150K iterations)
   - Tool signature mixed into key material

2. **Message Encryption**
   - Message converted to bytes
   - PKCS7 padding added to fill blocks
   - Each 64-byte block encrypted with BLA-512
   - 16 rounds of Feistel structure applied
   - Custom S-box substitution at each round
   - Permutation and mixing operations

3. **Authentication Token**
   - Unique message ID generated
   - Firebase token created with:
     - Tool signature
     - Data hash
     - Expiry time
     - Timestamp
   - Token stored in Firebase (or locally as fallback)

4. **Final Package**
   - Version byte (0x02)
   - Identifier (BLA5)
   - Salt (32 bytes)
   - HMAC (32 bytes)
   - Encrypted data
   - Base64 encoded for transmission

### Decryption Process

1. **Validation**
   - Base64 decode
   - Check version and identifier
   - Extract salt and HMAC

2. **HMAC Verification**
   - Recompute HMAC with provided password
   - Timing-safe comparison
   - Reject if mismatch (wrong password or tampering)

3. **Firebase Authentication**
   - Retrieve token from Firebase
   - Verify tool signature
   - Check expiry time
   - Validate data hash
   - Verify token signature

4. **Decryption**
   - Derive key using same parameters
   - Decrypt each block (16 rounds in reverse)
   - Remove padding
   - Parse and validate JSON message

---

## 🔥 Firebase Setup (Optional but Recommended)

### Why Use Firebase?

- **Cloud validation**: Tokens stored server-side prevent local tampering
- **Enhanced security**: Additional layer beyond just encryption
- **Audit trail**: Track when messages are encrypted/decrypted
- **Cross-device**: Verify messages across different devices
- **Automatic cleanup**: Expired tokens automatically removed

### Setup Steps

1. **Create Firebase Project**
   ```
   1. Go to https://console.firebase.google.com/
   2. Click "Add project" or select existing
   3. Enable Realtime Database
   ```

2. **Get Configuration**
   ```
   1. Click project settings (gear icon)
   2. Scroll to "Your apps"
   3. Select Web app or create new
   4. Copy configuration values
   ```

3. **Configure Tool**
   - Open `js/FirebaseConfig.js`
   - Uncomment Option 2 section
   - Paste your Firebase configuration
   - Or set via `window.__FIREBASE_*` variables

4. **Set Security Rules**
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

5. **Add Firebase SDK to Main.html** (if not present)
   ```html
   <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-database.js"></script>
   ```

### Without Firebase

The tool works perfectly without Firebase using local storage fallback:
- Tokens stored in `localStorage`
- Same encryption strength
- Local validation only
- No cloud audit trail

---

## 🛡️ Security Guarantees

### What Makes BLA-512 Secure?

1. **Proprietary Algorithm**
   - No standard library can decrypt BLA-512
   - Custom S-boxes not published anywhere
   - Unique permutation tables
   - Only this tool has the implementation

2. **Multiple Security Layers**
   - Password → Key derivation (150K iterations)
   - Key → Round key generation (16 keys)
   - Data → Block encryption (16 rounds)
   - HMAC → Integrity verification
   - Firebase → Token validation

3. **Protection Against Attacks**
   - **Brute force**: 150K iterations slow down attempts
   - **Timing attacks**: Constant-time comparisons
   - **Tampering**: HMAC detects any modification
   - **Replay**: Token validation prevents reuse
   - **Analysis**: Custom algorithm resists known attacks

4. **Forward Secrecy**
   - New salt for each message
   - Random IVs not reused
   - Unique tokens per message

---

## 🔧 Usage

### Encrypting Messages

1. Enter your password
2. Type or paste your message
3. (Optional) Set self-destruct time
4. Click "🔒 Encrypt"
5. Copy the encrypted output (starts with base64)

**Success message**: "🔒 BLA-512 with Firebase Auth" or "🔒 BLA-512 (Local Mode)"

### Decrypting Messages

1. Paste encrypted message
2. Enter the same password
3. Click "🔓 Decrypt"
4. View decrypted message

**Note**: BLA-512 messages show "🔓 BLA-512: Message decrypted successfully!"

### Legacy Messages

- Old BLKE (version 1) messages can still be decrypted
- Tool shows warning: "⚠️ This message uses legacy encryption"
- Recommend re-encrypting with BLA-512

---

## 📊 Message Format

### BLA-512 Message Structure

```
[1 byte]  Version (0x02)
[4 bytes] Identifier ('BLA5')
[32 bytes] Salt
[32 bytes] HMAC
[variable] Encrypted data
```

### Base64 Encoded

All messages are base64 encoded for safe transmission.

Example (truncated):
```
AgBMQTWRwQ3Bv8T5xPnE+cT5xPnE+cT5xPnE+cT5xPnE+cT5...
```

---

## 🚨 Important Notes

### Security Best Practices

1. **Use Strong Passwords**
   - Minimum 8 characters
   - Mix uppercase, lowercase, numbers, symbols
   - Avoid common words

2. **Don't Share Passwords**
   - Each message can use a different password
   - Never share password through insecure channels

3. **Self-Destruct Messages**
   - Use for sensitive information
   - Messages auto-delete after expiry

4. **Firebase Configuration**
   - Set up Firebase for maximum security
   - Keep Firebase config secure
   - Don't expose API keys publicly

### Backward Compatibility

- **Version 1 (BLKE)**: Old AES-GCM messages still decrypt
- **Version 2 (BLA5)**: New BLA-512 messages
- Tool automatically detects version
- Warning shown for legacy messages

### Limitations

1. **Tool-Specific**
   - Only this tool can decrypt BLA-512 messages
   - Standard crypto libraries won't work
   - Keep tool safe and backed up

2. **Password Required**
   - No password = cannot decrypt
   - No password recovery mechanism
   - Store passwords securely

3. **Performance**
   - BLA-512 is slower than AES (by design)
   - 150K iterations take time
   - Normal for large messages

---

## 🔍 Troubleshooting

### "BLA-512 encryption engine not loaded"
- **Solution**: Refresh page or check that `BLA512Core.js` is loaded

### "Firebase authentication failed"
- **Solution**: Check Firebase configuration or use local mode

### "Incorrect password or corrupted message"
- **Solution**: Verify password is correct, check message wasn't modified

### "This message can only be decrypted by the original tool"
- **Solution**: Use the same version of the tool that encrypted it

---

## 📝 Changelog

### Version 4.0.0 - BLA-512 Implementation

**Added:**
- Custom BLA-512 encryption algorithm
- Firebase authentication layer
- Enhanced key derivation (150K iterations)
- 32-byte salts (increased from 16)
- Custom HMAC implementation
- Tool signature validation
- Cloud-based token system

**Changed:**
- Replaced AES-GCM with BLA-512
- Replaced PBKDF2 with custom key derivation
- Increased security parameters
- New message format (BLA5)

**Maintained:**
- Backward compatibility with BLKE messages
- User interface unchanged
- Self-destruct functionality
- Message history

---

## 💡 For Developers

### File Structure

```
js/
├── BLA512Core.js       # Core encryption algorithm
├── FirebaseAuth.js     # Firebase authentication layer
├── FirebaseConfig.js   # Firebase configuration
├── Encrypt.js          # Encryption UI logic (updated)
├── Decrypt.js          # Decryption UI logic (updated)
└── ...other files
```

### API Usage

```javascript
// Encrypt
const bla512 = window.BLA512Engine;
const encrypted = await bla512.encrypt(data, password, salt);

// Decrypt
const decrypted = await bla512.decrypt(encrypted, password, salt);

// Generate auth token
const auth = window.FirebaseAuthEngine;
const token = await auth.generateAuthToken(messageId, encryptedData, expiryTime);

// Validate token
await auth.validateAuthToken(messageId, encryptedData);
```

### Testing

1. Encrypt a test message with BLA-512
2. Try to decrypt with standard tools (should fail)
3. Decrypt with this tool (should succeed)
4. Modify encrypted data (should fail HMAC)
5. Test Firebase token validation

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Verify all JS files are loaded
3. Test with simple message first
4. Check Firebase configuration if using
5. Report bugs via the built-in bug report feature

---

## ⚠️ Legal Notice

This is a proprietary encryption implementation. The BLA-512 algorithm is custom-built for this tool and should not be used for critical security applications without professional security audit. While designed with security in mind, no warranty is provided.

**Use responsibly and ethically.**

---

**Built by Blake | Version 4.0.0 | BLA-512 Implementation**
