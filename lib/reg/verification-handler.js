// Create completely custom input elements that can't be styled by CSS
function createCustomInputs() {
  const container = document.querySelector('.verification-code');
  if (!container) return;
  
  // Clear any existing inputs and reset container styles
  container.innerHTML = '';
  container.style.all = 'unset';
  container.style.display = 'flex';
  container.style.gap = '8px';
  container.style.justifyContent = 'center';
  container.style.margin = '20px 0';
  
  // Create or reuse a single hidden input for paste handling
  const existingPasteInputs = document.querySelectorAll('#verification-paste');
  if (existingPasteInputs.length > 1) {
    for (let i = 1; i < existingPasteInputs.length; i++) {
      const node = existingPasteInputs[i];
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }
  }
  let pasteInput = document.getElementById('verification-paste');
  if (!pasteInput) {
    pasteInput = document.createElement('input');
    pasteInput.type = 'text';
    pasteInput.id = 'verification-paste';
    pasteInput.style.position = 'absolute';
    pasteInput.style.opacity = '0';
    pasteInput.style.pointerEvents = 'none';
    pasteInput.style.height = '0';
    pasteInput.style.width = '0';
    pasteInput.style.overflow = 'hidden';
    document.body.appendChild(pasteInput);
  }
  
  // Create 6 custom inputs
  for (let i = 1; i <= 6; i++) {
    // Create a wrapper div for each input
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '40px';
    wrapper.style.height = '50px';
    
    // Create a fake input element
    const fakeInput = document.createElement('div');
    fakeInput.id = `code${i}-display`;
    fakeInput.style.cssText = `
      width: 100%;
      height: 100%;
      border: 2px solid #4a4a6a;
      border-radius: 8px;
      background: rgba(30, 30, 60, 0.5);
      color: #fff;
      text-align: center;
      line-height: 46px;
      font-size: 24px;
      font-weight: bold;
      cursor: text;
      user-select: none;
      transition: all 0.2s ease;
    `;
    
    // Create a hidden actual input for keyboard input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `code${i}`;
    input.name = `code${i}`;
    input.maxLength = 1;
    input.inputMode = 'numeric';
    input.pattern = '[0-9]*';
    input.autocomplete = 'off';
    input.style.cssText = `
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    `;
    
    // Update the display when input changes
    const updateDisplay = () => {
      fakeInput.textContent = input.value || '';
      fakeInput.style.border = '2px solid ' + (input.value ? '#5865f2' : '#4a4a6a');
      fakeInput.style.boxShadow = input === document.activeElement ? '0 0 0 2px rgba(88, 101, 242, 0.3)' : 'none';
    };
    
    // Sync fake input with real input
    input.addEventListener('input', (e) => {
      // Only allow numbers
      input.value = input.value.replace(/[^0-9]/g, '');
      updateDisplay();
      
      // Move to next input if a number was entered
      if (input.value && i < 6) {
        const nextInput = document.getElementById(`code${i + 1}`);
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    });
    
    // Handle focus/blur on the fake input
    fakeInput.addEventListener('click', () => {
      input.focus();
      input.select();
      updateDisplay();
    });
    
    // Handle paste event on the container
    if (i === 1) {
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text');
        if (/^\d+$/.test(pasteData)) {
          // Focus the paste input and set its value
          pasteInput.value = pasteData;
          // Move focus to the first input
          input.focus();
          // Trigger input event to handle the pasted data
          setTimeout(() => {
            const event = new Event('input', { bubbles: true });
            pasteInput.dispatchEvent(event);
          }, 0);
        }
      });
    }
    
    // Handle paste from the hidden input
    if (i === 1) {
      if (!pasteInput.dataset.listenerAttached) {
        pasteInput.addEventListener('input', (e) => {
          const pasteData = pasteInput.value.replace(/\D/g, '').substring(0, 6);
          if (pasteData.length > 0) {
            // Distribute the pasted digits to the input fields
            for (let j = 0; j < pasteData.length; j++) {
              const targetInput = document.getElementById(`code${j + 1}`);
              if (targetInput) {
                targetInput.value = pasteData[j];
                targetInput.dispatchEvent(new Event('input'));
              }
            }
            // Clear the paste input
            pasteInput.value = '';
            // Focus the last input with a value
            const lastInput = document.getElementById(`code${Math.min(pasteData.length, 6)}`);
            if (lastInput) lastInput.focus();
          }
        });
        pasteInput.dataset.listenerAttached = 'true';
      }
    }

    // Handle focus/blur on the real input
    input.addEventListener('focus', updateDisplay);
    input.addEventListener('blur', updateDisplay);
    
    // Handle keyboard navigation
    input.addEventListener('keydown', (e) => {
      // Handle backspace
      if (e.key === 'Backspace') {
        if (!input.value && i > 1) {
          // Move to previous input on backspace with empty value
          const prevInput = document.getElementById(`code${i - 1}`);
          if (prevInput) {
            prevInput.focus();
            prevInput.select();
          }
          e.preventDefault();
        } else if (input.value) {
          // Clear current input but stay on the same field
          input.value = '';
          updateDisplay();
          e.preventDefault();
        }
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
        e.preventDefault();
      }
      // Handle arrow keys
      else if (e.key === 'ArrowLeft' && i > 1) {
        const prevInput = document.getElementById(`code${i - 1}`);
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
        e.preventDefault();
      } 
      else if (e.key === 'ArrowRight' && i < 6) {
        const nextInput = document.getElementById(`code${i + 1}`);
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
        e.preventDefault();
      }
    });
    
    // Add elements to the DOM
    wrapper.appendChild(fakeInput);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
    
    // Initialize display
    updateDisplay();
  }
}

