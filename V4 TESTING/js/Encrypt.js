// !MODIFICATIONS TO THIS FILE WILL RESULT IN YOU LOSING ACCESS TO THE TOOL IF CAUGHT!

async function encryptMessage() {
    try {
        // First validate the password if required
        if (!window.validatePasswordInput || typeof window.validatePasswordInput !== 'function') {
            console.error('Password validation function not found');
            showAlert('System error: Password validation failed', 'error');
            return false;
        }
        
        if (!window.validatePasswordInput()) {
            return false;
        }
        if (!validateInput()) {
            return false;
        }

        const password = document.getElementById('password').value;
        const message = document.getElementById('inputText').value;
        let selfDestructTime = document.getElementById('selfDestructTime').value;
        if (!message) {
            showAlert('Please enter a message to encrypt', 'error');
            return;
        }

        const autoEnabled = localStorage.getItem('autoSelfDestructEnabled') === 'true';
        if (autoEnabled && !selfDestructTime) {
            setAutoSelfDestructTime();
            selfDestructTime = document.getElementById('selfDestructTime').value;
        }

        const encryptBtn = document.getElementById('encryptBtn');
        encryptBtn.disabled = true;
        encryptBtn.textContent = '🔄 Encrypting...';

        const encoder = new TextEncoder();
        const id = typeof generateId === 'function' ? generateId() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
        
        // Generate salt for BLA-512 (32 bytes for stronger security)
        const salt = crypto.getRandomValues(new Uint8Array(32));
        
        const messageData = {
            id,
            message: message,
            expiryTime: selfDestructTime ? new Date(selfDestructTime).getTime() : null
        };
        const encodedMessage = encoder.encode(JSON.stringify(messageData));

        // Use BLA-512 custom encryption instead of AES-GCM
        const bla512 = window.BLA512Engine;
        if (!bla512) {
            throw new Error('BLA-512 encryption engine not loaded');
        }

        const encryptedData = await bla512.encrypt(encodedMessage, password, salt);
        
        // Generate Firebase authentication token
        const authEngine = window.FirebaseAuthEngine;
        let authToken = null;
        if (authEngine) {
            try {
                authToken = await authEngine.generateAuthToken(
                    id, 
                    encryptedData, 
                    messageData.expiryTime
                );
            } catch (authError) {
                console.warn('Firebase auth token generation failed:', authError);
                // Continue without auth token (will use fallback)
            }
        }

        // Create header with version and identifier
        const version = new Uint8Array([2]); // Version 2 for BLA-512
        const identifier = encoder.encode('BLA5'); // New identifier for BLA-512
        
        // Compute custom HMAC for integrity
        const dataToHash = concatArrays(version, identifier, salt, encryptedData);
        const hmac = await bla512.computeHMAC(dataToHash, salt);

        // Combine all components
        const resultArray = concatArrays(version, identifier, salt, hmac, encryptedData);
        const base64Result = arrayBufferToBase64(resultArray);

        document.getElementById('resultText').value = base64Result;
        addToHistory(base64Result, messageData.expiryTime, id);
        recordEncryption(base64Result, messageData.expiryTime);
        // Expose last encryption metadata for button handler to call MessageService
        try { window.lastMessageMeta = { id, encryptedText: base64Result, expiryTime: messageData.expiryTime }; } catch(_) {}

        // MessageService call is handled by button wrapper (onEncryptClick)

        const securityLevel = authToken ? '🔒 BLA-512 with Firebase Auth' : '🔒 BLA-512 (Local Mode)';
        showAlert(`Message encrypted successfully with ${securityLevel}!` + (selfDestructTime ? ' (Self-destructing)' : ''), 'success');
        if (document.getElementById('autoCopy').checked) {
            copyResult(true);
        }
    } catch (error) {
        console.error('Encryption error:', error);
        showAlert(`Encryption failed: ${error.message}`, 'error');
        return false;
    } finally {
        const encryptBtn = document.getElementById('encryptBtn');
        encryptBtn.disabled = false;
        encryptBtn.textContent = '🔒 Encrypt';
    }
    return true;
}

// Legacy HMAC functions removed - now using BLA-512 custom HMAC

function concatArrays(...arrays) {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}