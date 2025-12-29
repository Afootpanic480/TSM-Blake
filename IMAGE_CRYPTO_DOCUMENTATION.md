# 🖼️ IMAGE CRYPTO CONTAINER SYSTEM

## EXPERIMENTAL PIXEL-BASED ENCRYPTION CONTAINER

**Version:** 3.0  
**Status:** Non-Production Prototype  
**Purpose:** Creative obfuscation, ARGs, layered deterrence

---

## ⚠️ DISCLAIMER

This system is **NOT cryptographically secure** and is **NOT intended for production use**. It is designed for:

- Alternate Reality Games (ARGs)
- Creative fiction and worldbuilding
- Prototyping experimental concepts
- Layered obfuscation research
- Educational demonstrations

**Do not use this for protecting sensitive data.**

---

## 🎯 SYSTEM OVERVIEW

The Image Crypto Container system transforms encrypted text (from BLAK-512) into pixel-embedded payloads with multiple obfuscation layers. The encrypted message is completely hidden within what appears to be random noise or decorative imagery.

### Core Concept

```
Plaintext Message
    ↓
BLAK-512 Encryption (existing engine)
    ↓
Encrypted Bytes
    ↓
[MAGIC HEADER(2) | LENGTH(4) | ENCRYPTED DATA(...)]
    ↓
Embedded into pixel blocks (XOR into RGB channels)
    ↓
Apply Obfuscation Layer 1: RGB Channel Permutation
    ↓
Apply Obfuscation Layer 2: Block Shuffling (Fisher-Yates)
    ↓
Apply Obfuscation Layer 3: XOR Masking (password-derived)
    ↓
Add Decoy Regions (fake magic headers)
    ↓
PNG Image (lossless, ready for transmission)
```

### Extraction Pipeline (Reverse Order)

```
PNG Image
    ↓
Load into Canvas, read pixel data
    ↓
Password → Seed PRNG (deterministic)
    ↓
REVERSE: XOR Masking
    ↓
REVERSE: Block Shuffling (inverse mapping)
    ↓
REVERSE: RGB Channel Permutation
    ↓
Extract bytes from shuffled blocks
    ↓
Validate magic header (0xB1A4)
    ↓
Read length prefix
    ↓
Extract encrypted bytes
    ↓
BLAK-512 Decryption
    ↓
Plaintext Message
```

---

## 🏗️ ARCHITECTURE

### 1. Payload Format

The payload embedded in the image follows this structure:

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0x00 | 2 bytes | Magic Header | `0xB1A4` - identifies valid payload |
| 0x02 | 4 bytes | Length | Big-endian uint32, length of encrypted data |
| 0x06 | N bytes | Encrypted Data | BLAK-512 encrypted message |

**Total Size:** 6 + N bytes

### 2. Block-Based Embedding

- Image divided into **8×8 pixel blocks**
- Each block can store **3 bytes** (one byte per RGB channel of first pixel)
- Blocks are accessed in **shuffled order** using password-seeded PRNG
- For a 512×512 image: 64×64 = 4096 blocks → **12,288 bytes capacity**

**Formula:**
```
Capacity = (width / block_size) × (height / block_size) × 3 bytes
```

### 3. Deterministic PRNG (Password-Seeded)

```javascript
class SeededPRNG {
    constructor(password) {
        // Multi-round hash: FNV-1a + custom mixing
        this.state = hash(password)
    }
    
    next() {
        // XorShift32 algorithm
        state ^= state << 13
        state ^= state >>> 17
        state ^= state << 5
        return normalized(state)
    }
}
```

**Key Properties:**
- Same password → Same sequence
- Deterministic across runs
- Fast generation
- Sufficient for obfuscation (not crypto)

### 4. Obfuscation Layers

#### Layer 1: RGB Channel Permutation

Each 8×8 block has its RGB channels permuted according to one of 6 patterns:

| Pattern | Mapping |
|---------|---------|
| 0 | R→R, G→G, B→B (identity) |
| 1 | R→R, G→B, B→G |
| 2 | R→G, G→R, B→B |
| 3 | R→G, G→B, B→R |
| 4 | R→B, G→R, B→G |
| 5 | R→B, G→G, B→R |

**Purpose:** Scrambles color data without altering pixel positions.

#### Layer 2: Block Shuffling

Entire 8×8 blocks are rearranged using Fisher-Yates shuffle:

```javascript
for (let i = blocks.length - 1; i > 0; i--) {
    const j = prng.nextInt(i + 1);
    swap(blocks[i], blocks[j]);
}
```

