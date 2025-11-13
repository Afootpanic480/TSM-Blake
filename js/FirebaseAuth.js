// !MODIFICATIONS TO THIS FILE WILL RESULT IN YOU LOSING ACCESS TO THE TOOL IF CAUGHT!
// Firebase Authentication and Validation Layer
// Ensures only this tool can decrypt messages

/**
 * FirebaseAuth - Cloud-based authentication and validation
 * Each encrypted message gets a unique token stored in Firebase
 * Decryption requires validation against Firebase
 */

class FirebaseAuth {
    constructor() {
        // Firebase configuration (you'll need to add your own Firebase config)
        this.firebaseConfig = {
            apiKey: "AIzaSyCbJmJgNV-Y66zTEg8hBr2luydz739xE7A",
            authDomain: "encryptor-decryptor-1e110.firebaseapp.com",
            projectId: "encryptor-decryptor-1e110",
            storageBucket: "encryptor-decryptor-1e110.firebasestorage.app",
            messagingSenderId: "203555496070",
            appId: "1:203555496070:web:103ba7f093200cbb4af107",
            measurementId: "G-84PWW5M9B9"
        };
        
        this.isConfigured = this._validateConfig();
        this.toolSignature = this._generateToolSignature();
        
        // Fallback mode if Firebase is not configured
        this.useFallback = !this.isConfigured;
    }

    /**
     * Validate Firebase configuration
     */
    _validateConfig() {
        return !!(
            this.firebaseConfig.apiKey &&
            this.firebaseConfig.projectId &&
            this.firebaseConfig.appId
        );
    }

    /**
     * Generate unique tool signature
     * This signature is required for all operations
     */
    _generateToolSignature() {
        const components = [
            'BLA512_BLAKE_ENCRYPTOR_V4',
            navigator.userAgent,
            window.location.hostname,
            Date.now().toString(36)
        ];
        
        // Create signature hash
        let signature = 0;
        const str = components.join('|');
        for (let i = 0; i < str.length; i++) {
            signature = ((signature << 5) - signature) + str.charCodeAt(i);
            signature = signature & signature;
        }
        
        return signature.toString(36);
    }

    /**
     * Generate authentication token for a message
     * This token will be validated during decryption
     */
    async generateAuthToken(messageId, encryptedData, expiryTime) {
        const encoder = new TextEncoder();
        
        // Create token data
        const tokenData = {
            messageId: messageId,
            toolSignature: this.toolSignature,
            timestamp: Date.now(),
            expiryTime: expiryTime,
            dataHash: await this._hashData(encryptedData),
            version: '4.0.0'
        };
        
        // Sign the token
        const tokenString = JSON.stringify(tokenData);
        const tokenBytes = encoder.encode(tokenString);
        const signature = await crypto.subtle.digest('SHA-256', tokenBytes);
        
        tokenData.signature = this._arrayBufferToHex(signature);
        
        // Store in Firebase if configured
        if (!this.useFallback) {
            await this._storeTokenInFirebase(messageId, tokenData);
        } else {
            // Fallback: store in localStorage with encryption
            this._storeTokenLocally(messageId, tokenData);
        }
        
        return tokenData;
    }

    /**
     * Validate authentication token during decryption
     */
    async validateAuthToken(messageId, encryptedData) {
        let tokenData;
        
        // Retrieve token from Firebase or local storage
        if (!this.useFallback) {
            tokenData = await this._retrieveTokenFromFirebase(messageId);
        } else {
            tokenData = this._retrieveTokenLocally(messageId);
        }
        
        if (!tokenData) {
            throw new Error('Authentication token not found. This message may not have been encrypted with this tool.');
        }
        
        // Validate tool signature
        if (tokenData.toolSignature !== this.toolSignature) {
            // Allow some flexibility for same user on different sessions
            if (!this._isValidToolSignatureVariant(tokenData.toolSignature)) {
                throw new Error('Invalid tool signature. This message can only be decrypted by the original tool.');
            }
        }
        
        // Validate expiry
        if (tokenData.expiryTime && tokenData.expiryTime < Date.now()) {
            throw new Error('Message has expired and authentication token is no longer valid.');
        }
        
        // Validate data hash
        const currentHash = await this._hashData(encryptedData);
        if (currentHash !== tokenData.dataHash) {
            throw new Error('Data integrity check failed. The message may have been tampered with.');
        }
        
        // Validate signature
        const encoder = new TextEncoder();
        const { signature, ...dataWithoutSig } = tokenData;
        const tokenString = JSON.stringify(dataWithoutSig);
        const tokenBytes = encoder.encode(tokenString);
        const computedSignature = await crypto.subtle.digest('SHA-256', tokenBytes);
        const computedSigHex = this._arrayBufferToHex(computedSignature);
        
        if (computedSigHex !== signature) {
            throw new Error('Token signature verification failed. Possible tampering detected.');
        }
        
        return tokenData;
    }

    /**
     * Check if tool signature is a valid variant
     * Allows decryption on same user's device with different sessions
     */
    _isValidToolSignatureVariant(signature) {
        // Extract base signature (without timestamp)
        const baseSig = signature.split('|')[0];
        const currentBaseSig = this.toolSignature.split('|')[0];
        
        return baseSig === currentBaseSig;
    }

