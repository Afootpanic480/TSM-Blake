// !MODIFICATIONS TO THIS FILE WILL RESULT IN YOU LOSING ACCESS TO THE TOOL IF CAUGHT!
// Honeypot Decoy System
// Provides fake but plausible encrypted data for wrong versions/identifiers

class HoneypotDecoy {
    constructor() {
        // Fake identifiers that old versions might try
        this.DECOY_IDENTIFIERS = ['BL4K3', 'BL4', 'S4M', 'SHA256', 'OLDVER', 'TESTID'];
    }

    /**
     * Check if identifier is a known decoy target
     */
    isDecoyIdentifier(identifier) {
        return this.DECOY_IDENTIFIERS.includes(identifier);
    }

    /**
     * Generate fake encrypted data that looks valid but decrypts to garbage
     * This wastes attacker's time and prevents version detection
     */
    async generateDecoyData(realData, realIdentifier) {
        const encoder = new TextEncoder();
        
        // Choose a random fake identifier
        const fakeIdentifier = this.DECOY_IDENTIFIERS[
            Math.floor(Math.random() * this.DECOY_IDENTIFIERS.length)
        ];
        
        // Create fake structure similar to real one
        const version = new Uint8Array([1]); // Wrong version
        const identifier = encoder.encode(fakeIdentifier);
        const fakeSalt = crypto.getRandomValues(new Uint8Array(32));
        const fakeHmac = crypto.getRandomValues(new Uint8Array(32));
        
        // Generate fake encrypted data of similar length
        const fakeEncrypted = crypto.getRandomValues(
            new Uint8Array(realData.length || 128)
        );
        
        // Combine with similar structure
        const decoyData = this._concatArrays(
            version, 
            identifier, 
            fakeSalt, 
            fakeHmac, 
            fakeEncrypted
        );
        
        return {
            data: decoyData,
            identifier: fakeIdentifier,
            note: 'This is decoy data designed to waste attacker time'
        };
    }

    /**
     * Handle decoy decryption attempt
     * Returns fake success but garbage plaintext
     */
    async handleDecoyDecryption(data, password) {
        // Simulate real decryption time (random 1-3 seconds)
        const delay = 1000 + Math.random() * 2000;
        await this._sleep(delay);
        
        // Extract components (pretend to parse)
        const version = data.slice(0, 1)[0];
        const identifier = new TextDecoder().decode(data.slice(1, 5));
        const salt = data.slice(5, 37);
        const hmac = data.slice(37, 69);
        const encryptedData = data.slice(69);
        
        // Generate fake but plausible-looking plaintext
        // This should look like it might be valid JSON but isn't
        const fakePlaintext = this._generateFakePlaintext(password);
        
        // Log the attempt
        this._logDecoyAttempt(identifier, password);
        
        return {
            success: true, // Pretend it worked
            plaintext: fakePlaintext,
            warning: null // No warning to avoid detection
        };
    }

    /**
     * Generate fake plaintext that looks valid but isn't
     */
    _generateFakePlaintext(password) {
        // Create something that looks like JSON but with corrupted data
        const fakeMessages = [
            '{"id":"err_corrupted","message":"�����","expiryTime":null}',
            '{"id":"decode_fail","msg":"���\\u0000\\u0000���","exp":0}',
            '{"i":"bad_parse","m":"������������","e":null}',
            'Error: Malformed UTF-8 data',
            '��{corrupted}��',
            '{"error":"legacy_format_deprecated"}'
        ];
        
        // Return random fake message
        return fakeMessages[Math.floor(Math.random() * fakeMessages.length)];
    }

    /**
     * Log decoy attempts for security monitoring
     */
    _logDecoyAttempt(identifier, password) {
        try {
            const logs = this._getDecoyLogs();
            logs.push({
                timestamp: Date.now(),
                identifier: identifier,
                passwordHash: this._quickHash(password),
                userAgent: navigator.userAgent,
                success: false // They got decoy data
            });
            
            // Keep only last 50 attempts
            if (logs.length > 50) {
                logs.splice(0, logs.length - 50);
            }
            
            localStorage.setItem('bla512_decoy_logs', JSON.stringify(logs));
            
            // Alert if too many decoy attempts (possible attack)
            if (logs.length > 10) {
                const recent = logs.filter(l => Date.now() - l.timestamp < 60000);
                if (recent.length > 5) {
                    console.warn('⚠️ Multiple decoy decryption attempts detected - possible attack');
                }
            }
        } catch (e) {
            // Silent fail for logging
        }
    }

    /**
     * Get decoy attempt logs
     */
    _getDecoyLogs() {
        try {
            const stored = localStorage.getItem('bla512_decoy_logs');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Quick hash for logging (not cryptographic)
     */
    _quickHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    /**
     * Sleep utility
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Concatenate arrays utility
     */
    _concatArrays(...arrays) {
        const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    /**
     * Get statistics on decoy attempts
     */
    getDecoyStats() {
        const logs = this._getDecoyLogs();
        const now = Date.now();
        
        return {
            totalAttempts: logs.length,
            recentAttempts: logs.filter(l => now - l.timestamp < 24 * 60 * 60 * 1000).length,
            uniqueIdentifiers: [...new Set(logs.map(l => l.identifier))],
            lastAttempt: logs.length > 0 ? logs[logs.length - 1].timestamp : null
        };
    }

    /**
     * Clear decoy logs
     */
    clearDecoyLogs() {
        localStorage.removeItem('bla512_decoy_logs');
    }
}

// Export singleton instance
window.HoneypotDecoy = new HoneypotDecoy();