**Purpose:** Destroys spatial coherence, makes visual analysis impossible.

#### Layer 3: XOR Masking

Every pixel's RGB values are XORed with a password-derived stream:

```javascript
const mask = new SeededPRNG(password + ':XOR_MASK');
for each pixel:
    pixel.r ^= mask.nextByte()
    pixel.g ^= mask.nextByte()
    pixel.b ^= mask.nextByte()
```

**Purpose:** Final diffusion layer, ensures wrong password produces garbage.

#### Layer 4: Decoy Regions

Fake magic headers (0xDEC0ED) are XORed into random pixel locations:

```javascript
const decoyPRNG = new SeededPRNG('DECOY_SEED');
for (let i = 0; i < decoy_count; i++) {
    random_pixel ^= [0xDE, 0xC0, 0xED];
}
```

**Purpose:** Mislead automated analysis, create false positive targets.

### 5. Metadata

Metadata is stored **outside** the pixel data (e.g., PNG text chunks or separate file):

```json
{
    "ALG": "BLAK512",
    "VER": 3,
    "PAYLOAD": "PIXELS",
    "MAP": "BLOCK_SHUFFLE",
    "BLOCK": 8,
    "SEED_MODE": "PASSWORD_HASH",
    "DECOY": true,
    "CHANNELS": "RGB_PERMUTE"
}
```

**Important:** Metadata contains **instructions only**, no secrets. The system can function without it (fallback to defaults), but extraction becomes harder.

---

## 📊 CAPACITY & LIMITS

### Image Size vs Payload Capacity

| Dimensions | Blocks | Capacity | Recommended Use |
|------------|--------|----------|-----------------|
| 256×256 | 1,024 | 3,072 bytes | Short messages |
| 512×512 | 4,096 | 12,288 bytes | Standard messages |
| 1024×1024 | 16,384 | 49,152 bytes | Long documents |
| 2048×2048 | 65,536 | 196,608 bytes | Maximum practical |

### Overhead Analysis

For a 100-byte message:
- Encrypted size: ~200 bytes (BLAK-512 overhead)
- With header: 206 bytes
- Required blocks: 69 blocks (206 / 3)
- Minimum image: 512×512 (4,096 blocks available)
- PNG file size: ~250 KB
- **Overhead ratio: ~1250×**

**Trade-off:** High overhead is acceptable for ARGs and creative projects where steganography value exceeds efficiency concerns.

---

## 🔧 API REFERENCE

### High-Level API

#### `encryptToImage(plaintext, password, options)`

Encrypts a message and embeds it into an image.

**Parameters:**
- `plaintext` (string): Message to encrypt
- `password` (string): Encryption password
- `options` (object):
  - `width` (number): Image width (default: 512)
  - `height` (number): Image height (default: 512)
  - `canvas` (HTMLCanvasElement): Custom canvas (optional)

**Returns:** Promise resolving to:
```javascript
{
    canvas: HTMLCanvasElement,
    imageData: ImageData,
    metadata: Object,
    dataURL: string,
    blob: Blob
}
```

**Example:**
```javascript
const container = await ImageCryptoContainer.encryptToImage(
    "Secret message",
    "myPassword123",
    { width: 512, height: 512 }
);

// Download image
const link = document.createElement('a');
link.download = 'encrypted.png';
link.href = container.dataURL;
link.click();
```

#### `decryptFromImage(imageSource, password)`

Extracts and decrypts a message from an image.

**Parameters:**
- `imageSource` (HTMLImageElement | HTMLCanvasElement | File | Blob): Image containing payload
- `password` (string): Decryption password

**Returns:** Promise resolving to:
```javascript
{
    success: boolean,
    plaintext?: string,
    error?: string
}
```

**Example:**
```javascript
// From file input
const file = document.getElementById('fileInput').files[0];
const result = await ImageCryptoContainer.decryptFromImage(file, "myPassword123");

if (result.success) {
    console.log("Message:", result.plaintext);
} else {
    console.error("Failed:", result.error);
}
```

### Low-Level API

#### `embedPayloadIntoImage(encryptedBytes, password, options)`

Embeds raw encrypted bytes into an image (no BLAK-512 encryption step).

**Parameters:**
- `encryptedBytes` (Uint8Array): Pre-encrypted data
- `password` (string): Password for obfuscation layers
- `options` (object): Same as `encryptToImage`

**Returns:** Object (synchronous, no Promise)