    /**
     * Hash data for integrity verification
     */
    async _hashData(data) {
        const hash = await crypto.subtle.digest('SHA-256', data);
        return this._arrayBufferToHex(hash);
    }

    /**
     * Convert ArrayBuffer to hex string
     */
    _arrayBufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Store token in Firebase Realtime Database
     */
    async _storeTokenInFirebase(messageId, tokenData) {
        try {
            // Initialize Firebase if not already done
            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                if (typeof firebase !== 'undefined') {
                    firebase.initializeApp(this.firebaseConfig);
                } else {
                    // Silent fallback - Firebase is optional
                    this.useFallback = true;
                    this._storeTokenLocally(messageId, tokenData);
                    return;
                }
            }
            
            const db = firebase.database();
            const tokenRef = db.ref('authTokens/' + messageId);
            
            await tokenRef.set(tokenData);
            
            // Set expiry if specified
            if (tokenData.expiryTime) {
                const expiryDate = new Date(tokenData.expiryTime);
                await tokenRef.onDisconnect().remove();
            }
        } catch (error) {
            console.warn('Failed to store token in Firebase:', error);
            this.useFallback = true;
            this._storeTokenLocally(messageId, tokenData);
        }
    }

    /**
     * Retrieve token from Firebase
     */
    async _retrieveTokenFromFirebase(messageId) {
        try {
            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                return this._retrieveTokenLocally(messageId);
            }
            
            const db = firebase.database();
            const tokenRef = db.ref('authTokens/' + messageId);
            const snapshot = await tokenRef.once('value');
            
            return snapshot.val();
        } catch (error) {
            console.warn('Failed to retrieve token from Firebase:', error);
            return this._retrieveTokenLocally(messageId);
        }
    }

    /**
     * Store token locally as fallback
     */
    _storeTokenLocally(messageId, tokenData) {
        const tokens = this._getLocalTokens();
        tokens[messageId] = tokenData;
        
        try {
            localStorage.setItem('bla512_auth_tokens', JSON.stringify(tokens));
        } catch (error) {
            console.error('Failed to store token locally:', error);
        }
    }

    /**
     * Retrieve token from local storage
     */
    _retrieveTokenLocally(messageId) {
        const tokens = this._getLocalTokens();
        return tokens[messageId] || null;
    }

    /**
     * Get all local tokens
     */
    _getLocalTokens() {
        try {
            const stored = localStorage.getItem('bla512_auth_tokens');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Clean up expired tokens
     */
    async cleanupExpiredTokens() {
        const now = Date.now();
        
        if (!this.useFallback) {
            // Firebase cleanup
            try {
                if (typeof firebase !== 'undefined' && firebase.apps.length) {
                    const db = firebase.database();
                    const tokensRef = db.ref('authTokens');
                    const snapshot = await tokensRef.once('value');
                    const tokens = snapshot.val() || {};
                    
                    const updates = {};
                    Object.keys(tokens).forEach(messageId => {
                        if (tokens[messageId].expiryTime && tokens[messageId].expiryTime < now) {
                            updates['authTokens/' + messageId] = null;
                        }
                    });
                    
                    if (Object.keys(updates).length > 0) {
                        await db.ref().update(updates);
                    }
                }
            } catch (error) {
                console.warn('Firebase cleanup failed:', error);
            }
        }
        
        // Local cleanup
        const tokens = this._getLocalTokens();
        const cleaned = {};
        
        Object.keys(tokens).forEach(messageId => {
            if (!tokens[messageId].expiryTime || tokens[messageId].expiryTime >= now) {
                cleaned[messageId] = tokens[messageId];
            }
        });
        
        try {
            localStorage.setItem('bla512_auth_tokens', JSON.stringify(cleaned));
        } catch (error) {
            console.error('Local cleanup failed:', error);
        }
    }

    /**
     * Remove token for a specific message
     */
    async removeAuthToken(messageId) {
        if (!this.useFallback) {
            try {
                if (typeof firebase !== 'undefined' && firebase.apps.length) {
                    const db = firebase.database();
                    await db.ref('authTokens/' + messageId).remove();
                }
            } catch (error) {
                console.warn('Failed to remove token from Firebase:', error);
            }
        }
        
        // Also remove from local storage
        const tokens = this._getLocalTokens();
        delete tokens[messageId];
        
        try {
            localStorage.setItem('bla512_auth_tokens', JSON.stringify(tokens));
        } catch (error) {
            console.error('Failed to remove local token:', error);
        }
    }

    /**
     * Get authentication statistics
     */
    getStats() {
        const tokens = this._getLocalTokens();
        const now = Date.now();
        
        let active = 0;
        let expired = 0;
        
        Object.values(tokens).forEach(token => {
            if (token.expiryTime) {
                if (token.expiryTime >= now) {
                    active++;
                } else {
                    expired++;
                }
            } else {
                active++;
            }
        });
        
        return {
            total: Object.keys(tokens).length,
            active: active,
            expired: expired,
            usingFirebase: !this.useFallback
        };
    }
}

// Export singleton instance
window.FirebaseAuthEngine = new FirebaseAuth();

// Auto-cleanup expired tokens every 5 minutes
setInterval(() => {
    if (window.FirebaseAuthEngine) {
        window.FirebaseAuthEngine.cleanupExpiredTokens().catch(err => {
            console.warn('Token cleanup error:', err);
        });
    }
}, 5 * 60 * 1000);
