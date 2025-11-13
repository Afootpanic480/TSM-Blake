// !MODIFICATIONS TO THIS FILE WILL RESULT IN YOU LOSING ACCESS TO THE TOOL IF CAUGHT!
// Google Authentication & Email Filtering System
// Manages email domain restrictions and manual approval requirements

/**
 * EmailAuthSystem - Controls access based on email domains
 * 
 * Access Levels:
 * 1. ALLOWED: @students.hcboe.net - Auto-approved
 * 2. BLOCKED: @hcboe.net - Custom rejection message
 * 3. PENDING: @gmail.com and others - Manual approval required
 */

class EmailAuthSystem {
    constructor() {
        // Email domain rules
        this.domainRules = {
            // Auto-approved domains (case-insensitive)
            allowed: [
                'students.hcboe.net'
            ],
            
            // Blocked domains with custom messages
            blocked: {
                'hcboe.net': {
                    message: 'Staff Email Blocked',
                    description: 'Staff email addresses (@hcboe.net) are not permitted to use this tool.',
                    reason: 'This tool is designed exclusively for student use. Staff members should contact the administrator for alternative access.',
                    contact: 'If you believe this is an error, please contact the system administrator.'
                }
            },
            
            // Domains requiring manual approval
            manualApproval: [
                'gmail.com',
                'outlook.com',
                'yahoo.com',
                'hotmail.com'
                // Add more as needed
            ]
        };
        
        // Manual approval list (stored in localStorage)
        this.APPROVED_EMAILS_KEY = 'bla512_approved_emails';
        this.PENDING_EMAILS_KEY = 'bla512_pending_emails';
        
        // Current authenticated user
        this.currentUser = null;
        
        // Initialize Firebase Auth
        this.initializeFirebaseAuth();
    }

    /**
     * Initialize Firebase Authentication
     */
    initializeFirebaseAuth() {
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            // Silent fallback - Firebase is optional
            console.error('[EmailAuth] Firebase SDK not loaded! Authentication will not work.');
            // Show error to user
            setTimeout(() => {
                showAlert('⚠️ Authentication system not configured. Please check Firebase setup.', 'error', 0);
            }, 1000);
            return;
        }

        // Check if Firebase is initialized
        if (!firebase.apps || firebase.apps.length === 0) {
            console.error('[EmailAuth] Firebase not initialized! Check FirebaseConfig.js');
            setTimeout(() => {
                showAlert('⚠️ Firebase not configured. Please add your Firebase credentials to FirebaseConfig.js', 'error', 0);
            }, 1000);
            return;
        }

        console.log('[EmailAuth] Firebase initialized, setting up authentication...');

