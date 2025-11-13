// !MODIFICATIONS TO THIS FILE WILL RESULT IN YOU LOSING ACCESS TO THE TOOL IF CAUGHT!
// BLA-512 Custom Encryption Core
// Proprietary encryption algorithm - DO NOT SHARE OR REVERSE ENGINEER

/**
 * BLA-512 (Blake's Layered Algorithm - 512 bit)
 * Custom encryption algorithm with multiple security layers:
 * - Custom S-boxes for substitution
 * - Proprietary key schedule
 * - Multiple encryption rounds (16 rounds)
 * - Custom mixing functions
 * - Unique permutation tables
 * - Feistel-based structure with custom F-function
 */

class BLA512 {
    constructor() {
        // Custom S-boxes (8 different 16x16 S-boxes for substitution)
        this.sboxes = this._generateCustomSBoxes();
        
        // Custom permutation table for bit shuffling
        this.permutationTable = this._generatePermutationTable();
        
        // Number of encryption rounds
        this.ROUNDS = 16;
        
        // Block size in bytes (512 bits = 64 bytes)
        this.BLOCK_SIZE = 64;
        
        // Tool identifier - used for validation
        this.TOOL_ID = 'BLA512_BLAKE_ENCRYPTOR_V4';
        
        // Custom constants for mixing
        this.MIXING_CONSTANTS = this._generateMixingConstants();
    }

    /**
     * Generate 8 custom S-boxes for substitution layer
     */
    _generateCustomSBoxes() {
        const sboxes = [];
        const seeds = [0x9B3F, 0x7E2A, 0x5D1C, 0x4B8E, 0x6F3D, 0x8A2B, 0x1E9F, 0x3C7D];
        
        for (let boxNum = 0; boxNum < 8; boxNum++) {
            const sbox = new Uint8Array(256);
            const values = Array.from({length: 256}, (_, i) => i);
            
            // Custom shuffle based on seed
            let seed = seeds[boxNum];
            for (let i = values.length - 1; i > 0; i--) {
                seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF;
                const j = seed % (i + 1);
                [values[i], values[j]] = [values[j], values[i]];
            }
            
            for (let i = 0; i < 256; i++) {
                sbox[i] = values[i];
            }
            sboxes.push(sbox);
        }
        
        return sboxes;
    }

    /**
     * Generate custom permutation table for bit shuffling
     */
    _generatePermutationTable() {
        const table = new Uint16Array(512);
        const seed = 0x8BA5; // Custom seed for permutation
        let rng = seed;
        
        // Create permutation of 512 positions
        for (let i = 0; i < 512; i++) {
            table[i] = i;
        }
        
        // Custom shuffle
        for (let i = 511; i > 0; i--) {
            rng = (rng * 48271) % 2147483647;
            const j = rng % (i + 1);
            [table[i], table[j]] = [table[j], table[i]];
        }
        
        return table;
    }

    /**
     * Generate mixing constants for each round
     */
    _generateMixingConstants() {
        const constants = [];
        for (let i = 0; i < this.ROUNDS; i++) {
            constants.push(new Uint32Array([
                0x428a2f98 ^ (i * 0x1234),
                0x71374491 ^ (i * 0x5678),
                0xb5c0fbcf ^ (i * 0x9ABC),
                0xe9b5dba5 ^ (i * 0xDEF0)
            ]));
        }
        return constants;
    }

    /**
     * Custom key derivation function (replaces PBKDF2)
     * Uses multiple rounds of mixing and hashing
     */
    async deriveKey(password, salt, iterations = 150000) {
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(password);
        const toolIdBytes = encoder.encode(this.TOOL_ID);
        
        // Initial key material
        let keyMaterial = new Uint8Array(64);
        
        // Combine password, salt, and tool ID
        const combined = new Uint8Array(passwordBytes.length + salt.length + toolIdBytes.length);
        combined.set(passwordBytes, 0);
        combined.set(salt, passwordBytes.length);
        combined.set(toolIdBytes, passwordBytes.length + salt.length);
        
        // First pass: SHA-512
        let hash = await crypto.subtle.digest('SHA-512', combined);
        keyMaterial.set(new Uint8Array(hash), 0);
        
        // Multiple rounds of custom mixing
        for (let i = 0; i < iterations; i++) {
            // Mix with round constant
            const roundConst = this.MIXING_CONSTANTS[i % this.ROUNDS];
            for (let j = 0; j < keyMaterial.length; j += 4) {
                const val = (keyMaterial[j] << 24) | (keyMaterial[j+1] << 16) | 
                           (keyMaterial[j+2] << 8) | keyMaterial[j+3];
                const mixed = val ^ roundConst[j % 4];
                keyMaterial[j] = (mixed >>> 24) & 0xFF;
                keyMaterial[j+1] = (mixed >>> 16) & 0xFF;
                keyMaterial[j+2] = (mixed >>> 8) & 0xFF;
                keyMaterial[j+3] = mixed & 0xFF;
            }
            
            // Apply S-box substitution
            for (let j = 0; j < keyMaterial.length; j++) {
                keyMaterial[j] = this.sboxes[j % 8][keyMaterial[j]];
            }
            
            // Custom permutation
            if (i % 100 === 0) {
                keyMaterial = this._permuteBytes(keyMaterial);
            }
            
            // Rehash periodically
            if (i % 1000 === 0 && i > 0) {
                hash = await crypto.subtle.digest('SHA-512', keyMaterial);
                keyMaterial = new Uint8Array(hash);
            }
        }
        
        return keyMaterial;
    }