#### `extractPayloadFromImage(imageSource, password)`

Extracts raw encrypted bytes from an image (no BLAK-512 decryption step).

**Parameters:**
- `imageSource`: Image source
- `password` (string): Password for deobfuscation

**Returns:** Object (synchronous)
```javascript
{
    success: boolean,
    encryptedBytes?: Uint8Array,
    length?: number,
    error?: string
}
```

---

## 🧪 TESTING & VALIDATION

### Unit Test Checklist

- [ ] **PRNG Determinism:** Same password produces same sequence
- [ ] **Round-trip:** Encrypt → Embed → Extract → Decrypt returns original
- [ ] **Wrong Password:** Produces garbage or decoy output (not explicit error)
- [ ] **Capacity Limits:** Rejects messages exceeding image capacity
- [ ] **Image Formats:** PNG works, JPEG fails gracefully
- [ ] **Metadata Stripping:** Extraction survives metadata loss
- [ ] **Decoy Interference:** Decoys don't break extraction

### Integration Tests

```javascript
// Test 1: Basic Round-Trip
const original = "Test message";
const container = await ImageCryptoContainer.encryptToImage(original, "pass");
const result = await ImageCryptoContainer.decryptFromImage(container.canvas, "pass");
assert(result.success && result.plaintext === original);

// Test 2: Wrong Password
const badResult = await ImageCryptoContainer.decryptFromImage(container.canvas, "wrong");
assert(!badResult.success || badResult.plaintext !== original);

// Test 3: File Round-Trip (simulate download/upload)
const blob = container.blob;
const file = new File([blob], "test.png", { type: "image/png" });
const fileResult = await ImageCryptoContainer.decryptFromImage(file, "pass");
assert(fileResult.success && fileResult.plaintext === original);
```

### Performance Benchmarks

Expected performance (modern browser, 512×512 image):

| Operation | Time |
|-----------|------|
| Encryption + Embedding | 50-150 ms |
| Extraction + Decryption | 50-150 ms |
| Image Generation (PNG) | 20-50 ms |

**Note:** Most time is spent in BLAK-512 encryption, not pixel manipulation.

---

## 🚨 FAILURE MODES & HANDLING

### Failure Scenarios

| Scenario | Detection | Behavior |
|----------|-----------|----------|
| Wrong password | Magic header mismatch | Return generic error or garbage |
| Corrupted pixels | Header validation fails | Return error after extraction attempt |
| Image too small | Capacity check | Fail during embedding (before creation) |
| JPEG compression | Lossy artifacts | Extraction fails silently (wrong bytes) |
| Metadata stripped | Fallback to defaults | May still work if core data intact |

### Error Messages (Intentionally Vague)

```javascript
// Good (vague, doesn't reveal attack vector)
"Failed to locate payload"
"Invalid magic header"
"Extraction error"

// Bad (reveals too much)
"Password incorrect"
"Expected 0xB1A4 at offset 0x120"
"Block 47 checksum mismatch"
```

**Design Philosophy:** Errors should frustrate attackers without revealing the failure point.

---

## 🎭 THREAT MODEL & INTENTIONAL WEAKNESSES

### What This System RESISTS

✅ **Casual Visual Inspection:** Image looks like random noise  
✅ **Naive File Analysis:** No obvious text/patterns in hex dump  
✅ **Brute Force (weak passwords):** BLAK-512 key derivation provides work factor  
✅ **Metadata Scraping:** Metadata contains no secrets

### What This System DOES NOT RESIST

❌ **Statistical Analysis:** Pixel distribution may be distinguishable from random  
❌ **Known-Plaintext Attacks:** If attacker has message/password pair  
❌ **Cryptanalysis:** BLAK-512 is not peer-reviewed crypto  
❌ **Code Inspection:** Algorithms are visible in JavaScript  
❌ **Side-Channel Attacks:** Timing, memory patterns may leak info

### Intentional Design Choices

1. **No Key Stretching:** PRNG seed derived from simple hash (fast but weak)
2. **Visible Metadata:** Instructions are plaintext (transparency over security)
3. **Client-Side Only:** No server validation, all logic in browser
4. **Reversible Obfuscation:** Layers are deterministic, not cryptographic

**Why?** This system prioritizes **narrative coherence** and **accessibility** for ARGs/creative projects over cryptographic strength.

---

## 🛠️ INTEGRATION GUIDE

### Basic Setup