        // Set up auth state listener
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.handleUserSignIn(user);
            } else {
                this.handleUserSignOut();
            }
        });
    }

    /**
     * Handle user sign-in
     */
    async handleUserSignIn(user) {
        const email = user.email.toLowerCase();
        const domain = this.extractDomain(email);
        
        console.log(`[EmailAuth] User signed in: ${email}`);
        
        // Check email authorization
        const authResult = this.checkEmailAuthorization(email, domain);
        
        if (authResult.status === 'ALLOWED') {
            // Auto-approved
            this.currentUser = user;
            this.grantAccess(user, authResult);
        } else if (authResult.status === 'BLOCKED') {
            // Blocked domain
            this.denyAccess(user, authResult);
        } else if (authResult.status === 'PENDING') {
            // Requires manual approval
            this.requireManualApproval(user, authResult);
        }
    }

    /**
     * Handle user sign-out
     */
    handleUserSignOut() {
        console.log('[EmailAuth] User signed out');
        this.currentUser = null;
        this.showSignInUI();
    }

    /**
     * Extract domain from email
     */
    extractDomain(email) {
        return email.split('@')[1] || '';
    }

    /**
     * Check if email is authorized
     */
    checkEmailAuthorization(email, domain) {
        // Check if blocked
        for (const blockedDomain in this.domainRules.blocked) {
            if (domain === blockedDomain.toLowerCase() || domain.endsWith('.' + blockedDomain.toLowerCase())) {
                // Special case: allow students.hcboe.net even though hcboe.net is blocked
                if (this.isAllowedDomain(domain)) {
                    return { status: 'ALLOWED', domain };
                }
                return {
                    status: 'BLOCKED',
                    domain,
                    ...this.domainRules.blocked[blockedDomain]
                };
            }
        }

        // Check if auto-allowed
        if (this.isAllowedDomain(domain)) {
            return { status: 'ALLOWED', domain };
        }

        // Check if manually approved
        if (this.isManuallyApproved(email)) {
            return { status: 'ALLOWED', domain, manuallyApproved: true };
        }

        // Check if requires manual approval
        if (this.requiresManualApproval(domain)) {
            return {
                status: 'PENDING',
                domain,
                message: '⏳ Manual Approval Required',
                description: 'Your email domain requires administrator approval to access this tool.',
                reason: `The domain @${domain} is not automatically approved. Your access request has been submitted for review.`,
                contact: 'Please wait for administrator approval or contact the system administrator.'
            };
        }

        // Default: require manual approval for unknown domains
        return {
            status: 'PENDING',
            domain,
            message: '⏳ Manual Approval Required',
            description: 'Your email domain is not recognized and requires administrator approval.',
            reason: `The domain @${domain} is not in our approved list. Your access request has been submitted.`,
            contact: 'Please contact the system administrator for approval.'
        };
    }

    /**
     * Check if domain is in allowed list
     */
    isAllowedDomain(domain) {
        return this.domainRules.allowed.some(allowed => 
            domain.toLowerCase() === allowed.toLowerCase() ||
            domain.toLowerCase().endsWith('.' + allowed.toLowerCase())
        );
    }

    /**
     * Check if domain requires manual approval
     */
    requiresManualApproval(domain) {
        return this.domainRules.manualApproval.some(manual =>
            domain.toLowerCase() === manual.toLowerCase() ||
            domain.toLowerCase().endsWith('.' + manual.toLowerCase())
        );
    }

    /**
     * Check if email is manually approved
     */
    isManuallyApproved(email) {
        try {
            const approved = JSON.parse(localStorage.getItem(this.APPROVED_EMAILS_KEY) || '[]');
            return approved.includes(email.toLowerCase());
        } catch (e) {
            return false;
        }
    }

    /**
     * Add email to manual approval list
     */
    manuallyApproveEmail(email) {
        try {
            const approved = JSON.parse(localStorage.getItem(this.APPROVED_EMAILS_KEY) || '[]');
            if (!approved.includes(email.toLowerCase())) {
                approved.push(email.toLowerCase());
                localStorage.setItem(this.APPROVED_EMAILS_KEY, JSON.stringify(approved));
            }
            
            // Remove from pending list
            this.removeFromPending(email);
            
            return true;
        } catch (e) {
            console.error('[EmailAuth] Failed to approve email:', e);
            return false;
        }
    }

    /**
     * Add email to pending list
     */
    addToPending(email, userData) {
        try {
            const pending = JSON.parse(localStorage.getItem(this.PENDING_EMAILS_KEY) || '{}');
            pending[email.toLowerCase()] = {
                email: email.toLowerCase(),
                displayName: userData.displayName || 'Unknown',
                timestamp: Date.now(),
                status: 'pending'
            };
            localStorage.setItem(this.PENDING_EMAILS_KEY, JSON.stringify(pending));
        } catch (e) {
            console.error('[EmailAuth] Failed to add to pending:', e);
        }
    }

    /**
     * Remove email from pending list
     */
    removeFromPending(email) {
        try {
            const pending = JSON.parse(localStorage.getItem(this.PENDING_EMAILS_KEY) || '{}');
            delete pending[email.toLowerCase()];
            localStorage.setItem(this.PENDING_EMAILS_KEY, JSON.stringify(pending));
        } catch (e) {
            console.error('[EmailAuth] Failed to remove from pending:', e);
        }
    }

    /**
     * Grant access to user
     */
    grantAccess(user, authResult) {
        console.log(`[EmailAuth] Access granted to ${user.email}`);
        
        // Hide sign-in UI
        const signInOverlay = document.getElementById('signInOverlay');
        if (signInOverlay) {
            signInOverlay.style.display = 'none';
        }

        // Show main container
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'block';
        }

        // Update username display
        const usernameDisplay = document.getElementById('settingsUsername');
        if (usernameDisplay) {
            usernameDisplay.textContent = user.displayName || user.email;
            usernameDisplay.classList.remove('username-loading');
        }

        // Show success message
        if (authResult.manuallyApproved) {
            showAlert('✅ Welcome! Your account has been manually approved.', 'success');
        } else {
            showAlert(`✅ Signed in as ${user.email}`, 'success');
        }
    }

    /**
     * Deny access to user
     */
    denyAccess(user, authResult) {
        console.log(`[EmailAuth] Access denied to ${user.email}`);
        
        // Sign out the user
        firebase.auth().signOut();

        // Show access denied UI
        this.showAccessDeniedUI(user, authResult);
    }

    /**
     * Require manual approval for user
     */
    requireManualApproval(user, authResult) {
        console.log(`[EmailAuth] Manual approval required for ${user.email}`);
        
        // Add to pending list
        this.addToPending(user.email, user);

        // Sign out the user
        firebase.auth().signOut();

        // Show pending approval UI
        this.showPendingApprovalUI(user, authResult);
    }

    /**
     * Show sign-in UI
     */
    showSignInUI() {
        // Hide main container
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'none';
        }

        // Show or create sign-in overlay
        let signInOverlay = document.getElementById('signInOverlay');
        if (!signInOverlay) {
            signInOverlay = document.createElement('div');
            signInOverlay.id = 'signInOverlay';
            signInOverlay.className = 'auth-overlay';
            signInOverlay.innerHTML = `
                <div class="auth-content">
                    <div class="auth-header">
                        <span class="auth-icon">🔐</span>
                        <h2>Blake's Encryptor/Decryptor</h2>
                        <p class="auth-subtitle">Secure message encryption with BLA-512</p>
                    </div>
                    <div class="auth-body">
                        <p class="auth-description">Sign in with your Google account to continue</p>
                        <button class="auth-button google-sign-in" onclick="window.EmailAuthSystem.signInWithGoogle()">
                            <svg class="google-icon" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Sign in with Google
                        </button>
                        <p class="auth-note"> Your email will be used for authentication and access control only.
                        </p>
                    </div>
                </div>
            `;
            document.body.appendChild(signInOverlay);
        }
        
        signInOverlay.style.display = 'flex';
    }

    /**
     * Show access denied UI
     */
    showAccessDeniedUI(user, authResult) {
        let overlay = document.getElementById('signInOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'signInOverlay';
            overlay.className = 'auth-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="auth-content blocked">
                <div class="auth-header">
                    <span class="auth-icon error">🚫</span>
                    <h2>${authResult.message}</h2>
                </div>
                <div class="auth-body">
                    <div class="blocked-info">
                        <p class="blocked-email"><strong>Email:</strong> ${user.email}</p>
                        <p class="blocked-domain"><strong>Domain:</strong> @${authResult.domain}</p>
                    </div>
                    <div class="blocked-message">
                        <p><strong>${authResult.description}</strong></p>
                        <p>${authResult.reason}</p>
                    </div>
                    <div class="blocked-contact">
                        <p>${authResult.contact}</p>
                    </div>
                    <button class="auth-button secondary" onclick="window.EmailAuthSystem.showSignInUI()">
                        Try Different Account
                    </button>
                </div>
            </div>
        `;
        
        overlay.style.display = 'flex';
    }

    /**
     * Show pending approval UI
     */
    showPendingApprovalUI(user, authResult) {
        let overlay = document.getElementById('signInOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'signInOverlay';
            overlay.className = 'auth-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="auth-content pending">
                <div class="auth-header">
                    <span class="auth-icon warning">⏳</span>
                    <h2>${authResult.message}</h2>
                </div>
                <div class="auth-body">
                    <div class="pending-info">
                        <p class="pending-email"><strong>Email:</strong> ${user.email}</p>
                        <p class="pending-domain"><strong>Domain:</strong> @${authResult.domain}</p>
                        <p class="pending-status"><strong>Status:</strong> Awaiting Approval</p>
                    </div>
                    <div class="pending-message">
                        <p><strong>${authResult.description}</strong></p>
                        <p>${authResult.reason}</p>
                    </div>
                    <div class="pending-instructions">
                        <h3>Next Steps:</h3>
                        <ol>
                            <li>Your access request has been logged</li>
                            <li>An administrator will review your request</li>
                            <li>You will be notified when approved</li>
                            <li>Return to this page after approval</li>
                        </ol>
                    </div>
                    <div class="pending-contact">
                        <p>${authResult.contact}</p>
                    </div>
                    <button class="auth-button secondary" onclick="window.EmailAuthSystem.showSignInUI()">
                        Try Different Account
                    </button>
                </div>
            </div>
        `;
        
        overlay.style.display = 'flex';
    }

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined' || !firebase.auth) {
                showAlert('⚠️ Firebase authentication not loaded. Please check your configuration.', 'error');
                return;
            }

            // Check if Firebase is initialized
            if (!firebase.apps || firebase.apps.length === 0) {
                showAlert('⚠️ Firebase not initialized. Please add your Firebase credentials to FirebaseConfig.js', 'error');
                return;
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            // Force account selection
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            console.log('[EmailAuth] Initiating Google sign-in...');
            await firebase.auth().signInWithPopup(provider);
            console.log('[EmailAuth] Sign-in popup completed');
        } catch (error) {
            console.error('[EmailAuth] Sign-in error:', error);
            
            // Handle specific error cases
            if (error.code === 'auth/popup-closed-by-user') {
                showAlert('Sign-in cancelled. Please try again.', 'info');
            } else if (error.code === 'auth/popup-blocked') {
                showAlert('Pop-up blocked. Please allow pop-ups for this site and try again.', 'error');
            } else if (error.code === 'auth/unauthorized-domain') {
                showAlert('This domain is not authorized. Please add it to Firebase Console.', 'error');
            } else {
                showAlert('Sign-in failed: ' + error.message, 'error');
            }
        }
    }

    /**
     * Sign out current user
     */
    async signOut() {
        try {
            await firebase.auth().signOut();
            this.showSignInUI();
        } catch (error) {
            console.error('[EmailAuth] Sign-out error:', error);
            showAlert('Sign-out failed: ' + error.message, 'error');
        }
    }

    /**
     * Get pending approvals
     */
    getPendingApprovals() {
        try {
            return JSON.parse(localStorage.getItem(this.PENDING_EMAILS_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    /**
     * Get approved emails
     */
    getApprovedEmails() {
        try {
            return JSON.parse(localStorage.getItem(this.APPROVED_EMAILS_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Admin panel to manage approvals
     */
    showAdminPanel() {
        const pending = this.getPendingApprovals();
        const approved = this.getApprovedEmails();

        let html = `
            <div class="admin-panel">
                <h2>Email Approval Management</h2>
                
                <div class="admin-section">
                    <h3>Pending Approvals (${Object.keys(pending).length})</h3>
                    <div class="pending-list">
        `;

        if (Object.keys(pending).length === 0) {
            html += '<p>No pending approvals</p>';
        } else {
            for (const email in pending) {
                const data = pending[email];
                const date = new Date(data.timestamp).toLocaleString();
                html += `
                    <div class="pending-item">
                        <div class="pending-details">
                            <strong>${email}</strong>
                            <small>${data.displayName} - ${date}</small>
                        </div>
                        <button onclick="window.EmailAuthSystem.approveEmail('${email}')">Approve</button>
                    </div>
                `;
            }
        }

        html += `
                    </div>
                </div>

                <div class="admin-section">
                    <h3>Approved Emails (${approved.length})</h3>
                    <div class="approved-list">
        `;

        if (approved.length === 0) {
            html += '<p>No manually approved emails</p>';
        } else {
            approved.forEach(email => {
                html += `
                    <div class="approved-item">
                        <span>${email}</span>
                        <button onclick="window.EmailAuthSystem.revokeApproval('${email}')">Revoke</button>
                    </div>
                `;
            });
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Approve an email
     */
    approveEmail(email) {
        if (this.manuallyApproveEmail(email)) {
            showAlert(`✅ ${email} has been approved`, 'success');
            // Refresh admin panel if open
            this.refreshAdminPanel();
        } else {
            showAlert(`Failed to approve ${email}`, 'error');
        }
    }

    /**
     * Revoke approval
     */
    revokeApproval(email) {
        try {
            const approved = JSON.parse(localStorage.getItem(this.APPROVED_EMAILS_KEY) || '[]');
            const filtered = approved.filter(e => e !== email.toLowerCase());
            localStorage.setItem(this.APPROVED_EMAILS_KEY, JSON.stringify(filtered));
            showAlert(`❌ Approval revoked for ${email}`, 'warning');
            this.refreshAdminPanel();
        } catch (e) {
            showAlert('Failed to revoke approval', 'error');
        }
    }

    /**
     * Refresh admin panel
     */
    refreshAdminPanel() {
        // Implement panel refresh logic if needed
        console.log('[EmailAuth] Admin panel refreshed');
    }
}

// Export singleton instance
window.EmailAuthSystem = new EmailAuthSystem();

// Initialize auth on page load - MUST show sign-in UI first
document.addEventListener('DOMContentLoaded', () => {
    console.log('[EmailAuth] Page loaded, initializing authentication...');
    
    // Always show sign-in UI on load (until user is authenticated)
    if (window.EmailAuthSystem) {
        // Check if user is already signed in
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            console.log('[EmailAuth] User already signed in');
            // Firebase will handle this through onAuthStateChanged
        } else {
            console.log('[EmailAuth] No user signed in, showing sign-in UI');
            window.EmailAuthSystem.showSignInUI();
        }
    }
});