    /**
     * Custom byte permutation using permutation table
     */
    _permuteBytes(data) {
        const result = new Uint8Array(data.length);
        const bitArray = new Uint8Array(data.length * 8);
        
        // Convert to bits
        for (let i = 0; i < data.length; i++) {
            for (let bit = 0; bit < 8; bit++) {
                bitArray[i * 8 + bit] = (data[i] >>> (7 - bit)) & 1;
            }
        }
        
        // Permute bits
        const permuted = new Uint8Array(bitArray.length);
        for (let i = 0; i < bitArray.length; i++) {
            permuted[this.permutationTable[i]] = bitArray[i];
        }
        
        // Convert back to bytes
        for (let i = 0; i < result.length; i++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                byte |= permuted[i * 8 + bit] << (7 - bit);
            }
            result[i] = byte;
        }
        
        return result;
    }

    /**
     * Custom F-function for Feistel structure
     */
    _fFunction(rightHalf, roundKey, round) {
        const result = new Uint8Array(rightHalf.length);
        
        // Step 1: XOR with round key
        for (let i = 0; i < rightHalf.length; i++) {
            result[i] = rightHalf[i] ^ roundKey[i % roundKey.length];
        }
        
        // Step 2: S-box substitution
        for (let i = 0; i < result.length; i++) {
            result[i] = this.sboxes[round % 8][result[i]];
        }
        
        // Step 3: Custom mixing with neighboring bytes
        for (let i = 0; i < result.length; i++) {
            const prev = result[(i - 1 + result.length) % result.length];
            const next = result[(i + 1) % result.length];
            result[i] = result[i] ^ ((prev >>> 3) | (next << 5));
        }
        
        // Step 4: Apply permutation every few rounds
        if (round % 4 === 0) {
            return this._permuteBytes(result);
        }
        
        return result;
    }

    /**
     * Generate round keys from master key
     */
    _generateRoundKeys(masterKey) {
        const roundKeys = [];
        let key = new Uint8Array(masterKey);
        
        for (let round = 0; round < this.ROUNDS; round++) {
            // Mix key with round constant
            const roundKey = new Uint8Array(32);
            for (let i = 0; i < 32; i++) {
                roundKey[i] = key[i] ^ this.MIXING_CONSTANTS[round][i % 4];
            }
            
            // Apply S-box
            for (let i = 0; i < roundKey.length; i++) {
                roundKey[i] = this.sboxes[round % 8][roundKey[i]];
            }
            
            roundKeys.push(roundKey);
            
            // Update key for next round
            key = this._rotateLeft(key, 3);
            for (let i = 0; i < key.length; i++) {
                key[i] ^= roundKey[i % roundKey.length];
            }
        }
        
        return roundKeys;
    }

    /**
     * Rotate bytes left
     */
    _rotateLeft(data, positions) {
        const result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[(i + positions) % data.length];
        }
        return result;
    }

    /**
     * Encrypt a single block using BLA-512
     */
    _encryptBlock(block, roundKeys) {
        // Split into left and right halves
        const halfSize = block.length / 2;
        let left = block.slice(0, halfSize);
        let right = block.slice(halfSize);
        
        // 16 rounds of Feistel structure
        for (let round = 0; round < this.ROUNDS; round++) {
            const fResult = this._fFunction(right, roundKeys[round], round);
            
            // XOR left with F-function result
            const newRight = new Uint8Array(left.length);
            for (let i = 0; i < left.length; i++) {
                newRight[i] = left[i] ^ fResult[i];
            }
            
            // Swap
            left = right;
            right = newRight;
        }
        
        // Final combination (no swap on last round)
        const result = new Uint8Array(block.length);
        result.set(right, 0);
        result.set(left, halfSize);
        
        return result;
    }

    /**
     * Decrypt a single block using BLA-512
     */
    _decryptBlock(block, roundKeys) {
        // Split into left and right halves
        const halfSize = block.length / 2;
        let left = block.slice(0, halfSize);
        let right = block.slice(halfSize);
        
        // 16 rounds in reverse order
        for (let round = this.ROUNDS - 1; round >= 0; round--) {
            const fResult = this._fFunction(left, roundKeys[round], round);
            
            // XOR right with F-function result
            const newLeft = new Uint8Array(right.length);
            for (let i = 0; i < right.length; i++) {
                newLeft[i] = right[i] ^ fResult[i];
            }
            
            // Swap
            right = left;
            left = newLeft;
        }
        
        // Final combination
        const result = new Uint8Array(block.length);
        result.set(right, 0);
        result.set(left, halfSize);
        
        return result;
    }

    /**
     * Add PKCS7 padding
     */
    _addPadding(data) {
        const paddingLength = this.BLOCK_SIZE - (data.length % this.BLOCK_SIZE);
        const padded = new Uint8Array(data.length + paddingLength);
        padded.set(data, 0);
        for (let i = data.length; i < padded.length; i++) {
            padded[i] = paddingLength;
        }
        return padded;
    }

    /**
     * Remove PKCS7 padding
     */
    _removePadding(data) {
        // Ensure we have data
        if (!data || data.length === 0) {
            throw new Error('Invalid padding: No data');
        }
        
        const paddingLength = data[data.length - 1];
        
        // Validate padding length is within valid range
        if (paddingLength > this.BLOCK_SIZE || paddingLength === 0) {
            throw new Error('Invalid padding: Incorrect password or corrupted data');
        }
        
        // Ensure we have enough data for the padding
        if (data.length < paddingLength) {
            throw new Error('Invalid padding: Incorrect password or corrupted data');
        }
        
        // Verify all padding bytes are correct
        for (let i = data.length - paddingLength; i < data.length; i++) {
            if (data[i] !== paddingLength) {
                throw new Error('Invalid padding: Incorrect password or corrupted data');
            }
        }
        
        return data.slice(0, data.length - paddingLength);
    }

    /**
     * Encrypt data with BLA-512
     */
    async encrypt(data, password, salt) {
        // Derive key
        const masterKey = await this.deriveKey(password, salt);
        
        // Generate round keys
        const roundKeys = this._generateRoundKeys(masterKey);
        
        // Add padding
        const padded = this._addPadding(data);
        
        // Encrypt each block
        const encrypted = new Uint8Array(padded.length);
        for (let i = 0; i < padded.length; i += this.BLOCK_SIZE) {
            const block = padded.slice(i, i + this.BLOCK_SIZE);
            const encryptedBlock = this._encryptBlock(block, roundKeys);
            encrypted.set(encryptedBlock, i);
        }
        
        return encrypted;
    }

    /**
     * Decrypt data with BLA-512
     */
    async decrypt(encryptedData, password, salt) {
        // Validate input
        if (!encryptedData || encryptedData.length === 0) {
            throw new Error('No data to decrypt');
        }
        
        if (encryptedData.length % this.BLOCK_SIZE !== 0) {
            throw new Error('Invalid encrypted data: Size not multiple of block size');
        }
        
        // Derive key
        const masterKey = await this.deriveKey(password, salt);
        
        // Generate round keys
        const roundKeys = this._generateRoundKeys(masterKey);
        
        // Decrypt each block
        const decrypted = new Uint8Array(encryptedData.length);
        for (let i = 0; i < encryptedData.length; i += this.BLOCK_SIZE) {
            const block = encryptedData.slice(i, i + this.BLOCK_SIZE);
            const decryptedBlock = this._decryptBlock(block, roundKeys);
            decrypted.set(decryptedBlock, i);
        }
        
        // Remove padding - this will throw if password is wrong
        try {
            return this._removePadding(decrypted);
        } catch (paddingError) {
            // If padding is invalid, it's likely due to wrong password
            throw new Error('Incorrect password or corrupted data');
        }
    }

    /**
     * Compute custom HMAC for integrity verification
     */
    async computeHMAC(data, key) {
        // Custom HMAC using BLA-512 principles
        const encoder = new TextEncoder();
        const toolIdBytes = encoder.encode(this.TOOL_ID);
        
        // Mix key with tool ID
        const mixedKey = new Uint8Array(key.length + toolIdBytes.length);
        mixedKey.set(key, 0);
        mixedKey.set(toolIdBytes, key.length);
        
        // Apply custom hash
        let hash = new Uint8Array(await crypto.subtle.digest('SHA-512', mixedKey));
        
        // Mix with data
        const combined = new Uint8Array(hash.length + data.length);
        combined.set(hash, 0);
        combined.set(data, hash.length);
        
        // Multiple rounds of hashing
        for (let i = 0; i < 5; i++) {
            hash = new Uint8Array(await crypto.subtle.digest('SHA-512', combined));
            
            // Apply S-box
            for (let j = 0; j < hash.length; j++) {
                hash[j] = this.sboxes[i % 8][hash[j]];
            }
        }
        
        return hash.slice(0, 32); // Return 256-bit HMAC
    }

    /**
     * Verify custom HMAC
     */
    async verifyHMAC(data, hmac, key) {
        const computed = await this.computeHMAC(data, key);
        
        // Timing-safe comparison
        if (computed.length !== hmac.length) return false;
        
        let result = 0;
        for (let i = 0; i < computed.length; i++) {
            result |= computed[i] ^ hmac[i];
        }
        
        return result === 0;
    }
}

// Export singleton instance
window.BLA512Engine = new BLA512();
