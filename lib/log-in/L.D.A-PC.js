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
  
  // Lock current form height to avoid shrinking when fields disappear
  if (loginForm) {
    const currentHeight = loginForm.offsetHeight;
    if (!loginForm.dataset.originalMinHeight) {
      loginForm.dataset.originalMinHeight = loginForm.style.minHeight || '';
    }
    loginForm.style.minHeight = (currentHeight * 0.2) + 'px';
  }
  // Also lock password box height
  if (passwordBox) {
    const pbHeight = passwordBox.offsetHeight;
    if (!passwordBox.dataset.originalHeight) {
      passwordBox.dataset.originalHeight = passwordBox.style.height || '';
    }
    passwordBox.style.height = (pbHeight * 0.6) + 'px';
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
  addElementToFade('.info-card');
  addElementToFade('.branding-logo');
  addElementToFade('.login-header');
  
  
  // Filter out any null/undefined values
  const filteredElements = elementsToHide.filter(el => el !== null && el !== undefined);
  const filteredFadeElements = elementsToFade.filter(el => el !== null && el !== undefined);
  
  // Set up the form container
  if (loginForm) {
    loginForm.style.position = 'relative';
    loginForm.style.minHeight = '400px';
  }
  
  // Add loading state styles if they don't exist
  const styleId = 'login-form-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .login-loading {
        position: absolute;
        bottom: -15px;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        padding: 40px 0;
        text-align: center;
        opacity: 0;
        animation: fadeIn 0.3s ease forwards;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        margin-top: 0px;
      }
      
      /* Ensure the form has enough height to contain the loading animation */
      #loginForm {
        min-height: 750px;
        position: relative;
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
        transition: all 0.3s ease;
      }
      .login-dots.success .login-dot {
        background: #43b581;
        box-shadow: 0 0 15px rgba(67, 181, 129, 0.7);
        animation: none !important;
        transform: scale(1.2);
      }
      .login-dots.success .login-dot:nth-child(1) { transform: translateY(-5px) scale(1.2); }
      .login-dots.success .login-dot:nth-child(2) { transform: translateY(-10px) scale(1.4); }
      .login-dots.success .login-dot:nth-child(3) { transform: translateY(-5px) scale(1.2); }
      .login-dot:nth-child(1) { animation: pulse 1.5s infinite 0s; }
      .login-dot:nth-child(2) { animation: pulse 1.5s infinite 0.5s; }
      .login-dot:nth-child(3) { animation: pulse 1.5s infinite 1s; }
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
        0%, 100% { opacity: 0.4; transform: scale(0.9); }
        50% { opacity: 1; transform: scale(1.1); }
      }
      @keyframes fadeIn {
        to { opacity: 1; }
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
  
  // Create loading container if it doesn't exist
  let loadingContainer = document.getElementById('loginLoadingContainer');
  if (!loadingContainer) {
    loadingContainer = document.createElement('div');
    loadingContainer.id = 'loginLoadingContainer';
    loadingContainer.className = 'login-loading';
    loadingContainer.style.display = 'none'; // Start hidden
    loadingContainer.innerHTML = `
      <div class="login-dots">
        <span class="login-dot"></span>
        <span class="login-dot"></span>
        <span class="login-dot"></span>
      </div>
      <p class="login-message">Logging in...</p>
    `;
    // Insert directly into the form
    if (loginForm) {
      loginForm.style.position = 'relative';
      loginForm.appendChild(loadingContainer);
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
        
        // Store original display so we can restore later, if not already stored
        if (!el.dataset.originalDisplay) {
          el.dataset.originalDisplay = window.getComputedStyle(el).display;
        }

        // Apply fading styles with transition (force reflow first)
        el.style.transition = 'opacity 0.3s ease';
        // Force reflow to ensure transition registers
        void el.offsetHeight;
        el.style.opacity = '0'; // Fade out completely
        el.style.pointerEvents = 'none'; // Prevent interaction
        el.classList.add('login-faded');

        // After fade-out completes, hide element from layout
        const onFadeEnd = (e) => {
          if (e.propertyName === 'opacity') {
            el.style.display = 'none';
            el.removeEventListener('transitionend', onFadeEnd);
          }
        };
        el.addEventListener('transitionend', onFadeEnd);
        // Fallback: ensure element is hidden even if transitionend never fires
        setTimeout(() => {
          if (el.style.display !== 'none') {
            el.style.display = 'none';
          }
        }, 400); // Slightly longer than transition duration
      }
    });
    
    // Show loading container
    loadingContainer.style.display = 'block';
    // Force reflow to ensure the animation starts
    void loadingContainer.offsetHeight;
    loadingContainer.style.opacity = '1';
    
    // Disable form interaction
    loginForm.style.pointerEvents = 'none';
  }

  // Function to restore form elements after login attempt (success or failure)
  const restoreFormElements = () => {
    const loginForm = document.getElementById('loginForm');
    const loadingContainer = document.getElementById('loginLoadingContainer');
    
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
      
      // Restore all stored styles
      const styles = ['display', 'visibility', 'opacity', 'position', 'zIndex'];
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
    
    // Hide loading container with fade out
    if (loadingContainer) {
      loadingContainer.style.opacity = '0';
      setTimeout(() => {
        loadingContainer.style.display = 'none';
      }, 300);
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
      
      console.log('Login successful, DM usernames:', window.currentUserData.dmUsernames);
      
      // Fetch and store user email asynchronously (don't block login)
      setTimeout(async () => {
        try {
          console.log('Fetching user email for settings...');
          const userEmails = await fetchUserEmails(username, signinResult.uuid);
          if (userEmails && userEmails.length > 0) {
            window.currentUserData.email = userEmails[0].email;
            console.log('User email fetched and stored:', window.currentUserData.email);
            
            // Trigger settings update if settings panel is currently open
            if (document.querySelector('.settings-panel.active#panel-account')) {
              if (typeof updateEmailDisplay === 'function') {
                updateEmailDisplay(window.currentUserData.email);
              }
            }
          } else {
            window.currentUserData.email = null;
            console.log('No email found for user');
          }
        } catch (emailError) {
          console.error('Failed to fetch user email during login:', emailError);
          window.currentUserData.email = null;
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
      const dots = loadingContainer.querySelector('.login-dots');
      const message = loadingContainer.querySelector('.login-message');
      
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