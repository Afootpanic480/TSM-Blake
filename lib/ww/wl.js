// Initialize the blacklist manager
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize the blacklist manager
        if (typeof BlacklistManager !== 'undefined') {
            await new BlacklistManager().init();
        } else {
            console.warn('BlacklistManager not found. Falling back to basic checks.');
            await checkBlacklistFallback();
        }
        
        // Proceed with normal flow if not blacklisted
        focusUsernameIfNoInputActive();
        
    } catch (error) {
        console.error('Initialization error:', error);
        // Don't block the user if there's an error
        focusUsernameIfNoInputActive();
    }
});

// Fallback blacklist check if BlacklistManager is not available
async function checkBlacklistFallback() {
    try {
        const url = window.location.href;
        const userMatch = url.match(/Users\/([^\/]+)/i);
        if (!userMatch) return;
        
        const pcUsername = userMatch[1];
        const response = await fetch(blGasUrl, { mode: 'cors' });
        if (!response.ok) return;
            
        const data = await response.json();
        const usernames = data.usernames || [];
        const isBlacklisted = usernames.some(name => name.toLowerCase() === pcUsername.toLowerCase());
        
        if (isBlacklisted) {
            // Create style element for blacklist overlay
            const style = document.createElement('style');
            style.textContent = `
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');
                
                #blacklistOverlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(ellipse at center, #1a0000 0%, #000000 100%);
                    z-index: 2147483647;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    color: #ff4d4d;
                    font-family: 'Orbitron', 'Arial Black', sans-serif;
                    text-align: center;
                    padding: 20px;
                    overflow: hidden;
                }
                
                .blacklist-container {
                    background: rgba(10, 0, 0, 0.9);
                    border: 2px solid #ff0000;
                    border-radius: 10px;
                    padding: 30px 40px;
                    max-width: 700px;
                    width: 90%;
                    box-shadow: 0 0 40px rgba(255, 0, 0, 0.5);
                    position: relative;
                    overflow: hidden;
                }
                
                .blacklist-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #ff0000, #ff6b6b, #ff0000);
                    background-size: 200% 100%;
                    animation: gradient 3s ease infinite;
                }
                
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                
                .blacklist-icon {
                    font-size: 80px;
                    margin-bottom: 20px;
                    text-shadow: 0 0 20px #ff0000;
                }
                
                .blacklist-title {
                    font-size: 2.8rem;
                    margin: 0 0 20px 0;
                    color: #ff4d4d;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    text-shadow: 0 0 10px rgba(255, 0, 0, 0.7);
                    position: relative;
                    display: inline-block;
                }
                
                .blacklist-title::after {
                    content: '';
                    position: absolute;
                    bottom: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100px;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, #ff0000, transparent);
                }
                
                .blacklist-message {
                    font-size: 1.3rem;
                    line-height: 1.6;
                    margin: 25px 0;
                    color: #ff9999;
                }
                
                .blacklist-warning {
                    background: rgba(255, 0, 0, 0.15);
                    border-left: 4px solid #ff0000;
                    padding: 15px 20px;
                    margin: 25px 0;
                    text-align: left;
                    border-radius: 0 8px 8px 0;
                    font-size: 1.1rem;
                    color: #ffb3b3;
                    position: relative;
                    overflow: hidden;
                }
                
                .blacklist-warning::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.1), transparent);
                    transform: translateX(-100%);
                    animation: shine 3s infinite;
                }
                
                @keyframes shine {
                    100% { transform: translateX(100%); }
                }
                
                .blacklist-note {
                    font-size: 0.9rem;
                    color: #ff8080;
                    margin-top: 25px;
                    font-style: italic;
                    opacity: 0.8;
                }
                
                body, html {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    overflow: hidden !important;
                }
                
                * {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    -webkit-touch-callout: none;
                    -khtml-user-select: none;
                }
            `;
            
            // Create overlay container
            const overlay = document.createElement('div');
            overlay.id = 'blacklistOverlay';
            overlay.innerHTML = `
                <div class="blacklist-container" style="">
                    <div class="blacklist-icon">🚫</div>
                    <h1 class="blacklist-title">ACCESS TERMINATED</h1>
                    <div class="blacklist-message">
                        Your account has been <strong>permanently restricted</strong> from accessing this service.
                    </div>
                    <div class="blacklist-warning">
                        <strong>SECURITY VIOLATION: Our systems detected that you were either a teacher or you were blocked manually by an admin.</strong>
                        <br><br>
                        All activities have been logged to us.
                    </div>
                    <div class="blacklist-note">
                        Further attempts to access this system can result in further restrictions.
                    </div>
                </div>
            `;
            
            // Add styles and overlay to the document
            document.head.appendChild(style);
            document.body.innerHTML = '';
            document.body.appendChild(overlay);
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.documentElement.style.overflow = 'hidden';
            
            // Prevent interactions
            const preventInteraction = (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            };
            
            // Block keyboard input
            document.addEventListener('keydown', preventInteraction, true);
            
            // Block context menu
            document.addEventListener('contextmenu', preventInteraction);
            
            // Block clicks
            document.addEventListener('click', preventInteraction, true);
            
            // Prevent page unload
            window.onbeforeunload = () => 'You are not allowed to leave this page.';
            
            // Block navigation
            if (window.history) {
                window.history.pushState(null, document.title, window.location.href);
                window.onpopstate = () => {
                    window.history.pushState(null, document.title, window.location.href);
                    return false;
                };
            }
            
            return; // Stop further execution
        }
    } catch (error) {
        console.error('Error in blacklist check:', error);
        // Don't block the user if there's an error checking blacklist
    }
}

// Focus username field if no input is active
function focusUsernameIfNoInputActive() {
    const activeElement = document.activeElement;
    if (!activeElement || activeElement.tagName === 'BODY') {
        const usernameInput = document.querySelector('input[type="text"], input[type="email"]');
        if (usernameInput) {
            usernameInput.focus();
        }
    }
}