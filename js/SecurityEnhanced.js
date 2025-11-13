// !MODIFICATIONS TO THIS FILE WILL RESULT IN YOU LOSING ACCESS TO THE TOOL IF CAUGHT!
// Enhanced Security Module
// Device fingerprinting, rate limiting, and access logging

class SecurityEnhanced {
    constructor() {
        this.STORAGE_KEY = 'bla512_security_data';
        this.MAX_ATTEMPTS = 5;
        this.LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
        this.ATTEMPT_WINDOW = 10 * 60 * 1000; // 10 minutes
    }

    /**
     * Generate device fingerprint
     * Creates a unique identifier based on browser and system characteristics
     */
    async generateDeviceFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            navigator.hardwareConcurrency || 'unknown',
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.platform,
            navigator.deviceMemory || 'unknown',
            this._getCanvasFingerprint()
        ];
        
        const fingerprintString = components.join('|');
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprintString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Canvas fingerprinting for additional uniqueness
     */
    _getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 50;
            
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('BLA512', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Security', 4, 17);
            
            return canvas.toDataURL();
        } catch (e) {
            return 'canvas-unavailable';
        }
    }

    /**
     * Get security data from storage
     */
    _getSecurityData() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : { attempts: {}, devices: {}, accessLog: [] };
        } catch (e) {
            return { attempts: {}, devices: {}, accessLog: [] };
        }
    }

    /**
     * Save security data to storage
     */
    _saveSecurityData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save security data:', e);
        }
    }

    /**
     * Check if message is locked due to too many failed attempts
     */
    isMessageLocked(messageId) {
        const data = this._getSecurityData();
        const attempts = data.attempts[messageId];
        
        if (!attempts) return { locked: false };
        
        const now = Date.now();
        
        // Check if currently locked
        if (attempts.lockedUntil && attempts.lockedUntil > now) {
            const timeLeft = Math.ceil((attempts.lockedUntil - now) / 1000);
            return { 
                locked: true, 
                timeLeft: timeLeft,
                reason: `Too many failed attempts. Try again in ${this._formatTime(timeLeft)}.`
            };
        }
        
        // Clean up expired attempts
        attempts.history = attempts.history.filter(t => now - t < this.ATTEMPT_WINDOW);
        
        // Check if too many recent attempts
        if (attempts.history.length >= this.MAX_ATTEMPTS) {
            attempts.lockedUntil = now + this.LOCKOUT_DURATION;
            this._saveSecurityData(data);
            return {
                locked: true,
                timeLeft: this.LOCKOUT_DURATION / 1000,
                reason: `Too many failed attempts. Locked for ${this._formatTime(this.LOCKOUT_DURATION / 1000)}.`
            };
        }
        
        return { locked: false, attemptsLeft: this.MAX_ATTEMPTS - attempts.history.length };
    }

    /**
     * Record a failed decryption attempt
     */
    recordFailedAttempt(messageId) {
        const data = this._getSecurityData();
        
        if (!data.attempts[messageId]) {
            data.attempts[messageId] = { history: [], lockedUntil: null };
        }
        
        data.attempts[messageId].history.push(Date.now());
        this._saveSecurityData(data);
        
        return this.isMessageLocked(messageId);
    }

    /**
     * Record successful decryption with device info
     */
    async recordSuccessfulDecryption(messageId, deviceInfo = {}) {
        const data = this._getSecurityData();
        const fingerprint = await this.generateDeviceFingerprint();
        
        // Clear failed attempts on success
        if (data.attempts[messageId]) {
            delete data.attempts[messageId];
        }
        
        // Track device
        if (!data.devices[fingerprint]) {
            data.devices[fingerprint] = {
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                userAgent: navigator.userAgent,
                count: 0
            };
        }
        data.devices[fingerprint].lastSeen = Date.now();
        data.devices[fingerprint].count++;
        
        // Log access
        const accessEntry = {
            messageId: messageId,
            timestamp: Date.now(),
            deviceFingerprint: fingerprint.substring(0, 16) + '...', // Truncate for storage
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: new Date().getTimezoneOffset(),
            ...deviceInfo
        };
        
        data.accessLog.push(accessEntry);
        
        // Keep only last 100 access logs
        if (data.accessLog.length > 100) {
            data.accessLog = data.accessLog.slice(-100);
        }
        
        this._saveSecurityData(data);
        
        return {
            isNewDevice: data.devices[fingerprint].count === 1,
            deviceCount: Object.keys(data.devices).length,
            lastAccess: this._getLastAccess(messageId, fingerprint)
        };
    }

    /**
     * Get last access info for a message
     */
    _getLastAccess(messageId, currentFingerprint) {
        const data = this._getSecurityData();
        const logs = data.accessLog.filter(log => log.messageId === messageId);
        
        if (logs.length < 2) return null;
        
        // Get second-to-last (last is current access)
        const lastAccess = logs[logs.length - 2];
        return {
            timestamp: lastAccess.timestamp,
            device: lastAccess.deviceFingerprint,
            timeSince: Date.now() - lastAccess.timestamp
        };
    }

    /**
     * Check if device is suspicious (new or unusual)
     */
    async checkDeviceTrust() {
        const fingerprint = await this.generateDeviceFingerprint();
        const data = this._getSecurityData();
        
        if (!data.devices[fingerprint]) {
            return {
                trusted: false,
                reason: 'New device detected',
                recommendation: 'Verify this is your device'
            };
        }
        
        const device = data.devices[fingerprint];
        const daysSinceFirst = (Date.now() - device.firstSeen) / (1000 * 60 * 60 * 24);
        
        if (daysSinceFirst < 1) {
            return {
                trusted: false,
                reason: 'Recently added device',
                recommendation: 'Ensure you recognize this device'
            };
        }
        
        return {
            trusted: true,
            daysSinceFirst: Math.floor(daysSinceFirst),
            accessCount: device.count
        };
    }

    /**
     * Get access statistics for display
     */
    getAccessStats() {
        const data = this._getSecurityData();
        const now = Date.now();
        
        // Recent accesses (last 24 hours)
        const recentAccesses = data.accessLog.filter(log => now - log.timestamp < 24 * 60 * 60 * 1000);
        
        // Device count
        const deviceCount = Object.keys(data.devices).length;
        
        // Locked messages
        const lockedMessages = Object.entries(data.attempts)
            .filter(([_, attempts]) => attempts.lockedUntil && attempts.lockedUntil > now)
            .length;
        
        return {
            recentAccesses: recentAccesses.length,
            totalDevices: deviceCount,
            lockedMessages: lockedMessages,
            totalAccessLogs: data.accessLog.length
        };
    }

    /**
     * Format time in human-readable format
     */
    _formatTime(seconds) {
        if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
        const minutes = Math.ceil(seconds / 60);
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }

    /**
     * Clear security data (admin function)
     */
    clearSecurityData() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Export security logs (for debugging)
     */
    exportSecurityLogs() {
        const data = this._getSecurityData();
        return {
            exported: new Date().toISOString(),
            ...data,
            deviceCount: Object.keys(data.devices).length,
            logCount: data.accessLog.length
        };
    }
}

// Export singleton instance
window.SecurityEnhanced = new SecurityEnhanced();