```html
<!-- Load dependencies -->
<script src="BLA512Core.js"></script>
<script src="ImageCryptoContainer.js"></script>

<script>
// Check if loaded
if (typeof ImageCryptoContainer !== 'undefined') {
    console.log('Image Crypto Container ready');
}
</script>
```

### Example: Encrypt on Submit

```javascript
document.getElementById('encryptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = document.getElementById('message').value;
    const password = document.getElementById('password').value;
    
    try {
        const container = await ImageCryptoContainer.encryptToImage(
            message, 
            password,
            { width: 512, height: 512 }
        );
        
        // Display image
        document.getElementById('output').appendChild(container.canvas);
        
        // Or download
        const link = document.createElement('a');
        link.download = 'secret.png';
        link.href = container.dataURL;
        link.click();
        
    } catch (error) {
        alert('Encryption failed: ' + error.message);
    }
});
```

### Example: Decrypt from File Upload

```javascript
document.getElementById('imageFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const password = prompt('Enter password:');
    
    if (!file || !password) return;
    
    try {
        const result = await ImageCryptoContainer.decryptFromImage(file, password);
        
        if (result.success) {
            document.getElementById('output').textContent = result.plaintext;
        } else {
            alert('Decryption failed: ' + result.error);
        }
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
});
```

### Node.js Usage (with Canvas)

```javascript
const { createCanvas, loadImage } = require('canvas');
const ImageCryptoContainer = require('./ImageCryptoContainer.js');

// Provide canvas to options
const canvas = createCanvas(512, 512);
const container = ImageCryptoContainer.embedPayloadIntoImage(
    encryptedBytes,
    password,
    { canvas: canvas }
);

// Save to file
const fs = require('fs');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('output.png', buffer);
```

---

## 📝 SIZE LIMITATIONS

### Practical Limits

| Image Size | File Size (PNG) | Message Capacity | Recommended Use |
|------------|-----------------|------------------|-----------------|
| 256×256 | ~80 KB | ~3 KB | Tweets, short codes |
| 512×512 | ~250 KB | ~12 KB | Standard messages, emails |
| 1024×1024 | ~1 MB | ~48 KB | Documents, stories |
| 2048×2048 | ~4 MB | ~192 KB | Large files, archives |

**Recommendations:**
- For web transmission: 512×512 (good balance)
- For Discord/social: 1024×1024 (higher capacity)
- For email: 256×256 or 512×512 (attachment limits)

### Compression Notes

- **PNG:** Lossless, safe to use
- **WEBP (lossless mode):** Safe, smaller files
- **JPEG:** **DESTROYS PAYLOAD** - lossy compression changes pixel values
- **GIF:** Limited colors, not recommended

**Rule:** Always use lossless formats. Test extraction after any file conversion.

---

## 🔬 FUTURE ENHANCEMENTS (IDEAS)

### Potential Additions

1. **Adaptive Capacity:** Auto-resize image to fit message
2. **Error Correction:** Reed-Solomon codes for corruption resistance
3. **Multi-Password Layers:** Nested decryption with different passwords
4. **Plausible Deniability:** Multiple valid payloads in one image
5. **Steganographic Modes:** Hide in existing images (not random noise)
6. **Time-Lock Puzzles:** Payload accessible only after computation delay
7. **Metadata Encryption:** Encrypt metadata itself with separate key

### Non-Goals (Intentionally Excluded)

- ❌ Server-side key storage
- ❌ Public-key cryptography
- ❌ Blockchain integration
- ❌ GDPR compliance
- ❌ Production-grade security
- ❌ Formal verification

---

## 📚 REFERENCES & INSPIRATION

- **Steganography:** LSB embedding, DCT coefficient modification
- **Obfuscation Techniques:** White-box crypto, code obfuscation
- **ARG Design:** Cicada 3301, Perplex City, I Love Bees
- **Experimental Crypto:** Malbolge, esoteric programming languages

---

## ✅ FINAL NOTES

### Use Cases

✅ **Alternate Reality Games (ARGs)**  
✅ **Interactive Fiction**  
✅ **Educational Demonstrations**  
✅ **Creative Writing Projects**  
✅ **Prototype Testing**  

### Non-Use Cases

❌ **Financial Transactions**  
❌ **Healthcare Records**  
❌ **Legal Documents**  
❌ **Government Communications**  
❌ **Anything Requiring Real Security**

### License

This is experimental educational code. Use at your own risk. No warranty provided.

---

**Version:** 3.0  
**Author:** TSM-Blake Project  
**Date:** December 2025  
**Status:** Experimental Prototype

