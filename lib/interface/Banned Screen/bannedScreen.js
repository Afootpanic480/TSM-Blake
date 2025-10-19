// Banned Screen Management

/**
 * Shows the banned user screen with the provided ban information
 * @param {Object} banInfo - The ban information object
 * @param {string} banInfo.reason - The reason for the ban
 * @param {string} banInfo.banLength - When the ban will be lifted
 */
function showBannedScreen(banInfo) {
    // Clear any existing alerts or messages
    const alerts = document.querySelectorAll('.alert, .alert-message, .alert-container, .global-alert');
    alerts.forEach(alert => {
        alert.style.display = 'none';
    });
    
    // Hide any global alert containers
    const alertContainers = document.querySelectorAll('.alert-container, .global-alerts');
    alertContainers.forEach(container => {
        container.style.display = 'none';
    });
    
    // Create the overlay if it doesn't exist
    let overlay = document.getElementById('bannedOverlay');
    
    if (!overlay) {
        // Create the overlay element
        overlay = document.createElement('div');
        overlay.id = 'bannedOverlay';
        overlay.className = 'visible';
        
        // Create the banned container
        const container = document.createElement('div');
        container.className = 'banned-container';
        
        // Add the banned icon
        const icon = document.createElement('div');
        icon.className = 'banned-icon';
        icon.innerHTML = '🚫';
        
        // Add the title
        const title = document.createElement('h1');
        title.className = 'banned-title';
        title.textContent = 'Account Banned';
        
        // Add the reason section
        const reasonSection = document.createElement('div');
        reasonSection.className = 'banned-reason';
        
        const reasonTitle = document.createElement('span');
        reasonTitle.className = 'banned-reason-title';
        reasonTitle.textContent = 'Reason for Ban:';
        
        const reasonText = document.createElement('div');
        reasonText.className = 'banned-reason-text';
        reasonText.textContent = banInfo.reason || 'No reason provided';
        
        reasonSection.appendChild(reasonTitle);
        reasonSection.appendChild(reasonText);
        
        // Add ban details
        const details = document.createElement('div');
        details.className = 'banned-details';
        
        if (banInfo.banLength) {
            const banLength = document.createElement('div');
            banLength.className = 'banned-detail';
            banLength.innerHTML = `
                <i class="fas fa-calendar-times"></i>
                <span>Ban Duration: <strong>${banInfo.banLength}</strong></span>
            `;
            details.appendChild(banLength);
        }
        
        // Add note about blacklisting
        const note = document.createElement('div');
        note.className = 'banned-note';
        note.innerHTML = '⚠️ <strong>Important:</strong> Creating a new account during your ban will result in a permanent blacklist.';
        
        // Add logout button
        const logoutButton = document.createElement('button');
        logoutButton.className = 'logout-button';
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Log Out';
        logoutButton.onclick = function() {
            // Call the global logout function if it exists
            if (typeof handleLogout === 'function') {
                handleLogout();
            } else if (window.currentUserData) {
                // Fallback logout
                window.currentUserData.isLoggedIn = false;
                window.currentUserData.isBanned = false;
                window.location.reload();
            }
        };
        
        // Assemble the container
        container.appendChild(icon);
        container.appendChild(title);
        container.appendChild(reasonSection);
        container.appendChild(details);
        container.appendChild(note);
        container.appendChild(logoutButton);
        
        // Add container to overlay
        overlay.appendChild(container);
        
        // Add overlay to body
        document.body.appendChild(overlay);
    } else {
        // Update existing overlay with new ban info
        const reasonText = overlay.querySelector('.banned-reason-text');
        if (reasonText) {
            reasonText.textContent = banInfo.reason || 'No reason provided';
        }
        
        const banLength = overlay.querySelector('.banned-detail');
        if (banLength && banInfo.banLength) {
            banLength.innerHTML = `
                <i class="fas fa-calendar-times"></i>
                <span>Ban Duration: <strong>${banInfo.banLength}</strong></span>
            `;
        }
        
        // Show the overlay if it's hidden
        overlay.classList.add('visible');
    }
    
    // Prevent scrolling of the background
    document.body.style.overflow = 'hidden';
}

/**
 * Hides the banned user screen
 */
function hideBannedScreen() {
    const overlay = document.getElementById('bannedOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
        // Re-enable body scrolling
        document.body.style.overflow = '';
    }
}

// Export functions for use in other files
window.BannedScreen = {
    show: showBannedScreen,
    hide: hideBannedScreen
};
