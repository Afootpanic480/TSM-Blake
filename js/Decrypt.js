// !MODIFICATIONS TO THIS FILE WILL RESULT IN YOU LOSING ACCESS TO THE TOOL IF CAUGHT!

// isPasswordRequired is defined in Main.html
const encoder = new TextEncoder();

async function decryptMessage() {
    const decryptBtn = document.getElementById('decryptBtn');
    const passwordInput = document.getElementById('password');
    
    try {
        // First validate the password if required
        if (!window.validatePasswordInput || typeof window.validatePasswordInput !== 'function') {
            console.error('Password validation function not found');
            showAlert('System error: Password validation failed', 'error');
            return false;
        }
        
        if (!window.validatePasswordInput()) {
            return false; // Validation will show error message
        }

        const password = document.getElementById('password').value;
        const inputText = document.getElementById('inputText').value;

        // Check for empty input
        if (!inputText) {
            showAlert('Please enter an encrypted message', 'error');
            return false;
        }

        if (inputText.startsWith('TEST_')) {
            showAlert(`Test ${inputText.split('_')[1]}: This is a ${inputText.split('_')[1].toLowerCase()} message.`, inputText.split('_')[1].toLowerCase());
            return false;
        }

        decryptBtn.disabled = true;
        decryptBtn.textContent = '🔄 Decrypting...';

        // Parse and validate the encrypted message
        let data;
        try {
            data = base64ToArrayBuffer(inputText);
            if (data.length < 69) { // 1 (version) + 4 (identifier) + 32 (salt) + 32 (hmac) minimum
                throw new Error('Invalid encrypted message: Message too short');
            }
        } catch (e) {
            throw new Error('Invalid message format. Please check if the message is complete and correctly encoded.');
        }

        const version = data.slice(0, 1)[0];
        const identifier = new TextDecoder().decode(data.slice(1, 5));
        
        // Check if this is a BLA-512 encrypted message
        if (identifier === 'BLA5' && version === 2) {
            // New BLA-512 decryption
            await decryptBLA512Message(data, password, inputText);
        } else if (identifier === 'BLKE' && version === 1) {
            // Legacy decryption for backward compatibility
            await decryptLegacyMessage(data, password);
        } else {
            console.error(`Invalid identifier: ${identifier}, version: ${version}`);
            throw new Error('This message was not encrypted with this tool or is corrupted');
        }
        
        return true;
    } catch (error) {
        console.error('Decryption error:', error);
        
        // Track failed attempts for lockout
        if (window.incrementFailedAttempts && typeof window.incrementFailedAttempts === 'function') {
            window.incrementFailedAttempts();
        }
        
        // Show user-friendly error messages
        let errorMessage = 'Decryption failed. ';
        
        if (error.message.includes('password') || error.message.includes('incorrect')) {
            errorMessage = error.message;
        } else if (error.name === 'OperationError') {
            errorMessage = 'Incorrect password. Please try again.';
        } else if (error.name === 'SyntaxError') {
            errorMessage = 'Invalid message format. Please check if the message is complete and correctly encoded.';
        } else if (error.message.includes('corrupted') || error.message.includes('tampered')) {
            errorMessage = error.message;
        } else if (error.message.includes('tool')) {
            errorMessage = error.message;
        } else {
            errorMessage = 'Failed to decrypt the message. The password might be incorrect or the message is corrupted.';
        }
        
        showAlert(errorMessage, 'error');
        
        // Focus password field on error
        if (passwordInput) {
            passwordInput.focus();
            passwordInput.select();
        }
        
        return false;
    } finally {
        if (decryptBtn) {
            decryptBtn.disabled = false;
            decryptBtn.textContent = '🔓 Decrypt';
        }
    }
}

/**
 * Decrypt BLA-512 encrypted message
 */
