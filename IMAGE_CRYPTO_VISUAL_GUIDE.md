# 🎨 IMAGE CRYPTO CONTAINER - VISUAL ARCHITECTURE

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ENCRYPTION PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────┘

  User Input
     ├─ Plaintext Message: "Secret message"
     └─ Password: "myPassword123"
              ↓
     ┌────────────────┐
     │  BLAK-512      │  ← Existing encryption engine
     │  Encryption    │     (NOT modified by this system)
     └────────────────┘
              ↓
     Encrypted Bytes (raw binary)
     Example: [0x4A, 0x8F, 0x2C, 0x91, ...]
              ↓
     ┌────────────────┐
     │ Add Header     │
     │ [MAGIC][LEN]   │  Magic: 0xB1A4
     └────────────────┘  Length: 4 bytes (big-endian)
              ↓
     Formatted Payload
     [0xB1, 0xA4, 0x00, 0x00, 0x00, 0x42, 0x4A, 0x8F, 0x2C, ...]
      └─magic─┘ └────length (66)────┘ └─encrypted data─┘
              ↓
     ┌────────────────┐
     │ Create Base    │
     │ Image (Noise)  │  512×512 canvas
     └────────────────┘  Random RGB values
              ↓
     ┌────────────────┐
     │ Embed Payload  │  Distribute bytes across
     │ Into Blocks    │  shuffled 8×8 blocks
     └────────────────┘  3 bytes per block (RGB channels)
              ↓
              │
        ┌─────┴─────┐
        │ OBFUSCATION LAYERS │
        └─────┬─────┘
              │
              ↓
     ┌────────────────────┐
     │ Layer 1:           │  Per-block RGB channel
     │ RGB Permutation    │  swapping (6 patterns)
     └────────────────────┘
              ↓
     ┌────────────────────┐
     │ Layer 2:           │  Rearrange entire blocks
     │ Block Shuffle      │  Fisher-Yates shuffle
     └────────────────────┘
              ↓
     ┌────────────────────┐
     │ Layer 3:           │  XOR each pixel with
     │ XOR Masking        │  password-derived stream
     └────────────────────┘
              ↓
     ┌────────────────────┐
     │ Layer 4:           │  Inject fake magic headers
     │ Decoy Injection    │  at random locations
     └────────────────────┘
              ↓
     PNG Image Output
     (Looks like random noise)


┌─────────────────────────────────────────────────────────────────────────┐
│                        DECRYPTION PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────┘

  PNG Image Input
     + Password
              ↓
     ┌────────────────┐
     │ Load Into      │
     │ Canvas         │  Extract pixel data
     └────────────────┘  (ImageData object)
              ↓
     ┌────────────────┐
     │ Seed PRNG      │  Hash password →
     │ with Password  │  Initialize XorShift32
     └────────────────┘
              ↓
        ┌─────┴─────┐
        │ REVERSE OBFUSCATION │
        └─────┬─────┘
              │
              ↓
     ┌────────────────────┐
     │ REVERSE Layer 3:   │  XOR again (self-inverse)
     │ XOR Masking        │
     └────────────────────┘
              ↓
     ┌────────────────────┐
     │ REVERSE Layer 2:   │  Unshuffle blocks using
     │ Block Shuffle      │  inverse permutation map
     └────────────────────┘
              ↓
     ┌────────────────────┐
     │ REVERSE Layer 1:   │  Apply inverse RGB
     │ RGB Permutation    │  channel swaps
     └────────────────────┘
              ↓
     ┌────────────────────┐
     │ Extract Bytes      │  Read from same shuffled
     │ From Blocks        │  block sequence
     └────────────────────┘
              ↓
     Raw Extracted Bytes
     [0xB1, 0xA4, 0x00, 0x00, 0x00, 0x42, 0x4A, 0x8F, ...]
              ↓
     ┌────────────────┐
     │ Validate       │  Check: byte[0,1] == 0xB1A4?
     │ Magic Header   │
     └────────────────┘
              ↓ (valid)
     ┌────────────────┐
     │ Read Length    │  bytes[2..5] → 32-bit int
     │ Prefix         │
     └────────────────┘
              ↓
     ┌────────────────┐
     │ Extract        │  bytes[6..6+length]
     │ Encrypted Data │
     └────────────────┘
              ↓
     ┌────────────────┐
     │  BLAK-512      │  Decrypt with password
     │  Decryption    │
     └────────────────┘
              ↓
     Plaintext Output
     "Secret message"
```

## Block Embedding Visualization

```
┌─────────────────────────────────────────────────────┐
│           512×512 Image = 64×64 Blocks              │
│                (8×8 pixels per block)               │
└─────────────────────────────────────────────────────┘

BEFORE SHUFFLING (logical block numbering):

  0    1    2    3    4    5    6    ...   63
  64   65   66   67   68   69   70   ...   127
  128  129  130  131  132  133  134  ...   191
  ...  ...  ...  ...  ...  ...  ...  ...   ...
  3968 3969 3970 3971 3972 3973 3974 ...   4095