// Initialize custom inputs
function initCustomInputs() {
  createCustomInputs();
  
  // Re-create inputs if verification form is shown
  const verificationForm = document.getElementById('verificationForm');
  if (verificationForm) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style') {
          const display = window.getComputedStyle(verificationForm).display;
          if (display === 'block') {
            // Small delay to ensure the form is fully visible
            setTimeout(createCustomInputs, 50);
          }
        }
      });
    });
    
    observer.observe(verificationForm, { attributes: true });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  if (window.__verificationDomReadyRan) return;
  window.__verificationDomReadyRan = true;
  // Initialize custom verification inputs
  initCustomInputs();
  
  // Add transition styles for smooth form transitions
  const style = document.createElement('style');
  style.textContent = `
    #verificationForm, #registerForm {
      transition: opacity 0.2s ease-in-out;
    }
    #verificationForm {
      opacity: 1;
    }
    .resend-code {
      transition: opacity 0.2s ease, color 0.2s ease;
    }
  `;
  document.head.appendChild(style);
  
  // Handle verification form submission
  const verifyButton = document.getElementById('verifyButton');
  if (verifyButton) {
    verifyButton.addEventListener('click', handleVerificationWithLoading);
  }

  // Handle back to registration link
  const backLink = document.getElementById('backToRegister');
  if (backLink) {
    backLink.addEventListener('click', function(e) {
      e.preventDefault();
      showRegister();
      return false;
    });
  }
  
  // Initialize custom inputs for verification form
  
  // Focus first input when verification form is shown
  const verificationForm = document.getElementById('verificationForm');
  if (verificationForm) {
    // Check if form is already visible
    if (window.getComputedStyle(verificationForm).display === 'block') {
      const firstInput = document.getElementById('code1');
      if (firstInput) firstInput.focus();
    }
    
    // Set up observer for when form becomes visible
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style') {
          const display = window.getComputedStyle(verificationForm).display;
          if (display === 'block') {
            // Small delay to ensure inputs are created
            setTimeout(() => {
              const firstInput = document.getElementById('code1');
              if (firstInput) firstInput.focus();
            }, 50);
          }
        }
      });
    });
    
    observer.observe(verificationForm, { attributes: true });
  }
});

// Global flag to prevent multiple submissions
let isVerificationInProgress = false;
let resendCooldown = 0; // Start with 0 to allow immediate first resend
let resendTimer = null;
let lastResendTime = 0; // Track when the last resend was attempted

/**
 * Submits the verification code for validation
 */
