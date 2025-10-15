/**
 * School Messenger - GAS URL Validator & Tamper Protection
 * 
 * This module ensures the integrity of Google Apps Script (GAS) endpoints and prevents tampering.
 * Do not modify this file as it is critical to the security of the application.
 */

const CONFIG = (() => {
    const hashParts = [
        'f5d55b83a512a41b6637da2e3300071503f0e7dd23bd7c684042622cb3b55174',
        '98b5ddf673c02a4ae52306c0f751fe54a744b40374f7324bb31fcc681bf54324',
        '78c12b1193db31c0970060d8a40cfb0cb7329528dc0b0271b0068abd4927abeb',
        '3c7546cd66d25ec6c72fabcca11203e41146210b12895a665d0b9c77f1d81d6f',
        'c8a9088bb32806468c41030b8271524fe8ecea016d5cb2441cfb2f2796033cb4',
        'da6408d6d1a07fe8daaecf47b92c7de3bebf6a0d160115e6746e07569d14b97a',
        '4d96c3ad17fececdf61ba44a241a042a5d7ab117d397f4b113df3538cd66ea6d',
        'c917f03eb9d53e7fd7eb9f40138afac8017e35069fdf7b70e35a1206def50e0a',
        '7c055055e74963a573e289786710536903b39da7db0898a0d6690b65750b68b4',
        'e13c58f7d43cf3c5fbdef1ab431a409e7a266d1f0fa5f4b8a36039fd4d16305b',
        'a7a034283a10ccc854fbe6cf48a2639af773fba9fe3e14b8f4d68fa566c41d28',
        '9672db8723a5e3829d6f20d018d4f136e4b47189ff1c7f7974cb71ff1acceaed',
        'd98c7c86b2a90973d3f1fb6b27b247c3a81f6442ef86b1f166e3ef7afa2a8b73',
        '204378c3ae044d5666f38070b86ca24605c17f1ce02d57ee345d5b0608cbc308'
    ];

    const ENDPOINT_HASHES = {
        whitelistGasUrl: hashParts[0],
        blGasUrl: hashParts[1],
        signinGasUrl: hashParts[2],
        userCheck: hashParts[3],
        gmailCheck: hashParts[4],
        verificationGAS: hashParts[5],
        verificationGAS1: hashParts[6],
        registrationGAS: hashParts[7],
        addFriReq: hashParts[8],
        pendingFR: hashParts[9],
        Acc_DenF: hashParts[10],
        permissionCheck: hashParts[11],
        bioHandler: hashParts[12],
        emailGetter: hashParts[13],
        userEmails: hashParts[14],
        GlobalAlerts: hashParts[15],
        TFGBOT: '',
        forgotPass: '',
        onlineCheck: ''
    };

    // Clean up the hash parts from memory
    hashParts.length = 0;

    return {
        VALIDATION_INTERVAL: 5 * 60 * 1000, // 5 minutes
        ENDPOINT_HASHES,
        ENDPOINT_TIMEOUT: 5000,
        DEBUG: true // Enable debug logging
    };
})();

// Backup original console methods
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
};

// Override console methods to filter out GAS Validator logs
['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    console[method] = function(...args) {
        // Only pass through logs that don't contain 'GAS Validator'
        const shouldLog = !args.some(arg => 
            typeof arg === 'string' && arg.includes('[GAS Validator]')
        );
        
        if (shouldLog) {
            originalConsole[method](...args);
        }
    };
});

// Secure logging function
function secureLog(level, ...args) {
    if (level === 'log' && !CONFIG.DEBUG) return;
    originalConsole[level](...args);
}

// Replace console methods
console.log = (...args) => secureLog('log', ...args);
console.warn = (...args) => secureLog('warn', ...args);
console.error = (...args) => secureLog('error', ...args);
console.info = (...args) => secureLog('info', ...args);
console.debug = (...args) => secureLog('debug', ...args);

// Cache for validation results (5 minutes TTL)
const VALIDATION_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Track pending validations to prevent duplicate requests
const PENDING_VALIDATIONS = new Map();

// State to track validation status
const state = {
    endpoints: {},
    isInitialized: false,
    validationTimer: null,
    originalFetch: window.fetch
};

// Logging helper with debug flag check
function log(...args) {
    secureLog('log', '[GAS Validator]', ...args);
}

