// This function is no longer needed as prohibition check is now handled by signinGasUrl
// Keeping as a stub for backward compatibility
async function checkUserExcluded(username) {
  console.warn('checkUserExcluded is deprecated - prohibition check is now handled by signinGasUrl');
  return {
    success: true,
    message: 'Using combined authentication endpoint',
    uuid: null // UUID will be provided by the signinGasUrl response
  };
}

function fadeInElements() {
  // Get the app logo and title elements
  const appLogo = document.getElementById('companyLogo');
  const infoButton = document.getElementById('infoPopupBtn');
  const appTitle = document.getElementById('companyText');
  
  const elementsToShow = [];
  
  // Add elements to show if they exist
  if (appLogo) elementsToShow.push(appLogo);
  if (infoButton) elementsToShow.push(infoButton);
  if (appTitle) elementsToShow.push(appTitle);
  
  // Fade in each element
  elementsToShow.forEach(el => {
    if (el) {
      // Make the element interactive again
      el.style.pointerEvents = 'auto';
      // Ensure the element is visible and set to fade in
      el.style.display = 'block';
      el.style.transition = 'opacity 0.5s ease';
      // Force reflow to ensure the transition takes effect
      void el.offsetHeight;
      // Set opacity to 1 to trigger the fade in
      el.style.opacity = '1';
    }
  });
  
  // Also make sure the login form is visible and interactive
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.style.display = 'block';
    loginForm.style.pointerEvents = 'auto';
  }
}