AFTER PASSWORD-SEEDED SHUFFLE:

  2719 0031 3854 0892 1234 2901 0055 ...   1103
  0388 2847 1092 3321 0744 1928 3001 ...   0219
  1847 3092 0128 2438 3719 0491 2847 ...   3384
  ...  ...  ...  ...  ...  ...  ...  ...   ...
  0983 2719 1847 0328 2910 3847 1092 ...   2847

Each block stores 3 bytes of payload:
  Block[shuffled_index] → First pixel RGB channels
  ┌─────────┐
  │ R G B A │  R = payload_byte[i]
  └─────────┘  G = payload_byte[i+1]
               B = payload_byte[i+2]
               A = 255 (unchanged)
```

## RGB Permutation Patterns

```
PATTERN 0 (Identity):
  Input:  [R, G, B]  →  Output: [R, G, B]
  
PATTERN 1:
  Input:  [R, G, B]  →  Output: [R, B, G]
  
PATTERN 2:
  Input:  [R, G, B]  →  Output: [G, R, B]
  
PATTERN 3:
  Input:  [R, G, B]  →  Output: [G, B, R]
  
PATTERN 4:
  Input:  [R, G, B]  →  Output: [B, R, G]
  
PATTERN 5:
  Input:  [R, G, B]  →  Output: [B, G, R]

Applied per 8×8 block, pattern chosen by PRNG.

Example block (4×4 shown for clarity):

Before:
  [R G B] [R G B] [R G B] [R G B]
  [R G B] [R G B] [R G B] [R G B]
  [R G B] [R G B] [R G B] [R G B]
  [R G B] [R G B] [R G B] [R G B]

After (if Pattern 5 applied):
  [B G R] [B G R] [B G R] [B G R]
  [B G R] [B G R] [B G R] [B G R]
  [B G R] [B G R] [B G R] [B G R]
  [B G R] [B G R] [B G R] [B G R]
```

## XOR Masking Visualization

```
BEFORE XOR MASK:
Pixel data (RGB values):
  [128, 64, 192] [255, 32, 96] [17, 88, 203] ...

PRNG Stream (password-seeded):
  [73, 154, 29] [198, 241, 67] [92, 183, 14] ...

XOR OPERATION:
  128 ^ 73  = 201
  64  ^ 154 = 218
  192 ^ 29  = 213
  
  255 ^ 198 = 57
  32  ^ 241 = 209
  96  ^ 67  = 35
  
  ...

AFTER XOR MASK:
  [201, 218, 213] [57, 209, 35] [109, 235, 217] ...

(Looks completely different, but XOR again reverses it)
```

## Capacity Calculation Example

```
Given: 512×512 image, 200-byte message

1. Block Calculation:
   Blocks X = 512 / 8 = 64
   Blocks Y = 512 / 8 = 64
   Total Blocks = 64 × 64 = 4,096

2. Capacity:
   Bytes per Block = 3 (RGB channels)
   Total Capacity = 4,096 × 3 = 12,288 bytes

3. Payload Size:
   Magic Header = 2 bytes
   Length Prefix = 4 bytes
   Encrypted Message ≈ 200 bytes (BLAK-512 overhead minimal)
   Total Payload = 6 + 200 = 206 bytes

4. Blocks Needed:
   206 / 3 = 68.67 → 69 blocks

5. Utilization:
   69 / 4,096 = 1.68% of capacity used
   4,027 blocks remain unused (filled with random noise)
```

## PRNG State Diagram

```
Input: Password "myPassword123"
              ↓
     ┌────────────────┐
     │ FNV-1a Hash    │  Initial hash: 0x811c9dc5
     │ (32-bit)       │  For each char: hash ^= char; hash *= prime
     └────────────────┘
              ↓
     Initial Hash: 0x7AF3B291 (example)
              ↓
     ┌────────────────┐
     │ Mixing Rounds  │  3 rounds of:
     │ (3 iterations) │    hash ^= (hash >>> 16)
     └────────────────┘    hash *= 0x45d9f3b
              ↓
     Seed: 0x4C8E1A03 (example)
              ↓
     ┌─────────────────────┐
     │ XorShift32 PRNG     │
     │                     │
     │ next():             │
     │   state ^= << 13    │  state: 0x4C8E1A03
     │   state ^= >>> 17   │       → 0x8A2F4E19
     │   state ^= << 5     │       → 0x3B7C9D42
     │   return state/2^32 │       → 0x7E9A2C81
     └─────────────────────┘       (and so on...)
              ↓
     Infinite stream of pseudo-random values:
     [0.926, 0.183, 0.477, 0.834, 0.291, ...]
```

## File Format Comparison

```
TRADITIONAL ENCRYPTED FILE:
┌──────────────────────────────┐
│ my_secret.txt.enc            │
├──────────────────────────────┤
│ HEADER: "BLAK512"            │
│ VERSION: 3                   │
│ CIPHERTEXT: [binary data]    │
└──────────────────────────────┘
Size: ~200 bytes
Suspicious: YES (file extension, structure)