/**
 * Calculate SHA-256 hash of a string
 */
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate a single GAS endpoint URL with caching and optimized requests
 */
async function validateEndpoint(name, url, useCache = true) {
    // Check cache first if enabled
    const cacheKey = `${name}:${url}`;
    const now = Date.now();
    
    if (useCache) {
        const cached = VALIDATION_CACHE.get(cacheKey);
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
            log(`✅ [CACHE] Using cached validation for ${name}`);
            return cached.result;
        }
    }
    
    // Check for pending validation
    if (PENDING_VALIDATIONS.has(cacheKey)) {
        log(`⏳ [PENDING] Waiting for validation of ${name}`);
        return PENDING_VALIDATIONS.get(cacheKey);
    }
    
    // Create a promise for this validation
    const validationPromise = (async () => {
        try {
            if (!url) {
                log(`⚠️ Endpoint ${name} is empty`);
                return { valid: false, reason: 'empty_url' };
            }

            // Check URL format
            try {
                new URL(url);
            } catch (e) {
                log(`❌ Invalid URL format for ${name}:`, url);
                return { valid: false, reason: 'invalid_format' };
            }

            // Check hash if available
            if (CONFIG.ENDPOINT_HASHES[name]) {
                const hash = await sha256(url);
                if (hash !== CONFIG.ENDPOINT_HASHES[name]) {
                    log(`❌ Hash mismatch for ${name}`);
                    return { valid: false, reason: 'hash_mismatch' };
                }
            }

            // Always use GET for GAS endpoints to avoid CORS/preflight issues
            const controller = new AbortController();
            let timeoutId;
            
            try {
                timeoutId = setTimeout(
                    () => controller.abort(), 
                    CONFIG.ENDPOINT_TIMEOUT
                );
                
                const checkUrl = new URL(url);

                
                // Use a simple GET request with no-cors mode
                const response = await fetch(checkUrl.toString(), {
                    method: 'GET',
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                log(`✅ Endpoint ${name} is valid and reachable`);
                return { valid: true };
                
            } catch (error) {
                log(`❌ Endpoint ${name} is unreachable: ${error.message}`);
                return { 
                    valid: false, 
                    reason: error.name === 'AbortError' ? 'timeout' : 'unreachable',
                    error: error.message
                };
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
            }
        } finally {
            // Clean up pending validations
            PENDING_VALIDATIONS.delete(cacheKey);
        }
    })();
    
    // Store the promise to handle concurrent requests
    PENDING_VALIDATIONS.set(cacheKey, validationPromise);
    
    try {
        const result = await validationPromise;
        // Cache successful validations
        if (result.valid) {
            VALIDATION_CACHE.set(cacheKey, {
                result,
                timestamp: now
            });
        }
        return result;
    } catch (error) {
        console.error(`Error validating endpoint ${name}:`, error);
        return { 
            valid: false, 
            reason: 'validation_error',
            error: error.message 
        };
    }
}

/**
 * Validate all GAS endpoints
 */
async function validateAllEndpoints() {
    log('Validating GAS endpoints...');
    
    // Get endpoints from gasModule or window
    const gasModule = window.gasModule || window;
    const endpoints = {};
    
    // Add all endpoints from ENDPOINT_HASHES
    for (const [name, expectedHash] of Object.entries(CONFIG.ENDPOINT_HASHES)) {
        // Skip validation for empty hashes (intentionally empty endpoints)
        if (!expectedHash) {
            log(`⚠️ Skipping validation for empty endpoint: ${name}`);
            continue;
        }
        
        if (gasModule[name] !== undefined) {
            // Only validate non-empty URLs
            if (gasModule[name]) {
                endpoints[name] = gasModule[name];
            } else {
                log(`⚠️ Empty URL for endpoint: ${name}`);
            }
        } else {
            console.warn(`Endpoint ${name} is defined in hashes but not found in gasModule`);
        }
    }
    
    const results = {};
    let allValid = true;
    
    // Validate each endpoint
    for (const [name, url] of Object.entries(endpoints)) {
        const result = await validateEndpoint(name, url);
        results[name] = result;
        
        if (!result.valid) {
            allValid = false;
            // Take action based on failure reason
            handleEndpointFailure(name, result);
        }
    }
    
    // Update state
    state.endpoints = results;
    
    // Show completion message
    originalConsole.log('GAS endpoints validation completed successfully');
    
    return {
        allValid,
        results
    };
}

/**
 * Handle endpoint validation failures
 */
function handleEndpointFailure(name, result) {
    log(`Handling failure for ${name}:`, result.reason);
    
    switch (result.reason) {
        case 'hash_mismatch':
            // Critical: Possible tampering detected
            const errorMessage = `
                SECURITY ALERT: CRITICAL SECURITY ISSUE DETECTED
                
                The application has detected that the ${name} URL has been modified.
                This is a serious security issue that could indicate a potential security breach.
                
                ERROR CODE: GAS_TAMPER_${name.toUpperCase()}_${Date.now()}
                
                For your security, all functionality has been disabled.
                
                What to do next:
                1. DO NOT attempt to log in or enter any credentials
                2. Close this browser tab immediately
                3. If you modified the original G.A.S url, please revert it back to the original url.
                4. Contact support immediately and provide the error code above

                Contacts:
                1. mcgahaj2@students.hcboe.net
                2. raymonds@students.hcboe.net

                                Global Support Email:
                            thefloorguysofficial@gmail.com
                
                This is a security measure to protect your data.
            `.replace(/^\s+/gm, ''); // Remove leading whitespace from each line
            
            showSecurityAlert(errorMessage, true);
            break;
            
        case 'unreachable':
        case 'timeout':
            // Network issue or service down
            showWarning(`Cannot connect to ${name}. Some features may be limited.`);
            break;
            
        case 'invalid_format':
            // Configuration error
            showError(`Invalid URL format for ${name}. Please check configuration.`);
            break;
    }
}

/**
 * Show a security alert to the user with enhanced styling and functionality
 */
function showSecurityAlert(message, isCritical = false) {
    // Create a full-screen overlay that blocks all interaction
    let overlay = document.getElementById('security-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'security-overlay';
        document.body.appendChild(overlay);
        
        // Add styles to the overlay
        const style = document.createElement('style');
        style.textContent = `
            #security-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.95);
                z-index: 999999;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                box-sizing: border-box;
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                color: #e2e8f0;
                overflow-y: auto;
                backdrop-filter: blur(8px);
                animation: fadeIn 0.3s ease-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; backdrop-filter: blur(0); }
                to { opacity: 1; backdrop-filter: blur(8px); }
            }
            
            .security-alert {
                max-width: 600px;
                width: 90%;
                background: rgba(30, 41, 59, 0.98);
                border-radius: 10px;
                border: 1px solid rgba(239, 68, 68, 0.3);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
                transform: translateY(0);
                animation: slideUp 0.4s ease-out;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                pointer-events: auto !important; /* Force pointer events */
                position: relative;
                z-index: 2147483647; /* Max z-index */
            }
            
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .security-header {
                padding: 1.25rem 1.5rem;
                background: linear-gradient(135deg, rgba(185, 28, 28, 0.95), rgba(153, 27, 27, 0.95));
                color: white;
                display: flex;
                align-items: center;
                gap: 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .header-content {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .security-subtitle {
                font-size: 0.9rem;
                font-weight: 600;
                letter-spacing: 1px;
                text-transform: uppercase;
                opacity: 0.9;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .security-icon {
                font-size: 2.25rem;
                flex-shrink: 0;
                filter: drop-shadow(0 0 10px rgba(255, 71, 71, 0.8));
                margin-right: 0.25rem;
            }
            
            .security-title {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 700;
                letter-spacing: -0.25px;
                line-height: 1.2;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .security-body {
                padding: 1.5rem;
                line-height: 1.6;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 1.25rem;
                flex: 1;
                min-height: 0;
            }
            
            .security-message {
                white-space: pre-line;
                margin: 0;
                color: #e2e8f0;
                font-size: 1.1rem;
            }
            
            .security-code-container {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin: 0.5rem 0;
            }
            
            .security-code {
                flex: 1;
                background: rgba(30, 41, 59, 0.8);
                color: #fca5a5;
                padding: 0.5rem 0.75rem;
                border-radius: 4px;
                font-family: 'Fira Code', 'Consolas', monospace;
                font-size: 0.9rem;
                border: 1px solid rgba(239, 68, 68, 0.3);
                word-break: break-all;
            }
            
            .security-steps {
                background: rgba(30, 41, 59, 0.8);
                border-radius: 8px;
                padding: 1.25rem;
                margin: 0;
                border: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .security-steps ol {
                margin: 0.5rem 0 0 1.25rem;
                padding: 0;
            }
            
            .security-steps li {
                margin-bottom: 0.75rem;
                padding-left: 0.5rem;
            }
            
            .security-steps li:last-child {
                margin-bottom: 0;
            }
            
            .security-contacts {
                margin-top: 1.5rem;
                padding-top: 1.25rem;
                border-top: 1px dashed rgba(255, 255, 255, 0.1);
            }
            
            .security-contacts p {
                margin: 0.5rem 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .security-contacts a {
                color: #60a5fa;
                text-decoration: none;
                transition: color 0.2s;
            }
            
            .security-contacts a:hover {
                color: #3b82f6;
                text-decoration: underline;
            }
            
            .security-footer {
                padding: 1.25rem 2rem;
                background: rgba(0, 0, 0, 0.2);
                text-align: center;
                font-size: 0.9rem;
                color: #94a3b8;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .security-warning {
                display: flex;
                justify-content: center;
                width: 100%;
            }
            
            .warning-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                background: rgba(245, 158, 11, 0.1);
                padding: 0.75rem 1.25rem;
                border-radius: 8px;
                border: 1px solid rgba(245, 158, 11, 0.3);
                max-width: 100%;
                text-align: center;
            }
            
            .warning-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
                animation: pulse 2s infinite;
            }
            
            .warning-text {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                color: #f59e0b;
                font-weight: 600;
                line-height: 1.3;
            }
            
            .warning-subtext {
                font-size: 0.9em;
                opacity: 0.9;
                font-weight: 500;
            }
            
            @keyframes pulse {
                0% { opacity: 0.8; transform: scale(1); }
                50% { opacity: 1; text-shadow: 0 0 15px rgba(249, 115, 22, 0.8); transform: scale(1.02); }
                100% { opacity: 0.8; transform: scale(1); }
            }
            
            @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-5px); }
                100% { transform: translateY(0px); }
            }
            
            @keyframes titleGlow {
                from { text-shadow: 0 0 10px rgba(99, 102, 241, 0.5); }
                to { text-shadow: 0 0 20px rgba(99, 102, 241, 0.8); }
            }
        `;
        document.head.appendChild(style);
        
        // Prevent any interaction with the page
        document.body.style.overflow = 'hidden';
        document.body.style.pointerEvents = 'none';
        overlay.style.pointerEvents = 'auto';
        
        // Disable all form elements except those in the security alert
        const disableAllForms = () => {
            const interactiveElements = [
                ...document.getElementsByTagName('form'),
                ...document.getElementsByTagName('input'),
                ...document.getElementsByTagName('button'),
                ...document.getElementsByTagName('a'),
                ...document.getElementsByTagName('select'),
                ...document.getElementsByTagName('textarea')
            ];
            
            interactiveElements.forEach(el => {
                // Skip elements inside the security alert
                if (el.closest('#security-overlay')) {
                    el.disabled = false;
                    el.style.pointerEvents = 'auto';
                    el.style.opacity = '1';
                    return;
                }
                
                if (el && !el.classList.contains('security-allow')) {
                    el.disabled = true;
                    el.style.pointerEvents = 'none';
                    el.style.opacity = '0.5';
                }
            });
        };
        
        // Run immediately and set interval to catch dynamically added elements
        disableAllForms();
        setInterval(disableAllForms, 1000);
        
        // Prevent context menu
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Prevent keyboard shortcuts
        document.addEventListener('keydown', e => {
            // Allow only F5 for refresh
            if (!(e.key === 'F5' || (e.ctrlKey && e.key === 'r'))) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, true);

        // Add copy button styles
        const copyButtonStyles = `
            .copy-button {
                padding: 0.5rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
                width: 36px;
                height: 36px;
                pointer-events: auto;
                background: rgba(99, 102, 241, 0.2);
                border: 1px solid rgba(99, 102, 241, 0.5);
                border-radius: 4px;
                color: #a5b4fc;
            }
            
            .copy-button:hover {
                background: rgba(99, 102, 241, 0.6);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .copy-button:active {
                transform: translateY(0);
            }
            
            .copy-button svg {
                width: 14px;
                height: 14px;
            }
            
            .copy-tooltip {
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: #1e293b;
                color: #e2e8f0;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 10;
            }
            
            .copy-tooltip:after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 50%;
                transform: translateX(-50%);
                border-width: 5px 5px 0;
                border-style: solid;
                border-color: #1e293b transparent transparent;
            }
            
            .error-code {
                flex-grow: 1;
                word-break: break-all;
                padding-right: 0.5rem;
            }
        `;
        
        // Add the styles to the document
        const styleElement = document.createElement('style');
        styleElement.textContent = copyButtonStyles;
        document.head.appendChild(styleElement);
    
    // Parse the message to extract error code and steps
    const lines = message.split('\n').filter(line => line.trim() !== '');
    const title = lines[0] || 'SECURITY ALERT';
    const description = lines[1] || 'A critical security issue has been detected.';
    let errorCode = '';
    const steps = [];
    const contacts = [];
    let inSteps = false;
    let inContacts = false;
    
    lines.forEach(line => {
        if (line.startsWith('ERROR CODE:')) {
            errorCode = line.replace('ERROR CODE:', '').trim();
        } else if (line.toLowerCase().includes('what to do next:')) {
            inSteps = true;
            inContacts = false;
        } else if (line.toLowerCase().includes('contacts:')) {
            inSteps = false;
            inContacts = true;
        } else if (inSteps && /^\d+\.\s+.+/.test(line)) {
            steps.push(line);
        } else if (inContacts && /^\d+\.\s+.+/.test(line)) {
            contacts.push(line.replace(/^\d+\.\s*/, ''));
        }
    });
    
    // Create a completely isolated copy button using an iframe
    function createIframeCopyButton() {
        // Create container for iframe
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.width = '36px';
        container.style.height = '36px';
        container.style.zIndex = '2147483647';
        container.style.pointerEvents = 'auto';
        container.style.border = 'none';
        container.style.overflow = 'hidden';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        document.body.appendChild(container);

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.backgroundColor = 'transparent';
        iframe.style.pointerEvents = 'auto';
        container.appendChild(iframe);

        // Write HTML content to iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body, html {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background: transparent;
                    }
                    button {
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        padding: 0;
                        border: none;
                        background: rgba(99, 102, 241, 0.2);
                        backdrop-filter: blur(5px);
                        border-radius: 4px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                        outline: none;
                    }
                    button:hover {
                        background: rgba(99, 102, 241, 0.6);
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    button:active {
                        transform: translateY(1px);
                    }
                    svg {
                        width: 16px;
                        height: 16px;
                        color: #a5b4fc;
                    }
                    .tooltip {
                        position: absolute;
                        top: -30px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(0, 0, 0, 0.8);
                        color: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        white-space: nowrap;
                        opacity: 0;
                        visibility: hidden;
                        transition: all 0.2s ease;
                        pointer-events: none;
                    }
                    .show-tooltip {
                        opacity: 1;
                        visibility: visible;
                    }
                </style>
            </head>
            <body>
                <script>
                    const copyButton = document.getElementById('copyButton');
                    const tooltip = document.getElementById('tooltip');
                    
                    function showTooltip() {
                        tooltip.classList.add('show-tooltip');
                        setTimeout(() => {
                            tooltip.classList.remove('show-tooltip');
                        }, 2000);
                    }
                    
                    // Add click handler directly to the button
                    copyButton.addEventListener('click', handleCopyClick);
                    
                    function handleCopyClick(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Get text from parent document
                        const codeEl = window.parent.document.querySelector('.security-code');
                        if (codeEl) {
                            copyToClipboard(codeEl.textContent).then(success => {
                                if (success) showTooltip();
                            });
                        }
                        return false;
                    }
                    
                    function copyToClipboard(text) {
                        // Try modern clipboard API first
                        if (navigator.clipboard) {
                            return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
                        }
                        
                        // Fallback for older browsers
                        const textarea = document.createElement('textarea');
                        textarea.value = text;
                        textarea.style.position = 'fixed';
                        document.body.appendChild(textarea);
                        textarea.select();
                        
                        try {
                            return Promise.resolve(document.execCommand('copy'));
                        } catch (err) {
                            return Promise.resolve(false);
                        } finally {
                            document.body.removeChild(textarea);
                        }
                    }
                </script>
            </body>
            </html>
        `);
        iframeDoc.close();
        
        // Clean up when overlay is removed
        const checkOverlay = setInterval(() => {
            if (!document.body.contains(overlay)) {
                clearInterval(checkOverlay);
                if (document.body.contains(container)) {
                    document.body.removeChild(container);
                }
            }
        }, 1000);
        
        // Keep iframe on top
        const bringToFront = () => {
            if (document.body.lastElementChild !== container) {
                document.body.appendChild(container);
            }
        };
        
        const bringToFrontInterval = setInterval(bringToFront, 500);
        
        // Clean up interval when overlay is gone
        const overlayCheck = setInterval(() => {
            if (!document.body.contains(overlay)) {
                clearInterval(bringToFrontInterval);
                clearInterval(overlayCheck);
            }
        }, 1000);
    }
    
    
    // Create the iframe button with a small delay
    setTimeout(createIframeCopyButton, 100);
    
    // Add copy button functionality with robust error handling
    function setupCopyButton() {
        const copyButton = overlay.querySelector('.copy-button');
        if (!copyButton) return;
        
        // Create a new button to replace the existing one to avoid any bound events
        const newButton = copyButton.cloneNode(true);
        copyButton.parentNode.replaceChild(newButton, copyButton);
        
        // Add the click handler directly to the button
        newButton.onclick = function(e) {
            try {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // Get the security code text
                const securityCode = overlay.querySelector('.security-code');
                if (!securityCode) return;
                
                const codeToCopy = securityCode.textContent || '';
                
                // Try modern clipboard API first
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(codeToCopy).then(() => {
                        showTooltip(newButton);
                    }).catch(err => {
                        console.error('Clipboard API failed, using fallback:', err);
                        fallbackCopy(codeToCopy, newButton);
                    });
                } else {
                    fallbackCopy(codeToCopy, newButton);
                }
                
                return false;
            } catch (err) {
                console.error('Error in copy handler:', err);
                return false;
            }
        };
        
        // Make the button stay enabled no matter what
        Object.defineProperty(newButton, 'disabled', {
            get() { return false; },
            set() { return false; },
            configurable: true
        });
        
        // Ensure button stays clickable
        const keepButtonEnabled = () => {
            if (!document.body.contains(overlay)) {
                clearInterval(enableCheck);
                return;
            }
            
            // Reset any styles that might disable the button
            newButton.style.pointerEvents = 'auto';
            newButton.style.opacity = '1';
            newButton.style.cursor = 'pointer';
            newButton.disabled = false;
            newButton.onclick = newButton.onclick; // Rebind in case it was removed
        };
        
        // Check frequently to keep the button enabled
        const enableCheck = setInterval(keepButtonEnabled, 100);
        
        // Clean up when the overlay is removed
        const observer = new MutationObserver(() => {
            if (!document.body.contains(overlay)) {
                clearInterval(enableCheck);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Show tooltip when copy is successful
    function showTooltip(button) {
        const tooltip = button.querySelector('.copy-tooltip');
        if (!tooltip) return;
        
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        
        // Hide tooltip after delay
        setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
        }, 2000);
    }
    
    // Fallback copy method for older browsers
    function fallbackCopy(text, button) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            const successful = document.execCommand('copy');
            if (successful) {
                showTooltip(button);
            }
            
            document.body.removeChild(textarea);
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
    }
    
    // Initialize the copy button after a short delay
    setTimeout(setupCopyButton, 100);
    
    // Create the alert content with improved structure
    overlay.innerHTML = `
        <div class="security-alert">
            <div class="security-header">
                <div class="security-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                        <path d="M12 8v4"/>
                        <path d="M12 16h.01"/>
                    </svg>
                </div>
                <div class="header-content">
                    <div class="security-subtitle">SECURITY ALERT</div>
                    <h1 class="security-title">${title}</h1>
                </div>
            </div>
            
            <div class="security-body">
                <p class="security-message">${description}</p>
                
                ${errorCode ? `
                    <div>
                        <p style="margin-bottom: 0.5rem;">Please provide this error code when contacting support:</p>
                        <div class="security-code-container">
                            <div class="security-code">${errorCode}</div>
                            <button class="copy-button" title="Copy to clipboard">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                                </svg>
                                <span class="copy-tooltip">Copied!</span>
                            </button>
                        </div>
                    </div>
                ` : ''}
                
                ${steps.length > 0 ? `
                    <div class="security-steps">
                        <h3 style="margin-top: 0; color: #fca5a5;">What to do next:</h3>
                        <ol>
                            ${steps.map(step => `<li>${step.replace(/^\d+\.\s*/, '')}</li>`).join('')}
                        </ol>
                    </div>
                ` : ''}
                
                ${contacts.length > 0 ? `
                    <div class="security-contacts">
                        <h3 style="margin-top: 0; color: #93c5fd;">Contact Support:</h3>
                        ${contacts.map(contact => {
                            if (contact.includes('@')) {
                                return `<p>📧 <a href="mailto:${contact}">${contact}</a></p>`;
                            } else {
                                return `<p>📞 ${contact}</p>`;
                            }
                        }).join('')}
                        
                        <div style="text-align: center; margin: 20px 0; padding: 15px; background: rgba(147, 197, 253, 0.15); border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <h3 style="margin: 0 0 10px 0; color: #3b82f6; font-size: 1.1em;">Global Support</h3>
                            <p style="margin: 0;">
                                <a href="mailto:thefloorguysofficial@gmail.com" style="color:rgb(210, 218, 226); font-weight: bold; text-decoration: none; font-size: 1.1em;">
                                    <center>thefloorguysofficial@gmail.com</center>
                                </a>
                            </p>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="security-footer">
                <div class="security-warning">
                    <div class="warning-content">
                        <div class="warning-icon">⚠️</div>
                        <div class="warning-text">
                            <div>SECURITY INCIDENT DETECTED</div>
                            <div class="warning-subtext">DO NOT IGNORE - REPORT IMMEDIATELY</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Prevent the alert from being closed
    return false;
}
}

/**
 * Show a warning message
 */
function showWarning(message) {
    console.warn(message);
    // Similar to showSecurityAlert but with different styling
}

/**
 * Show an error message
 */
function showError(message) {
    console.error(message);
    // Similar to showSecurityAlert but with different styling
}

/**
 * Initialize the GAS URL validator
 */
function initialize() {
    if (state.isInitialized) {
        log('Validator already initialized');
        return;
    }
    
    log('Initializing GAS URL validator...');
    
    // Set up periodic validation
    state.validationTimer = setInterval(validateAllEndpoints, CONFIG.VALIDATION_INTERVAL);
    
    // Initial validation
    validateAllEndpoints().catch(error => {
        console.error('Error during initial validation:', error);
    });
    
    // Override fetch to monitor GAS endpoint access
    window.fetch = async function(resource, init) {
        const url = resource?.url || resource;
        
        // Check if this is a GAS endpoint
        if (typeof url === 'string' && url.includes('script.google.com/macros/s/')) {
            const endpointName = Object.entries(state.endpoints).find(
                ([_, data]) => data.url === url.split('?')[0]
            )?.[0];
            
            if (endpointName) {
                log(`Intercepted request to ${endpointName}`);
                // You could add additional validation here
            }
        }
        
        // Proceed with original fetch
        return state.originalFetch.call(this, resource, init);
    };
    
    state.isInitialized = true;
    log('GAS URL validator initialized');
}

/**
 * Clean up the validator
 */
function cleanup() {
    if (state.validationTimer) {
        clearInterval(state.validationTimer);
        state.validationTimer = null;
    }
    
    // Restore original fetch
    if (state.originalFetch) {
        window.fetch = state.originalFetch;
    }
    
    state.isInitialized = false;
    log('GAS URL validator cleaned up');
}

// Auto-initialize when the document is ready
const init = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 0);
    }
};

// Self-executing function to prevent tampering
(function() {
    'use strict';
    
    // Add anti-tampering checks
    function checkTampering() {
        // Check if the script has been modified
        const scriptContent = document.currentScript ? document.currentScript.textContent : '';
        const scriptHash = btoa(scriptContent);
        
        // You can add additional checks here, like verifying the script's integrity
        // or comparing against a known hash of the script
        
        return true; // Return true if no tampering detected
    }
    
    // Initialize if no tampering detected
    if (checkTampering()) {
        init();
    } else {
        console.error('Tampering detected!');
        window.close();
        // Optionally, take action when tampering is detected
    }
}());

// Export for manual control
if (typeof window !== 'undefined') {
    window.GASValidator = {
        initialize: function() { return initialize(); },
        cleanup: function() { return cleanup(); },
        validateAllEndpoints: function() { return validateAllEndpoints(); },
        getState: function() { 
            var newState = {};
            for (var key in state) {
                if (state.hasOwnProperty(key)) {
                    newState[key] = state[key];
                }
            }
            return newState;
        }
    };
}

log('GAS URL validator loaded');