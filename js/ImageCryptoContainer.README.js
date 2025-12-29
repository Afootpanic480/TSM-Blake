/**
 * IMAGE CRYPTO CONTAINER - QUICK REFERENCE
 * =========================================
 * 
 * LAYER SUMMARY (Applied in order during encryption)
 * ===================================================
 * 
 * BASE IMAGE GENERATION
 *   ↓ Random noise fill (password-seeded PRNG)
 * 
 * PAYLOAD EMBEDDING
 *   ↓ Format: [MAGIC(2)] [LEN(4)] [DATA(N)]
 *   ↓ Distribute across shuffled 8×8 blocks
 *   ↓ 3 bytes per block (RGB channels, first pixel)
 * 
 * OBFUSCATION LAYER 1: RGB Permutation
 *   ↓ Per-block channel swapping (6 patterns)
 *   ↓ Deterministic based on PRNG state
 * 
 * OBFUSCATION LAYER 2: Block Shuffle
 *   ↓ Fisher-Yates shuffle of entire blocks
 *   ↓ Password-seeded, reversible
 * 
 * OBFUSCATION LAYER 3: XOR Mask
 *   ↓ Each pixel XORed with PRNG stream
 *   ↓ Separate PRNG instance (password + salt)
 * 
 * OBFUSCATION LAYER 4: Decoy Injection
 *   ↓ Fake magic headers at random locations
 *   ↓ Fixed seed for repeatability
 * 
 * OUTPUT: PNG Image
 * 
 * 
 * EXTRACTION (Reverse order)
 * ===========================
 * 
 * INPUT: PNG Image + Password
 *   ↓
 * REVERSE Layer 3: XOR Mask (XOR is self-inverse)
 *   ↓
 * REVERSE Layer 2: Block Shuffle (inverse permutation)
 *   ↓
 * REVERSE Layer 1: RGB Permutation (inverse swaps)
 *   ↓
 * EXTRACT from shuffled blocks
 *   ↓
 * VALIDATE magic header (0xB1A4)
 *   ↓
 * READ length prefix
 *   ↓
 * EXTRACT encrypted bytes
 *   ↓
 * BLAK-512 DECRYPT
 *   ↓
 * OUTPUT: Plaintext
 * 
 * 
 * CAPACITY FORMULA
 * ================
 * 
 * Blocks = (width / 8) × (height / 8)
 * Capacity = Blocks × 3 bytes
 * 
 * Examples:
 *   256×256  →  1,024 blocks → 3,072 bytes
 *   512×512  →  4,096 blocks → 12,288 bytes
 *   1024×1024 → 16,384 blocks → 49,152 bytes
 * 
 * 
 * PRNG ALGORITHM (XorShift32)
 * ============================
 * 
 * Seed = FNV-1a(password) + mixing rounds
 * 
 * next():
 *   state ^= state << 13
 *   state ^= state >>> 17
 *   state ^= state << 5
 *   return state / 2^32
 * 
 * Properties:
 *   - Deterministic (same password → same sequence)
 *   - Fast (bitwise ops only)
 *   - Period: 2^32 - 1
 *   - NOT cryptographically secure
 * 
 * 
 * RGB PERMUTATION PATTERNS
 * ========================
 * 
 * Pattern 0: RGB → RGB (identity)
 * Pattern 1: RGB → RBG
 * Pattern 2: RGB → GRB
 * Pattern 3: RGB → GBR
 * Pattern 4: RGB → BRG
 * Pattern 5: RGB → BGR
 * 
 * Inverse Patterns:
 *   0→0, 1→1, 2→2, 3→5, 4→4, 5→3
 * 
 * 
 * MAGIC HEADER
 * ============
 * 
 * Value: 0xB1A4 (chosen for "BLAK" phonetic resemblance)
 * Position: First 2 bytes of payload
 * Purpose: Validate successful extraction
 * 
 * Format:
 *   Byte 0: 0xB1 (177 decimal)
 *   Byte 1: 0xA4 (164 decimal)
 * 
 * 
 * FAILURE MODES
 * =============
 * 
 * 1. Wrong Password
 *    → XOR mask incorrect
 *    → Block shuffle reversed incorrectly
 *    → Extracted bytes are garbage
 *    → Magic header doesn't match
 *    → Return: "Failed to locate payload"
 * 
 * 2. Corrupted Image
 *    → Pixel values changed (JPEG, editing)
 *    → Extracted bytes wrong
 *    → Magic header fails OR length invalid
 *    → Return: "Invalid magic header" or "Invalid payload length"
 * 
 * 3. Not an Encrypted Container
 *    → Random image loaded
 *    → Extraction produces random bytes
 *    → Magic header fails
 *    → Return: "Failed to locate payload"
 * 
 * 4. Metadata Stripped
 *    → Extraction still works (metadata not required)
 *    → May be slower (no hints)
 * 
 * 5. Image Too Small
 *    → Detected during embedding
 *    → Throw error before image creation
 * 
 * 
 * SECURITY NOTES
 * ==============
 * 
 * THIS IS NOT SECURE CRYPTOGRAPHY!
 * 
 * Known Weaknesses:
 *   - PRNG is not cryptographically secure
 *   - Password hashing has no key stretching
 *   - Obfuscation ≠ Encryption
 *   - Algorithms visible in code
 *   - No authentication (MAC/HMAC)
 *   - Vulnerable to statistical analysis
 * 
 * Design Goals:
 *   - Slow down casual attackers
 *   - Provide plausible obfuscation
 *   - Enable creative ARG/fiction use
 *   - Be weird and interesting
 * 
 * NOT Goals:
 *   - Resist nation-state adversaries
 *   - Protect financial data
 *   - Meet any security standard
 *   - Be "correct" cryptography
 * 
 * 
 * IMPLEMENTATION CHECKLIST
 * ========================
 * 
 * Encoding:
 *   [✓] Generate base noise image
 *   [✓] Prepare payload (header + length + data)
 *   [✓] Generate shuffled block indices
 *   [✓] Embed payload into blocks (XOR into RGB)
 *   [✓] Apply RGB permutation
 *   [✓] Apply block shuffle
 *   [✓] Apply XOR mask
 *   [✓] Inject decoy headers
 *   [✓] Output PNG
 * 
 * Decoding:
 *   [✓] Load image into canvas
 *   [✓] Seed PRNG with password
 *   [✓] Reverse XOR mask
 *   [✓] Reverse block shuffle
 *   [✓] Reverse RGB permutation
 *   [✓] Generate same block shuffle sequence
 *   [✓] Extract bytes from blocks
 *   [✓] Validate magic header
 *   [✓] Read length
 *   [✓] Extract encrypted bytes
 *   [✓] Decrypt with BLAK-512
 * 
 * 
 * OPTIMIZATION TIPS
 * =================
 * 
 * Performance:
 *   - Use TypedArrays (Uint8Array) for pixel data
 *   - Pre-allocate arrays when size known
 *   - Minimize canvas getImageData/putImageData calls
 *   - Use bitwise ops instead of Math functions
 * 
 * Memory:
 *   - Clear large arrays after use
 *   - Don't keep multiple copies of image data
 *   - Use web workers for large images (>2048×2048)
 * 
 * Compatibility:
 *   - Test on mobile browsers (slower CPUs)
 *   - Verify canvas size limits (browser-dependent)
 *   - Check Blob API support for downloads
 * 
 * 
 * TESTING PROTOCOL
 * ================
 * 
 * 1. Unit Tests:
 *    - PRNG determinism (same password → same output)
 *    - Payload format (correct header, length encoding)
 *    - Each obfuscation layer (reversibility)
 *    - Block shuffling (inverse mapping correct)
 * 
 * 2. Integration Tests:
 *    - Round-trip (encrypt → embed → extract → decrypt)
 *    - Wrong password (should fail gracefully)
 *    - Partial corruption (some pixels changed)
 *    - File I/O (save PNG, reload, decrypt)
 * 
 * 3. Stress Tests:
 *    - Maximum capacity (fill all blocks)
 *    - Large images (2048×2048)
 *    - Long messages (10K+ characters)
 *    - Rapid repeated encryption/decryption
 * 
 * 4. Edge Cases:
 *    - Empty message
 *    - Single character
 *    - Unicode/emoji in message
 *    - Special characters in password
 *    - Very long passwords (>100 chars)
 * 
 * 
 * DEBUGGING TIPS
 * ==============
 * 
 * If extraction fails:
 * 
 * 1. Check PRNG State:
 *    - Same password?
 *    - PRNG producing same sequence?
 *    - Log first 10 values of PRNG
 * 
 * 2. Verify Magic Header:
 *    - What bytes are at position [0,1]?
 *    - Are they 0xB1, 0xA4?
 *    - If not, XOR or shuffle likely broken
 * 
 * 3. Test Individual Layers:
 *    - Skip XOR mask (comment out)
 *    - Skip block shuffle
 *    - Test RGB permutation alone
 *    - Isolate which layer fails
 * 
 * 4. Visualize Intermediate States:
 *    - Show canvas after each layer
 *    - Check if blocks are moving
 *    - Verify colors are changing
 * 
 * 5. Compare Byte Arrays:
 *    - Log original encrypted bytes
 *    - Log extracted bytes
 *    - Find first difference
 * 
 * 
 * COMMON PITFALLS
 * ===============
 * 
 * ❌ Forgetting to reverse layers in opposite order
 * ❌ Using same PRNG instance for multiple operations
 * ❌ Not handling alpha channel (keep at 255)
 * ❌ Image dimensions not divisible by block size
 * ❌ Saving as JPEG (lossy compression)
 * ❌ Not validating extracted length
 * ❌ Integer overflow in length encoding
 * ❌ Forgetting to XOR during extraction (not just embedding)
 * 
 * 
 * VERSION HISTORY
 * ===============
 * 
 * v3.0 (Current)
 *   - Multi-layer obfuscation system
 *   - Block-based embedding
 *   - Deterministic PRNG
 *   - Decoy regions
 *   - Full documentation
 * 
 * v2.x (Hypothetical previous versions)
 *   - Simple LSB embedding
 *   - No obfuscation
 * 
 * v1.x (Original concept)
 *   - Text-based encoding
 *   - No image container
 * 
 */

// This file is documentation only - no executable code
// See ImageCryptoContainer.js for implementation