async function submitVerificationCode() {
  if (isVerificationInProgress) return;
  
  // Get the verification code from input fields
  let verificationCode = '';
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`code${i}`);
    if (input) {
      verificationCode += input.value || '';
    }
  }

  // Validate code
  if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
    showVerificationMessage('Please enter a valid 6-digit code', 'error');
    return;
  }

  // Get stored registration data
  const registrationData = JSON.parse(sessionStorage.getItem('tempRegistration'));
  if (!registrationData || !registrationData.email) {
    showVerificationMessage('Session expired. Please register again.', 'error');
    setTimeout(() => showRegister(), 2000);
    return;
  }

  isVerificationInProgress = true;
  showVerificationMessage('Verifying code...', 'info');
  
  try {
    // Call the verification function from A.A.C.A.R-VC.js
    const result = await verifyCode(registrationData.email, verificationCode);
    
    if (result.success) {
      showVerificationMessage('Verification successful!', 'success');
      // Get the complete registration data from session storage
      const registrationData = JSON.parse(sessionStorage.getItem('tempRegistration'));
      if (!registrationData || !registrationData.username || !registrationData.email || !registrationData.password) {
        console.error('Incomplete registration data in sessionStorage:', registrationData);
        throw new Error('Registration data is incomplete. Please try registering again.');
      }
      
      // Use password as-is, let GAS handle encoding/decoding
      const password = registrationData.password;
      
      console.log('Registration data from sessionStorage:', {
        username: registrationData.username,
        email: registrationData.email,
        passwordLength: password ? password.length : 0
      });
      
      // Ensure the global registration data is up to date with decoded password
      if (window.storeRegistrationData) {
        console.log('Calling storeRegistrationData with:', {
          username: registrationData.username,
          email: registrationData.email,
          passwordLength: password ? password.length : 0
        });
        
        // Store in global registrationData object
        window.registrationData = {
          username: registrationData.username,
          email: registrationData.email,
          password: password
        };
        
        // Also call storeRegistrationData to ensure compatibility
        window.storeRegistrationData(
          registrationData.username,
          registrationData.email,
          password // Use the decoded password
        );
        
        console.log('Global registrationData after update:', window.registrationData);
      } else {
        console.error('storeRegistrationData function not found');
        throw new Error('Registration service is not available. Please try again later.');
      }
      
      // Submit the registration directly with the data we have
      console.log('Submitting registration with data from sessionStorage');
      
      try {
        // Ensure password is properly encoded for URL
        const encodedPassword = encodeURIComponent(password);
        const requestBody = `username=${encodeURIComponent(registrationData.username)}&email=${encodeURIComponent(registrationData.email)}&password=${encodedPassword}`;
        
        console.log('Registration request body:', {
          username: registrationData.username,
          email: registrationData.email,
          passwordLength: password.length,
          encodedPasswordLength: encodedPassword.length
        });
        
        const response = await fetch(registrationGAS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: requestBody,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.text();
        if (result.includes('error')) {
          throw new Error(result);
        }
        
        // Clear the verification code and registration data from storage
        sessionStorage.removeItem('verificationCodeSent');
        sessionStorage.removeItem('tempRegistration');
        sessionStorage.removeItem('verificationInProgress');
        
        // Show success message and redirect to login
        showVerificationMessage('Registration successful! Redirecting to login...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        console.error('Error submitting registration:', error);
        throw new Error('Error submitting registration: ' + (error.message || 'Please ensure the server is accessible and try again.'));
      }
    } else {
      throw new Error(result.message || 'Verification failed');
    }
  } catch (error) {
    console.error('Verification error:', error);
    showVerificationMessage(error.message || 'An error occurred during verification', 'error');
  } finally {
    isVerificationInProgress = false;
  }
}

/**
 * Goes back to the registration form
 */
function goBackToRegister(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  console.log('Going back to registration form');
  
  const verificationForm = document.getElementById('verificationForm');
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  
  // Clear verification form data
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`code${i}`);
    if (input) input.value = '';
    const display = document.getElementById(`code${i}-display`);
    if (display) display.textContent = '';
  }
  
  // Clear verification messages
  const messageElement = document.getElementById('verificationMessage');
  if (messageElement) {
    messageElement.textContent = '';
    messageElement.className = '';
  }
  
  // Hide verification form completely
  if (verificationForm) {
    verificationForm.style.display = 'none';
    verificationForm.style.opacity = '0';
    verificationForm.style.pointerEvents = 'none';
  }
  
  // Hide login form
  if (loginForm) {
    loginForm.style.display = 'none';
  }
  
  // Show and restore register form to full visibility
  if (registerForm) {
    console.log('Restoring register form visibility');
    
    // Show the register form
    registerForm.style.display = 'block';
    registerForm.style.opacity = '1';
    registerForm.style.pointerEvents = 'auto';
    
    // Ensure the password box container is visible
    const passwordBox = registerForm.querySelector('.password-box');
    if (passwordBox) {
      passwordBox.style.display = 'block';
      passwordBox.style.opacity = '1';
    }
    
    // Make sure the app logo section is visible
    const appLogo = registerForm.querySelector('.app-logo');
    if (appLogo) {
      appLogo.style.display = 'block';
      appLogo.style.opacity = '1';
    }
    
    // Make sure all input groups are visible
    const inputGroups = registerForm.querySelectorAll('.input-group');
    inputGroups.forEach(group => {
      group.style.display = 'block';
      group.style.opacity = '1';
    });
    
    // Make sure the create account button is visible
    const createButton = registerForm.querySelector('button');
    if (createButton) {
      createButton.style.display = 'block';
      createButton.style.opacity = '1';
    }
    
    // Make sure the login link is visible
    const registerLink = registerForm.querySelector('.register');
    if (registerLink) {
      registerLink.style.display = 'block';
      registerLink.style.opacity = '1';
    }
    
    // Focus the username input after a short delay
    setTimeout(() => {
      const usernameInput = document.getElementById('registerUsername');
      if (usernameInput) {
        usernameInput.focus({ preventScroll: true });
        console.log('Focused username input');
      }
    }, 100);
    
    console.log('Register form should now be fully visible');
  } else {
    console.error('Could not find register form element');
  }
}