async function handleLoginWithLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const loginForm = document.getElementById('loginForm');
  const passwordBox = document.querySelector('.password-box');
  const appLogo = document.querySelector('.app-logo');
  
  // First check if the username/password boxes are filled
  if (!username || !password) {
    showAlert('Please enter both username and password.', 'error');
    return;
  }
  
  // Store original heights but don't lock them - let the container flex naturally
  if (loginForm && !loginForm.dataset.originalMinHeight) {
    loginForm.dataset.originalMinHeight = loginForm.style.minHeight || '';
  }
  if (passwordBox && !passwordBox.dataset.originalHeight) {
    passwordBox.dataset.originalHeight = passwordBox.style.height || '';
  }

  // First, collect all elements we want to hide or fade
  const elementsToHide = [];
  const elementsToFade = [];

  // Helper function to safely add elements to the hide array
  const addElementToHide = (selectorOrElement) => {
    if (!selectorOrElement) return;
    const element = typeof selectorOrElement === 'string' 
      ? document.querySelector(selectorOrElement) 
      : selectorOrElement;
    if (element && !elementsToHide.includes(element)) {
      elementsToHide.push(element);
    }
  };
  
  // Helper function to safely add elements to the fade array
  const addElementToFade = (selectorOrElement) => {
    if (!selectorOrElement) return;
    const element = typeof selectorOrElement === 'string' 
      ? document.querySelector(selectorOrElement) 
      : selectorOrElement;
    if (element && !elementsToFade.includes(element)) {
      elementsToFade.push(element);
    }
  };
  
  // Input fields and their labels - these will be hidden
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('loginButton');
  const forgotPasswordButton = document.getElementById('forgotPasswordContainer');
  
  if (usernameInput) {
    addElementToHide(usernameInput);
    const usernameLabel = document.querySelector('label[for="username"]') || document.getElementById('usernameLabel');
    addElementToHide(usernameLabel);
  }
  
  if (passwordInput) {
    addElementToHide(passwordInput);
    const passwordLabel = document.querySelector('label[for="password"]') || document.getElementById('passwordLabel');
    addElementToHide(passwordLabel);
  }

  if (loginButton) {
    addElementToHide(loginButton);
  }

  if (forgotPasswordButton) {
    addElementToHide(forgotPasswordButton);
  }

  if (companyText) {
    addElementToFade(companyText);
  }
  if (companyLogo) {
    addElementToFade(companyLogo);
  }
  if (infoPopupBtn) {
    addElementToFade(infoPopupBtn);
  }
  
  // Form controls - these will be hidden
  addElementToFade('button[type="submit"]');
  addElementToHide('.register');
  
  // Branding and info elements - these will be faded
  addElementToFade('.login-logo');
  addElementToFade('.login-title');
  // Add ALL info cards, not just the first one
  document.querySelectorAll('.info-card').forEach(card => addElementToFade(card));
  addElementToFade('.branding-logo');
  addElementToFade('.login-header');
  
  
  // Filter out any null/undefined values
  const filteredElements = elementsToHide.filter(el => el !== null && el !== undefined);
  const filteredFadeElements = elementsToFade.filter(el => el !== null && el !== undefined);
  
  // Set up the form container - don't set min-height here
  if (loginForm) {
    loginForm.style.position = 'relative';
  }
  
  // Add loading state styles if they don't exist
  const styleId = 'login-form-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Loading overlay - blends with form, no separate background */
      .login-loading-overlay {
        position: relative;
        width: 100%;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 100;
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        margin-top: -45px;
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s,
                    max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .login-loading-overlay.active {
        display: flex;
        opacity: 1;
        max-height: 120px;
      }
      
      .login-loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px 40px;
        transform: scale(0.9);
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s,
                    opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
      }
      
      .login-loading-overlay.active .login-loading-content {
        transform: scale(1);
        opacity: 1;
      }
      
      .password-box {
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .login-dots {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin: 20px 0;
      }
      
      .login-dot {
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #5865f2;
        box-shadow: 0 0 10px rgba(88, 101, 242, 0.5);
        transition: all 0.3s ease;
      }
      
      .login-dots.success .login-dot {
        background: #43b581;
        box-shadow: 0 0 15px rgba(67, 181, 129, 0.7);
        animation: none !important;
        transform: scale(1.2);
      }
      
      .login-dots.success .login-dot:nth-child(1) { 
        transform: translateY(-5px) scale(1.2); 
      }
      .login-dots.success .login-dot:nth-child(2) { 
        transform: translateY(-10px) scale(1.4); 
      }
      .login-dots.success .login-dot:nth-child(3) { 
        transform: translateY(-5px) scale(1.2); 
      }
      
      .login-dot:nth-child(1) { 
        animation: pulse 1.8s ease-in-out infinite 0s; 
      }
      .login-dot:nth-child(2) { 
        animation: pulse 1.8s ease-in-out infinite 0.6s; 
      }
      .login-dot:nth-child(3) { 
        animation: pulse 1.8s ease-in-out infinite 1.2s; 
      }
      
      .login-message {
        color: #b9bbbe;
        margin-top: 15px;
        font-size: 1.2em;
        font-weight: 500;
        transition: all 0.3s ease;
      }
      
      .login-message.success {
        color: #43b581;
        text-shadow: 0 0 10px rgba(67, 181, 129, 0.5);
      }
      
      @keyframes pulse {
        0%, 100% { 
          opacity: 0.4; 
          transform: scale(0.9); 
        }
        50% { 
          opacity: 1; 
          transform: scale(1.1); 
        }
      }
      
      .login-hidden {
        opacity: 0;
        height: 0;
        overflow: hidden;
        margin: 0;
        padding: 0;
        pointer-events: none;
        transition: all 0.3s ease;
      }
      
      .login-disabled {
        pointer-events: none !important;
        cursor: default !important;
      }
      
      /* Ensure no focus states are visible for disabled inputs */
      .login-disabled:focus,
      .login-disabled:active,
      .login-disabled:focus-visible {
        outline: none !important;
        box-shadow: none !important;
        border-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Create loading overlay if it doesn't exist
  let loadingOverlay = document.getElementById('loginLoadingOverlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loginLoadingOverlay';
    loadingOverlay.className = 'login-loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="login-loading-content">
        <div class="login-dots">
          <span class="login-dot"></span>
          <span class="login-dot"></span>
          <span class="login-dot"></span>
        </div>
        <p class="login-message">Logging in...</p>
      </div>
    `;
    // Append to password-box so it stays inside the container
    const passwordBox = document.querySelector('.password-box');
    if (passwordBox) {
      // Insert at the end of password-box, after the loginForm
      passwordBox.appendChild(loadingOverlay);
    } else if (loginForm) {
      loginForm.appendChild(loadingOverlay);
    }
  } else {
    // Reset the overlay if it already exists
    const dots = loadingOverlay.querySelector('.login-dots');
    const message = loadingOverlay.querySelector('.login-message');
    if (dots) dots.classList.remove('success');
    if (message) {
      message.textContent = 'Logging in...';
      message.classList.remove('success');
    }
  }
  
  // Show loading state
  if (loginForm) {
    // Disable all form inputs and remove focus
    const inputs = loginForm.querySelectorAll('input, button, a');
    inputs.forEach(input => {
      input.disabled = true;
      input.blur(); // Remove focus
      input.style.pointerEvents = 'none';
      input.style.cursor = 'default';
      
      // Remove any active states or underlines
      input.classList.add('login-disabled');
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        label.classList.add('login-disabled');
      }
    });
    
    // Hide elements that should be completely hidden
    filteredElements.forEach(el => {
      if (el && el.nodeType === 1) { // Only process element nodes
        // Store original styles if not already stored
        if (!el.dataset.originalDisplay) {
          el.dataset.originalDisplay = window.getComputedStyle(el).display;
          el.dataset.originalOpacity = window.getComputedStyle(el).opacity;
          el.dataset.originalVisibility = window.getComputedStyle(el).visibility;
          el.dataset.originalPosition = window.getComputedStyle(el).position;
          el.dataset.originalZIndex = window.getComputedStyle(el).zIndex;
          el.dataset.originalTransition = window.getComputedStyle(el).transition;
        }
        
        // Apply hiding styles with transition
        el.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.position = 'absolute';
        el.style.zIndex = '-1';
        el.style.pointerEvents = 'none';
        el.classList.add('login-hidden');
      }
    });
    
    // Fade elements that should remain visible but dimmed
    filteredFadeElements.forEach(el => {
      if (el && el.nodeType === 1) { // Only process element nodes
        // Store original styles if not already stored
        if (!el.dataset.originalOpacity) {
          el.dataset.originalOpacity = window.getComputedStyle(el).opacity;
          el.dataset.originalTransition = window.getComputedStyle(el).transition;
        }
        
        // Store original display and position so we can restore later
        if (!el.dataset.originalDisplay) {
          el.dataset.originalDisplay = window.getComputedStyle(el).display;
        }
        if (!el.dataset.originalPosition) {
          el.dataset.originalPosition = window.getComputedStyle(el).position;
        }

        // Apply fading styles with transition (force reflow first)
        el.style.transition = 'opacity 0.3s ease';
        // Force reflow to ensure transition registers
        void el.offsetHeight;
        el.style.opacity = '0'; // Fade out completely
        el.style.pointerEvents = 'none'; // Prevent interaction
        el.classList.add('login-faded');

        // After fade-out completes, hide element but preserve position
        const onFadeEnd = (e) => {
          if (e.propertyName === 'opacity') {
            // For fixed positioned elements, use visibility instead of display
            const position = window.getComputedStyle(el).position;
            if (position === 'fixed' || position === 'absolute') {
              el.style.visibility = 'hidden';
            } else {
              el.style.display = 'none';
            }
            el.removeEventListener('transitionend', onFadeEnd);
          }
        };
        el.addEventListener('transitionend', onFadeEnd);
        // Fallback: ensure element is hidden even if transitionend never fires
        setTimeout(() => {
          const position = window.getComputedStyle(el).position;
          if (position === 'fixed' || position === 'absolute') {
            if (el.style.visibility !== 'hidden') {
              el.style.visibility = 'hidden';
            }
          } else {
            if (el.style.display !== 'none') {
              el.style.display = 'none';
            }
          }
        }, 400); // Slightly longer than transition duration
      }
    });
    
    // Show loading overlay with smooth fade after elements fade out
    setTimeout(() => {
      const overlay = document.getElementById('loginLoadingOverlay');
      const passwordBox = document.querySelector('.password-box');
      if (overlay) {
        // Add active class to trigger the fade-in animation
        overlay.classList.add('active');
      }
      // Add loading class to password-box for smooth container animation
      if (passwordBox) {
        passwordBox.classList.add('loading');
      }
    }, 300); // Wait for fade-out to complete
    
    // Disable form interaction
    loginForm.style.pointerEvents = 'none';
  }

  // Function to restore form elements after login attempt (success or failure)
  const restoreFormElements = () => {
    const loginForm = document.getElementById('loginForm');
    const loadingOverlay = document.getElementById('loginLoadingOverlay');
    const passwordBox = document.querySelector('.password-box');
    
    // Restore original min-height if we changed it earlier
  if (loginForm && loginForm.dataset.originalMinHeight !== undefined) {
    loginForm.style.minHeight = loginForm.dataset.originalMinHeight;
    delete loginForm.dataset.originalMinHeight;
  }
  // Restore password box height
  if (passwordBox && passwordBox.dataset.originalHeight !== undefined) {
    passwordBox.style.height = passwordBox.dataset.originalHeight;
    delete passwordBox.dataset.originalHeight;
  }

  // Re-enable all form inputs
    if (loginForm) {
      const inputs = loginForm.querySelectorAll('input, button, a');
      inputs.forEach(input => {
        input.disabled = false;
        input.style.pointerEvents = '';
        input.style.cursor = '';
        input.classList.remove('login-disabled');
        
        // Restore label states
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
          label.classList.remove('login-disabled');
        }
      });
    }
    
    // Function to restore an element's styles
    const restoreElement = (el) => {
      if (!el || el.nodeType !== 1) return;
      
      // Restore transition first to ensure smooth animation
      if (el.dataset.originalTransition) {
        el.style.transition = el.dataset.originalTransition;
        delete el.dataset.originalTransition;
      }
      
      // Restore all stored styles including transform
      const styles = ['display', 'visibility', 'opacity', 'position', 'zIndex', 'transform', 'top', 'left'];
      styles.forEach(style => {
        const dataName = `original${style.charAt(0).toUpperCase() + style.slice(1)}`;
        if (el.dataset[dataName] !== undefined) {
          el.style[style] = el.dataset[dataName];
          delete el.dataset[dataName];
        } else {
          el.style[style] = ''; // Reset to default if no stored value
        }
      });
      
      // Reset other properties
      el.style.pointerEvents = '';
      el.classList.remove('login-hidden');
    };
    
    // Restore all hidden elements
    const hiddenElements = document.querySelectorAll('.login-hidden');
    hiddenElements.forEach(restoreElement);
    
    // Also restore any elements in filteredElements that might have been missed
    const formElements = loginForm ? Array.from(loginForm.querySelectorAll('*')) : [];
    const allElements = Array.from(new Set([...filteredElements, ...formElements]));
    allElements.forEach(el => {
      if (el && el.nodeType === 1 && !el.classList.contains('login-hidden')) {
        // Check if this element has any stored styles
        const hasStoredStyles = Array.from(el.attributes).some(attr => 
          attr.name.startsWith('data-original')
        );
        
        if (hasStoredStyles) {
          restoreElement(el);
        }
      }
    });
    
    // Explicitly restore info cards
    const infoCards = document.querySelectorAll('.info-card');
    infoCards.forEach(card => {
      if (card) {
        restoreElement(card);
        card.style.visibility = 'visible';
        card.style.opacity = '1';
        card.style.display = '';
        card.classList.remove('login-faded');
      }
    });
    
    // Explicitly restore branding elements
    // Note: companyText and companyLogo are children of .company-logo, so restore the parent container
    const companyLogoContainer = document.querySelector('.company-logo');
    const infoBtn = document.getElementById('infoPopupBtn');
    
    // Restore the company logo container (which contains both logo img and text)
    if (companyLogoContainer) {
      restoreElement(companyLogoContainer);
      // Ensure fixed positioning is maintained
      const computedPosition = window.getComputedStyle(companyLogoContainer).position;
      if (computedPosition !== 'fixed') {
        companyLogoContainer.style.position = 'fixed';
      }
      companyLogoContainer.style.display = 'flex';
      companyLogoContainer.style.visibility = 'visible';
      companyLogoContainer.style.opacity = '1';
      companyLogoContainer.style.pointerEvents = '';
      companyLogoContainer.classList.remove('login-faded');
      
      // Clear any inline z-index that might have been set during hiding
      if (companyLogoContainer.style.zIndex === '-1') {
        companyLogoContainer.style.zIndex = '';
      }
      
      // Also restore children if they were individually affected
      const companyText = document.getElementById('companyText');
      const companyLogo = document.getElementById('companyLogo');
      [companyText, companyLogo].forEach(child => {
        if (child) {
          restoreElement(child);
          child.style.visibility = 'visible';
          child.style.opacity = '1';
          child.style.pointerEvents = '';
          child.style.display = '';
          child.classList.remove('login-faded');
        }
      });
    }
    
    // Restore info button
    if (infoBtn) {
      restoreElement(infoBtn);
      const computedPosition = window.getComputedStyle(infoBtn).position;
      if (computedPosition !== 'fixed') {
        infoBtn.style.position = 'fixed';
      }
      infoBtn.style.display = 'flex';
      infoBtn.style.visibility = 'visible';
      infoBtn.style.opacity = '1';
      infoBtn.style.pointerEvents = '';
      infoBtn.classList.remove('login-faded');
      
      if (infoBtn.style.zIndex === '-1') {
        infoBtn.style.zIndex = '';
      }
    }
    
    // Hide loading overlay with smooth fade
    if (loadingOverlay) {
      // Remove active class to trigger fade-out animation
      loadingOverlay.classList.remove('active');
    }
    
    // Remove loading class from password-box
    if (passwordBox) {
      passwordBox.classList.remove('loading');
    }
    
    // Re-enable form submission
    if (loginForm) {
      loginForm.style.pointerEvents = 'auto';
    }
  };

  const loginOperation = async () => {
    try {
      // Use the fully consolidated signinGasUrl that now handles authentication, prohibition check, and DM list
      const signinUrl = new URL(signinGasUrl);
      signinUrl.searchParams.append('username', username);
      signinUrl.searchParams.append('password', password);

      const signinResponse = await fetch(signinUrl);
      if (!signinResponse.ok) {
        throw new Error(`HTTP error! status: ${signinResponse.status}`);
      }

      const signinResult = await signinResponse.json();
      console.log('Login response:', signinResult);

      // Handle different status responses from the consolidated endpoint
      if (signinResult.status === 'prohibited') {
        // Update user data to reflect banned status
        if (window.currentUserData) {
          window.currentUserData.isBanned = true;
          window.currentUserData.bannedInfo = {
            reason: signinResult.reason || 'No reason provided',
            banLength: signinResult.banLength,
            banDate: signinResult.banDate || new Date().toISOString()
          };
        }
        
        // Show the banned screen
        if (window.BannedScreen) {
          window.BannedScreen.show({
            reason: signinResult.reason || 'No reason provided',
            banLength: signinResult.banLength,
            banDate: signinResult.banDate || new Date().toISOString()
          });
        } else {
          console.error('BannedScreen component not found');
          // Fallback to alert if BannedScreen is not available
          let banMessage = `Account Banned.\n\nReason: ${signinResult.reason || 'No reason provided'}`;
          if (signinResult.banLength) {
            banMessage += `\n\nUnbanned on: ${signinResult.banLength}`;
          }
          alert(banMessage);
        }
        
        setTimeout(restoreFormElements, 500); // Small delay for better UX
        return {
          success: false,
          showLogin: false, // Don't show login form when banned
          preventDefault: true // Prevent default error handling
        };
      }
      
      if (signinResult.status === 'not_whitelisted' || signinResult.status === 'incorrect') {
        setTimeout(restoreFormElements, 500); // Small delay for better UX
        return {
          success: false,
          message: 'Incorrect username or password.',
          showLogin: true
        };
      }
      
      if (signinResult.status !== 'success' && signinResult.status !== 'allowed') {
        setTimeout(restoreFormElements, 500); // Small delay for better UX
        return {
          success: false,
          message: 'Authentication failed. Please try again.',
          showLogin: true
        };
      }
      
      // If we get here, login was successful
      // Persist user session info in memory
      window.currentUserData = window.currentUserData || {};
      window.currentUserData.uuid = signinResult.uuid;
      window.currentUserData.username = username;
      window.currentUserData.isLoggedIn = true;
      window.currentUserData.dmUsernames = signinResult.dmUsernames || [];
      
      // Load profile data from Firebase (bio, displayName, bannerColor, profilePicture)
      if (typeof window.getFirebaseProfile === 'function') {
        setTimeout(async () => {
          try {
            const profile = await window.getFirebaseProfile(username);
            if (profile) {
              window.currentUserData.bio = profile.bio || '';
              window.currentUserData.displayName = profile.displayName || username;
              window.currentUserData.bannerColor = profile.bannerColor || '#5865f2';
              window.currentUserData.permission = profile.permission || 'DEFAULT';
              window.currentUserData.profilePicture = profile.profilePicture || '';
              
              // Update sidebar avatar if custom profile picture exists
              if (profile.profilePicture) {
                const sidebarAvatar = document.querySelector('.sidebar-footer-inner .user-avatar');
                if (sidebarAvatar) {
                  sidebarAvatar.src = profile.profilePicture;
                }
              }
              
              console.log('✅ Profile data loaded from Firebase:', profile);
            }
          } catch (e) {
            console.warn('⚠️ Could not load profile from Firebase:', e);
          }
        }, 500);
      }
      
      console.log('Login successful, DM usernames:', window.currentUserData.dmUsernames);
      
      // Update sidebar with username and avatar
      const sidebarUsername = document.getElementById('sidebarProfileUsername');
      if (sidebarUsername) sidebarUsername.textContent = username;
      
      // Update sidebar avatar if custom profile picture exists
      const sidebarAvatar = document.querySelector('.sidebar-footer-inner .user-avatar');
      if (sidebarAvatar && window.currentUserData.profilePicture) {
        sidebarAvatar.src = window.currentUserData.profilePicture;
      }
      
      // Fetch and store user email asynchronously (don't block login)
      setTimeout(() => {
        if (typeof resolveAndSyncUserEmail === 'function') {
          resolveAndSyncUserEmail(username, signinResult.uuid);
        } else {
          console.warn('resolveAndSyncUserEmail helper not ready; email may not sync.');
        }
      }, 100); // Small delay to let login complete first
      
      return {
        success: true,
        message: 'Login successful',
        uuid: signinResult.uuid,
        dmUsernames: window.currentUserData.dmUsernames
      };
    } catch (error) {
      console.error('Login error:', error);
      setTimeout(restoreFormElements, 500); // Small delay for better UX
      return { 
        success: false, 
        message: error.message || 'An error occurred during login. Please try again.'
      };
    }
  };

  const showMessagingInterface = () => {
    // Hide password container and show messaging interface
    document.getElementById('passwordContainer').style.display = 'none';
    document.getElementById('messagingContainer').style.display = 'block';
    document.getElementById('chatInput').focus();
    
    // Update username in the UI
    document.querySelectorAll('.username').forEach(el => {
      el.textContent = username;
    });
    // Immediately check pending friends after login
    if (typeof fetchAndUpdatePendingCount === 'function') {
      let pendingUUID = window.currentUserData && window.currentUserData.uuid;
      console.log('[Login] fetchAndUpdatePendingCount uuid at login:', pendingUUID);
      if (pendingUUID) {
        fetchAndUpdatePendingCount(pendingUUID);
      } else {
        // If uuid is not set yet, try again after a short delay (once)
        setTimeout(() => {
          let retryUUID = window.currentUserData && window.currentUserData.uuid;
          console.log('[Login][Retry] fetchAndUpdatePendingCount uuid after delay:', retryUUID);
          if (retryUUID) fetchAndUpdatePendingCount(retryUUID);
        }, 150);
      }
    }
    
    // Update sent message usernames
    document.querySelectorAll('.message.sent .message-username').forEach(el => {
      el.textContent = username;
    });
    
    // Display direct messages in the sidebar (just populate, don't open any DM)
    if (typeof displayDirectMessages === 'function') {
      console.log('Calling displayDirectMessages to populate sidebar');
      displayDirectMessages();
    } else {
      console.warn('displayDirectMessages function not found');
    }

    // Kick off permission prefetch in background for all DM usernames (non-blocking)
    try {
      const dmUsers = window.currentUserData && window.currentUserData.dmUsernames;
      if (typeof startPermissionChecks === 'function' && Array.isArray(dmUsers) && dmUsers.length) {
        startPermissionChecks(dmUsers);
      }
    } catch (e) {
      console.warn('startPermissionChecks failed:', e);
    }

    // Always default to home view after login
    if (typeof showHomeView === 'function') {
      showHomeView();
    }
  };

  try {
    const result = await loginOperation();
    
    // Handle login success
    if (result && result.success) {
      console.log('Login successful, showing success state');
      const overlay = document.getElementById('loginLoadingOverlay');
      const dots = overlay?.querySelector('.login-dots');
      const message = overlay?.querySelector('.login-message');
      
      if (dots && message) {
        // Update to success state
        dots.classList.add('success');
        message.textContent = 'Logged in!';
        message.classList.add('success');
        
        // Wait for animation to complete before showing messaging interface
        setTimeout(() => {
          showMessagingInterface();
        }, 1000);
      } else {
        // Fallback in case elements aren't found
        showMessagingInterface();
      }
      return;
    }
    
    // Handle login failure
    console.log('Login failed, showing login form again');
    restoreFormElements();
    
    // Show error message if available
    if (result && result.message) {
      showAlert(result.message, 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    // Restore form elements on error
    restoreFormElements();
    // Show generic error message
    showAlert('An error occurred during login. Please try again.', 'error');
    showAlert('An error occurred during login. Please try again.', 'error');
  }


}