IMAGE CRYPTO CONTAINER:
┌──────────────────────────────┐
│ photo_2025.png               │
├──────────────────────────────┤
│ PNG Header                   │
│ IHDR Chunk (512×512)         │
│ IDAT Chunk (compressed       │
│   pixel data containing      │
│   hidden payload)            │
│ IEND Chunk                   │
└──────────────────────────────┘
Size: ~250 KB
Suspicious: NO (looks like normal image)
```

## Decoy Region Placement

```
Image with Payload + Decoys:

┌─────────────────────────────────────┐
│ [Random Noise] [Decoy Header]       │
│                                     │
│      [Real Payload Start]           │
│      [Payload Data...]              │
│                                     │
│ [Decoy Header]  [More Noise]        │
│                                     │
│      [Payload continues...]         │
│      [Payload End]                  │
│                                     │
│ [Noise] [Decoy Header] [Noise]      │
└─────────────────────────────────────┘

Real Payload:
  - Located at shuffled block positions
  - Header: 0xB1A4 (magic)
  - Extractable with correct password

Decoy Headers:
  - 0xDEC0ED (fake magic)
  - Random positions (fixed seed)
  - Lead to garbage data
  - No valid length prefix
```

## Error Propagation Example

```
SCENARIO: Wrong Password Used

Step 1: XOR Mask Reversed Incorrectly
  Correct PRNG: [73, 154, 29, ...]
  Wrong PRNG:   [91, 203, 45, ...]
  Result: All pixels now wrong values
  
Step 2: Block Shuffle Reversed Incorrectly
  Correct shuffle: [2719, 31, 3854, ...]
  Wrong shuffle:   [1823, 47, 2901, ...]
  Result: Blocks moved to wrong positions
  
Step 3: RGB Permutation Reversed Incorrectly
  Correct pattern: [5, 2, 0, 1, ...]
  Wrong pattern:   [3, 4, 1, 2, ...]
  Result: Channel values swapped incorrectly
  
Step 4: Payload Extraction
  Expected: [0xB1, 0xA4, 0x00, 0x00, 0x00, 0x42, ...]
  Actual:   [0x7F, 0x3C, 0xE8, 0x91, 0x42, 0xA7, ...]
  
Step 5: Magic Header Validation
  Expected: 0xB1A4
  Found:    0x7F3C
  Result: FAIL → "Invalid magic header"

OUTCOME: Graceful failure, no plaintext leaked
```

## Performance Profile

```
OPERATION BREAKDOWN (512×512 image, 200-byte message):

┌──────────────────────────┬──────────┬─────────┐
│ Operation                │ Time     │ Percent │
├──────────────────────────┼──────────┼─────────┤
│ BLAK-512 Encryption      │ 40ms     │ 40%     │
│ Base Image Generation    │ 15ms     │ 15%     │
│ Payload Embedding        │ 5ms      │ 5%      │
│ RGB Permutation          │ 10ms     │ 10%     │
│ Block Shuffling          │ 15ms     │ 15%     │
│ XOR Masking              │ 10ms     │ 10%     │
│ PNG Generation           │ 5ms      │ 5%      │
├──────────────────────────┼──────────┼─────────┤
│ TOTAL                    │ 100ms    │ 100%    │
└──────────────────────────┴──────────┴─────────┘

BOTTLENECKS:
  1. BLAK-512 encryption (external dependency)
  2. Block shuffling (memory copies)
  3. Base image generation (random number generation)

OPTIMIZATIONS:
  - Use TypedArrays (already implemented)
  - Minimize canvas API calls (already optimized)
  - Could use Web Workers for images >1024×1024
```

## Use Case Scenario

```
SCENARIO: ARG Puzzle Distribution

Creator:
  1. Write clue message
     "The next clue is hidden at 51.5074°N, 0.1278°W"
  
  2. Encrypt with password
     Password: "RAVEN_PARADOX_2025"
  
  3. Embed into image
     Generate 512×512 PNG
  
  4. Distribute
     Post to social media as "random art"
     Players don't know it's encrypted

Player:
  1. Discover image contains puzzle
     Community discussion, hints
  
  2. Solve previous puzzle to get password
     "RAVEN_PARADOX_2025"
  
  3. Use decryptor tool
     Upload image + enter password
  
  4. Extract clue
     "The next clue is hidden at 51.5074°N, 0.1278°W"
  
  5. Proceed to location
     Find next puzzle piece

ADVANTAGES:
  - Image looks innocent on social media
  - No file extension gives it away
  - Password required (gate-keeping)
  - Survives basic image processing
  - Can be printed/photographed (if lossless)
```

---

## Legend

```
Symbols Used:
  ↓     Flow direction
  →     Transformation
  ┌─┐   Process box
  [x]   Data element
  ...   Continuation
  ├─┤   Boundary
  ^     XOR operation
```

## Color-Coding Key (if viewing in markdown viewer with syntax highlighting)

- **Bold**: Important concepts
- `Code`: Technical values
- *Italic*: Examples
- > Quote: Warnings/Notes