/**
 * Resends the verification code
 */
async function resendVerificationCode() {
  const now = Date.now();
  // Prevent multiple clicks during cooldown or if less than 1 second since last resend
  if (resendTimer !== null || (now - lastResendTime < 1000)) return;
  
  const registrationData = JSON.parse(sessionStorage.getItem('tempRegistration'));
  if (!registrationData || !registrationData.email) {
    showVerificationMessage('Session expired. Please register again.', 'error');
    setTimeout(() => showRegister(), 2000);
    return;
  }
  
  try {
    // Update last resend time and start cooldown
    lastResendTime = now;
    startResendCooldown();
    
    // Update UI immediately to show loading state
    const resendLink = document.querySelector('a[onclick*="resendVerificationCode"]');
    if (resendLink) {
      resendLink.innerHTML = 'Sending...';
      resendLink.style.pointerEvents = 'none';
    }
    showVerificationMessage('Sending new verification code...', 'info');
    
    // Call the generateVerificationCode function from A.A.C.A.R-VC.js
    const result = await generateVerificationCode(registrationData.email);
    
    if (result.success) {
      // Store the verification code hash in session storage
      sessionStorage.setItem('verificationCodeSent', JSON.stringify({
        timestamp: Date.now(),
        hashes: result.hashes
      }));
      
      showVerificationMessage('New verification code sent!', 'success');
    } else {
      throw new Error(result.message || 'Failed to send verification code');
    }
  } catch (error) {
    console.error('Resend error:', error);
    showVerificationMessage(error.message || 'Failed to resend verification code', 'error');
  }
}

/**
 * Starts the resend cooldown timer
 */
function startResendCooldown() {
  resendCooldown = 30; // Reduced cooldown to 30 seconds for better UX
  updateResendButton();
  
  // Clear any existing timer to prevent multiple timers
  if (resendTimer) {
    clearInterval(resendTimer);
  }
  
  resendTimer = setInterval(() => {
    resendCooldown--;
    updateResendButton();
    
    if (resendCooldown <= 0) {
      clearInterval(resendTimer);
      resendTimer = null;
      updateResendButton();
    }
  }, 1000);
}

/**
 * Updates the resend button text and state
 */
function updateResendButton() {
  const resendLink = document.querySelector('a[onclick*="resendVerificationCode"]');
  if (resendLink) {
    if (resendCooldown > 0) {
      resendLink.innerHTML = `Resend in ${resendCooldown}s`;
      resendLink.style.pointerEvents = 'none';
      resendLink.style.opacity = '0.7';
      resendLink.style.cursor = 'not-allowed';
      resendLink.style.transition = 'opacity 0.2s ease';
    } else {
      resendLink.innerHTML = 'Resend Code';
      resendLink.style.pointerEvents = 'auto';
      resendLink.style.opacity = '1';
      resendLink.style.cursor = 'pointer';
    }
  }
}

/**
 * Shows a verification message
 * @param {string} message - The message to display
 * @param {string} type - The message type (error, success, info)
 */
function showVerificationMessage(message, type = 'info') {
  const messageElement = document.getElementById('verificationMessage');
  if (!messageElement) return;
  
  messageElement.textContent = message;
  messageElement.className = ''; // Clear previous classes
  
  switch (type) {
    case 'error':
      messageElement.style.color = '#ff6b6b';
      break;
    case 'success':
      messageElement.style.color = '#3ba55c';
      break;
    case 'info':
    default:
      messageElement.style.color = '#a0a8ff';
      break;
  }
}

// Make functions globally available
const globalFunctions = {
  handleVerificationWithLoading: typeof handleVerificationWithLoading !== 'undefined' ? handleVerificationWithLoading : null,
  showRegister: typeof showRegister !== 'undefined' ? showRegister : null,
  submitVerificationCode,
  goBackToRegister,
  resendVerificationCode
};

Object.entries(globalFunctions).forEach(([name, func]) => {
  if (func && typeof window[name] === 'undefined') {
    window[name] = func;
  }
});