async function decryptBLA512Message(data, password, originalInput) {
    // Extract message components
    const salt = data.slice(5, 37); // 32 bytes
    const hmacValue = data.slice(37, 69); // 32 bytes
    const encryptedData = data.slice(69);
    
    // Get BLA-512 engine
    const bla512 = window.BLA512Engine;
    if (!bla512) {
        throw new Error('BLA-512 decryption engine not loaded. Please refresh the page.');
    }
    
    // Verify HMAC first to detect tampering or wrong password
    // The HMAC is computed over: version + identifier + salt + encryptedData
    // Using salt as the key (same as encryption)
    const dataToVerify = concatArrays(data.slice(0, 37), encryptedData);
    const isHmacValid = await bla512.verifyHMAC(dataToVerify, hmacValue, salt);
    if (!isHmacValid) {
        console.error('HMAC verification failed - incorrect password or corrupted message');
        throw new Error('Incorrect password or message has been tampered with');
    }
    
    // Decrypt the message using BLA-512
    let decryptedData;
    try {
        decryptedData = await bla512.decrypt(encryptedData, password, salt);
        
        const decodedData = new TextDecoder().decode(decryptedData);
        const parsedData = JSON.parse(decodedData);
        
        // Validate with Firebase authentication if available
        const authEngine = window.FirebaseAuthEngine;
        if (authEngine && parsedData.id) {
            try {
                const authResult = await authEngine.validateAuthToken(parsedData.id, encryptedData);
                if (authResult) {
                    console.log('✓ Cloud authentication validated successfully');
                } else {
                    console.log('ℹ No cloud authentication token found (message from different session)');
                }
            } catch (authError) {
                // Log but don't show alert for authentication warnings
                // These are informational only, not critical errors
                console.warn('Cloud authentication warning:', authError.message);
                
                // Only show alert for critical authentication failures
                if (authError.message.includes('expired') || authError.message.includes('tampering')) {
                    showAlert('⚠ ' + authError.message, 'warning');
                }
            }
        }

        // Block locally if manually expired
        if (typeof isLocallyBlocked === 'function' && parsedData.id && isLocallyBlocked(parsedData.id)) {
            throw new Error('This message was manually expired and cannot be decrypted');
        }

        if (parsedData.expiryTime && parsedData.expiryTime < Date.now()) {
            throw new Error('This message has expired and cannot be decrypted');
        }

        document.getElementById('resultText').value = parsedData.message;
        recordDecryption(originalInput);
        
        // Expose last decrypted id for button wrapper to call MessageService
        try { 
            window.lastDecryptedId = parsedData.id || null; 
        } catch(_) {}

        if (parsedData.expiryTime) {
            updateExpiryTimer(parsedData.expiryTime);
            showAlert('🔓 BLA-512: Self-destructing message decrypted successfully!', 'success');
        } else {
            if (window.currentExpiryTimer) {
                clearInterval(window.currentExpiryTimer);
                window.currentExpiryTimer = null;
            }
            const timeRemaining = document.getElementById('timeRemaining');
            if (timeRemaining) {
                timeRemaining.textContent = '';
            }
            showAlert('🔓 BLA-512: Message decrypted successfully!', 'success');
        }
    } catch (decryptError) {
        console.error('BLA-512 decryption error:', decryptError);
        
        // Provide user-friendly error messages
        if (decryptError.message && decryptError.message.includes('padding')) {
            throw new Error('Incorrect password. Please verify your password and try again.');
        } else if (decryptError.name === 'SyntaxError') {
            throw new Error('Incorrect password. Unable to decrypt message.');
        } else if (decryptError.message && (
            decryptError.message.includes('password') || 
            decryptError.message.includes('corrupted')
        )) {
            throw decryptError;
        }
        
        // Generic error for unexpected issues
        throw new Error('Decryption failed. Password may be incorrect or message is corrupted.');
    }
}

/**
 * Decrypt legacy BLKE (AES-GCM) encrypted message for backward compatibility
 */
async function decryptLegacyMessage(data, password) {
    showAlert('⚠️ This message uses legacy encryption. Please re-encrypt with BLA-512 for better security.', 'warning');
    
    // Extract message components (old format)
    const salt = data.slice(5, 21); // 16 bytes
    const iv = data.slice(21, 33); // 12 bytes
    const hmacValue = data.slice(33, 65); // 32 bytes
    const encryptedData = data.slice(65);

    // Verify legacy HMAC
    const dataToVerify = concatArrays(data.slice(0, 33), encryptedData);
    const isHmacValid = await verifyLegacyHMAC(dataToVerify, hmacValue, 'blke256');
    if (!isHmacValid) {
        console.error('HMAC verification failed');
        throw new Error('Incorrect password or corrupted message');
    }

    // Derive key using legacy PBKDF2
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    let key;
    try {
        key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
    } catch (e) {
        console.error('Key derivation failed:', e);
        throw new Error('Failed to process the password. The password might be incorrect.');
    }

    // Decrypt using legacy AES-GCM
    try {
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedData
        );

        const decodedData = new TextDecoder().decode(decryptedData);
        const parsedData = JSON.parse(decodedData);

        // Block locally if manually expired
        if (typeof isLocallyBlocked === 'function' && parsedData.id && isLocallyBlocked(parsedData.id)) {
            throw new Error('This message was manually expired and cannot be decrypted');
        }

        if (parsedData.expiryTime && parsedData.expiryTime < Date.now()) {
            throw new Error('This message has expired and cannot be decrypted');
        }

        document.getElementById('resultText').value = parsedData.message;
        recordDecryption(inputText);
        
        // Expose last decrypted id for button wrapper to call MessageService
        try { 
            window.lastDecryptedId = parsedData.id || null; 
        } catch(_) {}

        if (parsedData.expiryTime) {
            updateExpiryTimer(parsedData.expiryTime);
            showAlert('Legacy message decrypted. Consider re-encrypting with BLA-512!', 'success');
        } else {
            if (window.currentExpiryTimer) {
                clearInterval(window.currentExpiryTimer);
                window.currentExpiryTimer = null;
            }
            const timeRemaining = document.getElementById('timeRemaining');
            if (timeRemaining) {
                timeRemaining.textContent = '';
            }
            showAlert('Legacy message decrypted successfully!', 'success');
        }
    } catch (error) {
        throw new Error('Incorrect password. Please try again.');
    }
}

/**
 * Legacy HMAC verification for backward compatibility
 */
async function verifyLegacyHMAC(data, hmac, key) {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(key);
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const computedHmac = new Uint8Array(signature);
    
    // Timing-safe comparison
    if (computedHmac.byteLength !== hmac.byteLength) return false;
    let result = 0;
    for (let i = 0; i < computedHmac.length; i++) {
        result |= computedHmac[i] ^ hmac[i];
    }
    return result === 0;
}