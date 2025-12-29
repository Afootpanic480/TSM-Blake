/**
 * ImageCryptoContainer.js
 * 
 * EXPERIMENTAL IMAGE-BASED ENCRYPTION CONTAINER
 * NOT FOR PRODUCTION - INTENTIONALLY WEIRD & LAYERED
 * 
 * Purpose: Transform BLAK-512 encrypted bytes into pixel-embedded payloads
 * with multiple obfuscation layers, decoys, and hostile-to-analysis design.
 * 
 * Architecture:
 * 1. Encrypted bytes → Pixel embedding (block-based)
 * 2. Apply obfuscation layers (RGB permutation, shuffling, XOR masking)
 * 3. Add decoy regions and metadata
 * 4. Generate deterministic extraction map from password
 * 
 * Threat Model: Attacker can see everything, but layers slow analysis
 */

const ImageCryptoContainer = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION & CONSTANTS
    // ═══════════════════════════════════════════════════════════════

    const CONFIG = {
        VERSION: 3,
        ALGORITHM: 'BLAK512',
        DEFAULT_WIDTH: 512,
        DEFAULT_HEIGHT: 512,
        BLOCK_SIZE: 8,              // 8x8 pixel blocks
        MAGIC_HEADER: 0xB1A4,       // First 2 bytes of payload
        DECOY_REGIONS: 3,           // Number of fake payload regions
        MIN_IMAGE_SIZE: 256         // Minimum dimension
    };

    const METADATA_TEMPLATE = {
        ALG: 'BLAK512',
        VER: 3,
        PAYLOAD: 'PIXELS',
        MAP: 'BLOCK_SHUFFLE',
        BLOCK: 8,
        SEED_MODE: 'PASSWORD_HASH',
        DECOY: true,
        CHANNELS: 'RGB_PERMUTE'
    };

    // ═══════════════════════════════════════════════════════════════
    // DETERMINISTIC PRNG (Password-Seeded)
    // ═══════════════════════════════════════════════════════════════

    class SeededPRNG {
        constructor(password) {
            // Generate seed from password using multiple hashing rounds
            this.state = this._hashPassword(password);
        }

        _hashPassword(password) {
            let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
            for (let i = 0; i < password.length; i++) {
                hash ^= password.charCodeAt(i);
                hash = Math.imul(hash, 0x01000193); // FNV-1a prime
            }
            // Additional rounds with different constants
            for (let round = 0; round < 3; round++) {
                hash ^= (hash >>> 16);
                hash = Math.imul(hash, 0x45d9f3b);
                hash ^= (hash >>> 16);
            }
            return hash >>> 0; // Ensure unsigned
        }

        next() {
            // XorShift32
            this.state ^= this.state << 13;
            this.state ^= this.state >>> 17;
            this.state ^= this.state << 5;
            return (this.state >>> 0) / 0x100000000;
        }

        nextInt(max) {
            return Math.floor(this.next() * max);
        }

        nextByte() {
            return this.nextInt(256);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PAYLOAD EMBEDDING CORE
    // ═══════════════════════════════════════════════════════════════

    function embedPayloadIntoImage(encryptedBytes, password, options = {}) {
        const width = options.width || CONFIG.DEFAULT_WIDTH;
        const height = options.height || CONFIG.DEFAULT_HEIGHT;
        const canvas = options.canvas || document.createElement('canvas');
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Step 1: Create base image (random noise or pattern)
        const imageData = ctx.createImageData(width, height);
        const prng = new SeededPRNG(password);
        _fillBaseImage(imageData, prng);

        // Step 2: Prepare payload with length prefix and magic header
        const payload = _preparePayload(encryptedBytes);
        
        // Step 3: Embed payload into pixels using block-based strategy
        _embedPayloadBlocks(imageData, payload, prng, width, height);
        
        // Step 4: Apply obfuscation layers
        _applyRGBPermutation(imageData, prng);
        _applyBlockShuffle(imageData, prng, width, height);
        _applyXORMask(imageData, prng, password);
        
        // Step 5: Add decoy regions
        _embedDecoyRegions(imageData, prng, CONFIG.DECOY_REGIONS);
        
        // Commit to canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Step 6: Attach metadata (as PNG chunk or image description)
        const metadata = { ...METADATA_TEMPLATE };
        
        return {
            canvas: canvas,
            imageData: imageData,
            metadata: metadata,
            dataURL: canvas.toDataURL('image/png'),
            blob: null // Will be set async
        };
    }

    function _fillBaseImage(imageData, prng) {
        // Fill with pseudo-random noise (aesthetic + cover)
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = prng.nextByte();       // R
            data[i + 1] = prng.nextByte();   // G
            data[i + 2] = prng.nextByte();   // B
            data[i + 3] = 255;                // A (opaque)
        }
    }

    function _preparePayload(encryptedBytes) {
        // Format: [MAGIC(2)] [LENGTH(4)] [DATA(...)]
        const magic = new Uint8Array([
            (CONFIG.MAGIC_HEADER >> 8) & 0xFF,
            CONFIG.MAGIC_HEADER & 0xFF
        ]);
        
        const length = new Uint8Array(4);
        const len = encryptedBytes.length;
        length[0] = (len >>> 24) & 0xFF;
        length[1] = (len >>> 16) & 0xFF;
        length[2] = (len >>> 8) & 0xFF;
        length[3] = len & 0xFF;
        
        const payload = new Uint8Array(6 + encryptedBytes.length);
        payload.set(magic, 0);
        payload.set(length, 2);
        payload.set(encryptedBytes, 6);
        
        return payload;
    }

    function _embedPayloadBlocks(imageData, payload, prng, width, height) {
        const data = imageData.data;
        const blockSize = CONFIG.BLOCK_SIZE;
        const blocksX = Math.floor(width / blockSize);
        const blocksY = Math.floor(height / blockSize);
        const totalBlocks = blocksX * blocksY;
        
        // Generate shuffled block indices
        const blockIndices = [];
        for (let i = 0; i < totalBlocks; i++) {
            blockIndices.push(i);
        }
        _shuffleArray(blockIndices, prng);
        
        // Embed payload bytes across blocks
        let payloadIndex = 0;
        let blockIndex = 0;
        
        while (payloadIndex < payload.length && blockIndex < blockIndices.length) {
            const shuffledBlock = blockIndices[blockIndex];
            const blockX = (shuffledBlock % blocksX) * blockSize;
            const blockY = Math.floor(shuffledBlock / blocksX) * blockSize;
            
            // Embed 3 bytes per block (one in each RGB channel of first pixel)
            const pixelIndex = (blockY * width + blockX) * 4;
            
            if (payloadIndex < payload.length) {
                data[pixelIndex] ^= payload[payloadIndex++];     // R channel
            }
            if (payloadIndex < payload.length) {
                data[pixelIndex + 1] ^= payload[payloadIndex++]; // G channel
            }
            if (payloadIndex < payload.length) {
                data[pixelIndex + 2] ^= payload[payloadIndex++]; // B channel
            }
            
            blockIndex++;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // OBFUSCATION LAYERS
    // ═══════════════════════════════════════════════════════════════

    function _applyRGBPermutation(imageData, prng) {
        // Permute RGB channels deterministically per block
        const data = imageData.data;
        const blockSize = CONFIG.BLOCK_SIZE;
        const width = imageData.width;
        const height = imageData.height;
        
        for (let by = 0; by < height; by += blockSize) {
            for (let bx = 0; bx < width; bx += blockSize) {
                const perm = prng.nextInt(6); // 6 possible RGB permutations
                
                for (let dy = 0; dy < blockSize && (by + dy) < height; dy++) {
                    for (let dx = 0; dx < blockSize && (bx + dx) < width; dx++) {
                        const idx = ((by + dy) * width + (bx + dx)) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];
                        
                        // Apply permutation
                        switch (perm) {
                            case 0: break; // RGB
                            case 1: data[idx] = r; data[idx+1] = b; data[idx+2] = g; break; // RBG
                            case 2: data[idx] = g; data[idx+1] = r; data[idx+2] = b; break; // GRB
                            case 3: data[idx] = g; data[idx+1] = b; data[idx+2] = r; break; // GBR
                            case 4: data[idx] = b; data[idx+1] = r; data[idx+2] = g; break; // BRG
                            case 5: data[idx] = b; data[idx+1] = g; data[idx+2] = r; break; // BGR
                        }
                    }
                }
            }
        }
    }

    function _applyBlockShuffle(imageData, prng, width, height) {
        // Shuffle pixel blocks in a reversible way
        const blockSize = CONFIG.BLOCK_SIZE;
        const blocksX = Math.floor(width / blockSize);
        const blocksY = Math.floor(height / blockSize);
        
        // Create block index map
        const blocks = [];
        for (let i = 0; i < blocksX * blocksY; i++) {
            blocks.push(i);
        }
        
        // Shuffle using Fisher-Yates with seeded PRNG
        _shuffleArray(blocks, prng);
        
        // Copy image data
        const original = new Uint8ClampedArray(imageData.data);
        const data = imageData.data;
        
        // Rearrange blocks
        for (let destIdx = 0; destIdx < blocks.length; destIdx++) {
            const srcIdx = blocks[destIdx];
            const srcX = (srcIdx % blocksX) * blockSize;
            const srcY = Math.floor(srcIdx / blocksX) * blockSize;
            const destX = (destIdx % blocksX) * blockSize;
            const destY = Math.floor(destIdx / blocksX) * blockSize;
            
            // Copy block
            for (let dy = 0; dy < blockSize; dy++) {
                for (let dx = 0; dx < blockSize; dx++) {
                    const srcPixelIdx = ((srcY + dy) * width + (srcX + dx)) * 4;
                    const destPixelIdx = ((destY + dy) * width + (destX + dx)) * 4;
                    
                    data[destPixelIdx] = original[srcPixelIdx];
                    data[destPixelIdx + 1] = original[srcPixelIdx + 1];
                    data[destPixelIdx + 2] = original[srcPixelIdx + 2];
                    data[destPixelIdx + 3] = original[srcPixelIdx + 3];
                }
            }
        }
    }

    function _applyXORMask(imageData, prng, password) {
        // XOR each pixel with a password-derived mask
        const data = imageData.data;
        const mask = new SeededPRNG(password + ':XOR_MASK');
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] ^= mask.nextByte();       // R
            data[i + 1] ^= mask.nextByte();   // G
            data[i + 2] ^= mask.nextByte();   // B
            // Skip alpha
        }
    }

    function _embedDecoyRegions(imageData, prng, count) {
        // Embed fake "magic headers" at random locations
        const data = imageData.data;
        const decoyPRNG = new SeededPRNG('DECOY_SEED');
        
        for (let i = 0; i < count; i++) {
            const pos = decoyPRNG.nextInt(data.length / 4) * 4;
            data[pos] ^= 0xDE;       // Fake magic bytes
            data[pos + 1] ^= 0xC0;
            data[pos + 2] ^= 0xED;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PAYLOAD EXTRACTION & DEOBFUSCATION
    // ═══════════════════════════════════════════════════════════════

    function extractPayloadFromImage(imageSource, password) {
        // Load image into canvas
        const { canvas, imageData } = _loadImageToCanvas(imageSource);
        const width = canvas.width;
        const height = canvas.height;
        
        // Initialize PRNG with same password
        const prng = new SeededPRNG(password);
        
        // Create working copy
        const workingData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            width,
            height
        );
        
        // REVERSE obfuscation layers in OPPOSITE order
        _reverseXORMask(workingData, prng, password);
        _reverseBlockShuffle(workingData, prng, width, height);
        _reverseRGBPermutation(workingData, prng);
        
        // Extract payload from blocks
        const payload = _extractPayloadBlocks(workingData, prng, width, height);
        
        if (!payload) {
            return { success: false, error: 'Failed to locate payload' };
        }
        
        // Validate magic header
        if (payload.length < 6 ||
            payload[0] !== ((CONFIG.MAGIC_HEADER >> 8) & 0xFF) ||
            payload[1] !== (CONFIG.MAGIC_HEADER & 0xFF)) {
            return { success: false, error: 'Invalid magic header' };
        }
        
        // Extract length
        const length = (payload[2] << 24) | (payload[3] << 16) | 
                      (payload[4] << 8) | payload[5];
        
        if (length + 6 > payload.length) {
            return { success: false, error: 'Invalid payload length' };
        }
        
        // Extract encrypted bytes
        const encryptedBytes = payload.slice(6, 6 + length);
        
        return {
            success: true,
            encryptedBytes: encryptedBytes,
            length: length
        };
    }

    function _loadImageToCanvas(imageSource) {
        let canvas, ctx;
        
        if (imageSource instanceof HTMLCanvasElement) {
            canvas = imageSource;
            ctx = canvas.getContext('2d');
        } else if (imageSource instanceof HTMLImageElement) {
            canvas = document.createElement('canvas');
            canvas.width = imageSource.width;
            canvas.height = imageSource.height;
            ctx = canvas.getContext('2d');
            ctx.drawImage(imageSource, 0, 0);
        } else {
            throw new Error('Invalid image source');
        }
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return { canvas, imageData };
    }

    function _reverseXORMask(imageData, prng, password) {
        // XOR is self-reversing
        _applyXORMask(imageData, prng, password);
    }

    function _reverseBlockShuffle(imageData, prng, width, height) {
        const blockSize = CONFIG.BLOCK_SIZE;
        const blocksX = Math.floor(width / blockSize);
        const blocksY = Math.floor(height / blockSize);
        
        // Generate same shuffle sequence
        const blocks = [];
        for (let i = 0; i < blocksX * blocksY; i++) {
            blocks.push(i);
        }
        _shuffleArray(blocks, prng);
        
        // Create inverse mapping
        const inverse = new Array(blocks.length);
        for (let i = 0; i < blocks.length; i++) {
            inverse[blocks[i]] = i;
        }
        
        // Copy and unshuffle
        const original = new Uint8ClampedArray(imageData.data);
        const data = imageData.data;
        
        for (let srcIdx = 0; srcIdx < inverse.length; srcIdx++) {
            const destIdx = inverse[srcIdx];
            const srcX = (srcIdx % blocksX) * blockSize;
            const srcY = Math.floor(srcIdx / blocksX) * blockSize;
            const destX = (destIdx % blocksX) * blockSize;
            const destY = Math.floor(destIdx / blocksX) * blockSize;
            
            for (let dy = 0; dy < blockSize; dy++) {
                for (let dx = 0; dx < blockSize; dx++) {
                    const srcPixelIdx = ((srcY + dy) * width + (srcX + dx)) * 4;
                    const destPixelIdx = ((destY + dy) * width + (destX + dx)) * 4;
                    
                    data[destPixelIdx] = original[srcPixelIdx];
                    data[destPixelIdx + 1] = original[srcPixelIdx + 1];
                    data[destPixelIdx + 2] = original[srcPixelIdx + 2];
                    data[destPixelIdx + 3] = original[srcPixelIdx + 3];
                }
            }
        }
    }

    function _reverseRGBPermutation(imageData, prng) {
        // Apply same permutations (they're self-reversing when applied twice)
        // But we need to generate the REVERSE permutation
        const data = imageData.data;
        const blockSize = CONFIG.BLOCK_SIZE;
        const width = imageData.width;
        const height = imageData.height;
        
        for (let by = 0; by < height; by += blockSize) {
            for (let bx = 0; bx < width; bx += blockSize) {
                const perm = prng.nextInt(6);
                
                // Reverse permutation mapping
                const reversePerms = [0, 1, 2, 4, 3, 5]; // Inverse of each permutation
                const reversePerm = reversePerms[perm];
                
                for (let dy = 0; dy < blockSize && (by + dy) < height; dy++) {
                    for (let dx = 0; dx < blockSize && (bx + dx) < width; dx++) {
                        const idx = ((by + dy) * width + (bx + dx)) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];
                        
                        switch (reversePerm) {
                            case 0: break;
                            case 1: data[idx] = r; data[idx+1] = b; data[idx+2] = g; break;
                            case 2: data[idx] = g; data[idx+1] = r; data[idx+2] = b; break;
                            case 3: data[idx] = b; data[idx+1] = g; data[idx+2] = r; break;
                            case 4: data[idx] = g; data[idx+1] = b; data[idx+2] = r; break;
                            case 5: data[idx] = b; data[idx+1] = r; data[idx+2] = g; break;
                        }
                    }
                }
            }
        }
    }

    function _extractPayloadBlocks(imageData, prng, width, height) {
        const data = imageData.data;
        const blockSize = CONFIG.BLOCK_SIZE;
        const blocksX = Math.floor(width / blockSize);
        const blocksY = Math.floor(height / blockSize);
        const totalBlocks = blocksX * blocksY;
        
        // Generate same shuffled block indices
        const blockIndices = [];
        for (let i = 0; i < totalBlocks; i++) {
            blockIndices.push(i);
        }
        _shuffleArray(blockIndices, prng);
        
        // Extract bytes
        const extracted = [];
        let blockIndex = 0;
        
        // First, determine payload size (try to extract header)
        const maxBytes = totalBlocks * 3; // 3 bytes per block
        
        for (blockIndex = 0; blockIndex < blockIndices.length && extracted.length < maxBytes; blockIndex++) {
            const shuffledBlock = blockIndices[blockIndex];
            const blockX = (shuffledBlock % blocksX) * blockSize;
            const blockY = Math.floor(shuffledBlock / blocksX) * blockSize;
            
            const pixelIndex = (blockY * width + blockX) * 4;
            
            // Extract using XOR (reverses the embedding XOR)
            const basePRNG = new SeededPRNG(prng.state.toString());
            extracted.push(data[pixelIndex] ^ basePRNG.nextByte());
            extracted.push(data[pixelIndex + 1] ^ basePRNG.nextByte());
            extracted.push(data[pixelIndex + 2] ^ basePRNG.nextByte());
            
            // Early termination if we have header
            if (extracted.length >= 6) {
                const len = (extracted[2] << 24) | (extracted[3] << 16) | 
                           (extracted[4] << 8) | extracted[5];
                if (len > 0 && len < 10000000 && extracted.length >= len + 6) {
                    break;
                }
            }
        }
        
        return new Uint8Array(extracted);
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════

    function _shuffleArray(array, prng) {
        // Fisher-Yates shuffle with seeded PRNG
        for (let i = array.length - 1; i > 0; i--) {
            const j = prng.nextInt(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HIGH-LEVEL API
    // ═══════════════════════════════════════════════════════════════

    /**
     * Encrypt message and embed into image
     * @param {string} plaintext - Message to encrypt
     * @param {string} password - Password for encryption
     * @param {object} options - Configuration options
     * @returns {object} Image container result
     */
    async function encryptToImage(plaintext, password, options = {}) {
        // Step 1: Encrypt with BLAK-512 (assumes BLAK512Core is available)
        if (typeof BLAK512Core === 'undefined') {
            throw new Error('BLAK512Core not loaded');
        }
        
        const encrypted = BLAK512Core.encrypt(plaintext, password);
        const encryptedBytes = new TextEncoder().encode(encrypted);
        
        // Step 2: Embed into image
        const container = embedPayloadIntoImage(encryptedBytes, password, options);
        
        // Step 3: Generate blob
        container.blob = await new Promise(resolve => {
            container.canvas.toBlob(blob => resolve(blob), 'image/png');
        });
        
        return container;
    }

    /**
     * Extract and decrypt message from image
     * @param {HTMLImageElement|HTMLCanvasElement|File} imageSource - Image containing payload
     * @param {string} password - Password for decryption
     * @returns {object} Decryption result
     */
    async function decryptFromImage(imageSource, password) {
        // Handle File input
        if (imageSource instanceof File || imageSource instanceof Blob) {
            const img = await _loadImageFromFile(imageSource);
            imageSource = img;
        }
        
        // Step 1: Extract encrypted bytes
        const extraction = extractPayloadFromImage(imageSource, password);
        
        if (!extraction.success) {
            return { success: false, error: extraction.error };
        }
        
        // Step 2: Decrypt with BLAK-512
        if (typeof BLAK512Core === 'undefined') {
            throw new Error('BLAK512Core not loaded');
        }
        
        const encryptedString = new TextDecoder().decode(extraction.encryptedBytes);
        
        try {
            const plaintext = BLAK512Core.decrypt(encryptedString, password);
            return { success: true, plaintext: plaintext };
        } catch (error) {
            return { success: false, error: 'Decryption failed' };
        }
    }

    function _loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORTS
    // ═══════════════════════════════════════════════════════════════

    return {
        // High-level API
        encryptToImage,
        decryptFromImage,
        
        // Low-level components
        embedPayloadIntoImage,
        extractPayloadFromImage,
        
        // Utilities
        SeededPRNG,
        
        // Constants
        CONFIG,
        METADATA_TEMPLATE
    };

})();

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageCryptoContainer;
}
