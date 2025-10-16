async function handleRegisterWithLoading() {
  console.log('handleRegisterWithLoading called');
  
  // Check if this is a page reload or same-session navigation
  const pageLoadTime = sessionStorage.getItem('pageLoadTime');
  const currentPageLoadTime = window.performance.timing.navigationStart.toString();
  const isPageReload = !pageLoadTime || pageLoadTime !== currentPageLoadTime;
  
  // Set the current page load time
  sessionStorage.setItem('pageLoadTime', currentPageLoadTime);
  
  // Check if verification is already in progress (user went back from verification screen)
  const verificationInProgress = sessionStorage.getItem('verificationInProgress');
  const verificationForm = document.getElementById('verificationForm');
  const existingRegistrationData = sessionStorage.getItem('tempRegistration');
  
  // If this is a page reload, clear the verification flag to force sending a new code
  if (isPageReload) {
    sessionStorage.removeItem('verificationInProgress');
    console.log('Page reload detected, cleared verificationInProgress flag');
  }
  
  // If no registration data exists, this is a fresh start - clear the verification flag
  if (!existingRegistrationData) {
    sessionStorage.removeItem('verificationInProgress');
    console.log('No existing registration data found, cleared verificationInProgress flag');
  }
  
  // Only resume verification if it's same-session navigation (not a page reload)
  if (!isPageReload && verificationInProgress === 'true' && verificationForm && existingRegistrationData) {
    console.log('Verification already in progress, resuming verification screen...');
    
    // Just show the verification form without sending a new code
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
      // Hide specific register form elements (but not the container)
      const loginLink = document.querySelector('.register a[onclick*="showLogin"]')?.parentElement;
      const registerBtn = document.querySelector('button[onclick="handleRegisterWithLoading()"]');
      const inputGroups = document.querySelectorAll('#registerForm .input-group');
      const registerTitle = document.querySelector('#registerForm .app-logo');
      
      const elementsToHide = [loginLink, registerBtn, ...inputGroups, registerTitle].filter(Boolean);
      
      // Hide register form elements
      elementsToHide.forEach(element => {
        element.style.display = 'none';
      });
      
      // Show verification form
      verificationForm.style.display = 'block';
      verificationForm.style.opacity = '1';
      verificationForm.style.pointerEvents = 'auto';
      
      // Ensure verification inputs are displayed horizontally
      const verificationCodeDiv = verificationForm.querySelector('.verification-code');
      if (verificationCodeDiv) {
        verificationCodeDiv.style.display = 'flex';
        verificationCodeDiv.style.justifyContent = 'center';
        verificationCodeDiv.style.gap = '10px';
        verificationCodeDiv.style.flexWrap = 'nowrap';
      }
      
      // Set up event listeners for verification buttons
      const verifyButton = document.getElementById('verifyButton');
      if (verifyButton) {
        verifyButton.removeEventListener('click', handleVerificationWithLoading);
        verifyButton.addEventListener('click', handleVerificationWithLoading);
      }
      
      const backLink = document.getElementById('backToRegister');
      if (backLink) {
        backLink.removeEventListener('click', goBackToRegister);
        backLink.addEventListener('click', goBackToRegister);
      }
      
      // Set up resend code link
      const resendLink = document.querySelector('a[onclick*="resendVerificationCode"]');
      if (resendLink) {
        resendLink.removeAttribute('onclick');
        resendLink.removeEventListener('click', resendVerificationCode);
        resendLink.addEventListener('click', function(e) {
          e.preventDefault();
          resendVerificationCode();
        });
      }
      
      // Focus first code input
      setTimeout(() => {
        const firstCodeInput = verificationForm.querySelector('input[type="text"]');
        if (firstCodeInput) {
          firstCodeInput.focus();
          console.log('Focused first code input (resume mode)');
        }
      }, 100);
      
      console.log('Resumed verification screen successfully');
      return true;
    }
  }
  
  try {
    // Get form elements
    const usernameInput = document.getElementById('registerUsername');
    const gmailInput = document.getElementById('registerGmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const messageDiv = document.getElementById('message') || document.createElement('div');
    const registerForm = document.getElementById('registerForm');
    const verificationForm = document.getElementById('verificationForm');
    
    // Ensure messageDiv exists in the DOM
    if (!messageDiv.id) {
      messageDiv.id = 'message';
      document.body.appendChild(messageDiv);
    }
    
    // Clear previous messages
    messageDiv.textContent = '';
    messageDiv.className = '';
    
    // Disable the register button to prevent multiple submissions
    const registerButton = document.querySelector('#registerForm button[onclick="handleRegisterWithLoading()"]');
    if (registerButton) registerButton.disabled = true;
    
    console.log('Running form validations...');
    
    // Run all validations with debug logging
    console.log('Running username validation...');
    const usernameValid = handleUsernameCheck();
    console.log('Username validation result:', usernameValid);
    
    console.log('Running email validation...');
    const emailValid = handleGmailCheck();
    console.log('Email validation result:', emailValid);
    
    console.log('Running password validation...');
    const passwordValid = validatePasswordOnSubmit();
    console.log('Password validation result:', passwordValid);
    
    const isFormValid = usernameValid && emailValid && passwordValid;
    
    if (!isFormValid) {
      console.log('Form validation failed - Details:', {
        username: usernameValid,
        email: emailValid,
        password: passwordValid
      });
      
      // Show specific error message based on which validation failed
      let errorMessage = 'Please fix the following issues:';
      if (!usernameValid) {
        errorMessage = 'Please check your username. It may already be taken or invalid.';
      } else if (!emailValid) {
        errorMessage = 'Please check your email. It may already be in use or invalid.';
      } else if (!passwordValid) {
        errorMessage = 'Please check your password and confirm password fields.';
      }
      
      // Display the error message
      messageDiv.textContent = errorMessage;
      messageDiv.className = 'error';
      messageDiv.style.color = '#ff6b6b';
      messageDiv.style.display = 'block';
      
      // Focus the first invalid field
      const firstInvalid = document.querySelector('.input-group.invalid');
      if (firstInvalid) {
        const input = firstInvalid.querySelector('input');
        if (input) {
          console.log('Focusing invalid input:', input.id);
          input.focus();
        }
      }
      
      if (registerButton) registerButton.disabled = false;
      return false;
    }
    
    console.log('Form validation passed, showing verification form');
    
    // Get form values
    const username = usernameInput?.value.trim();
    const email = gmailInput?.value.trim();
    const password = passwordInput?.value.trim();
    
    // Store registration data
    console.log('Storing registration data in loading-ani.js:', { username, email, passwordLength: password ? password.length : 0 });
    storeRegistrationData(username, email, password);
    
    // Verify data was stored in sessionStorage
    const storedData = sessionStorage.getItem('tempRegistration');
    console.log('Data stored in sessionStorage:', storedData);
    
    console.log('Generating and sending verification code...');
    
    try {
      // Generate and send verification code
      const codeResult = await generateVerificationCode(email);
      console.log('Verification code result:', codeResult);
      
      if (!codeResult.success) {
        throw new Error(codeResult.message || 'Failed to send verification code');
      }
      
      console.log('Verification code sent successfully');
    } catch (error) {
      console.error('Error sending verification code:', error);
      const messageDiv = document.getElementById('message');
      if (messageDiv) {
        messageDiv.textContent = `Error: ${error.message || 'Failed to send verification code. Please try again.'}`;
        messageDiv.className = 'error';
      }
      // Re-enable the register button on error
      const registerButton = document.querySelector('#registerForm button[onclick="handleRegisterWithLoading()"]');
      if (registerButton) registerButton.disabled = false;
      return false;
    }
    
    console.log('Hiding register form and showing verification form...');
    
    // Get all elements that need to be hidden
    const registerContainer = document.querySelector('.password-box');
    const loginLink = document.querySelector('.register a[onclick*="showLogin"]')?.parentElement;
    const registerBtn = document.querySelector('button[onclick="handleRegisterWithLoading()"]');
    const inputGroups = document.querySelectorAll('#registerForm .input-group');
    const registerTitle = document.querySelector('#registerForm .app-logo');
    
    if (registerForm && verificationForm && registerContainer) {
      console.log('Starting form transition...');
      
      // Hide the register button immediately to prevent double-clicks
      if (registerBtn) registerBtn.style.display = 'none';
      
      // Set up transitions for all elements
      const elementsToFade = [registerContainer, loginLink, ...inputGroups, registerTitle].filter(Boolean);
      
      // Apply fade out to all elements
      elementsToFade.forEach(element => {
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        element.style.pointerEvents = 'none'; // Prevent interaction during transition
      });
      
      // After fade out, hide elements and show verification form
      setTimeout(() => {
        try {
          // Hide all faded elements
          elementsToFade.forEach(element => {
            element.style.display = 'none';
          });
          
          // Show verification form with fade in
          verificationForm.style.display = 'block';
          verificationForm.style.opacity = '0';
          verificationForm.style.transition = 'opacity 0.3s ease-in';
          
          // Ensure verification inputs are displayed horizontally
          const verificationCodeDiv = verificationForm.querySelector('.verification-code');
          if (verificationCodeDiv) {
            verificationCodeDiv.style.display = 'flex';
            verificationCodeDiv.style.justifyContent = 'center';
            verificationCodeDiv.style.gap = '10px';
            verificationCodeDiv.style.flexWrap = 'nowrap';
          }
          
          // Force reflow before showing
          void verificationForm.offsetHeight;
          
          // Fade in verification form
          verificationForm.style.opacity = '1';
          
          // Set flag to indicate verification is in progress
          sessionStorage.setItem('verificationInProgress', 'true');
          console.log('Set verificationInProgress flag to true');
          
          // Focus first code input after a small delay
          setTimeout(() => {
            const firstCodeInput = verificationForm.querySelector('input[type="text"]');
            if (firstCodeInput) {
              firstCodeInput.focus();
              console.log('Focused first code input');
            } else {
              console.error('Could not find any code input fields in verification form');
            }
          }, 50);
        } catch (error) {
          console.error('Error during form transition:', error);
        }
      }, 300); // 300ms matches the transition duration
    } else {
      console.error('Required elements not found:', { 
        registerForm: !!registerForm, 
        verificationForm: !!verificationForm,
        registerContainer: !!registerContainer
      });
    }
    
    // Re-enable the register button in case user goes back
    if (registerButton) registerButton.disabled = false;
    
    return true;
    
  } catch (error) {
    console.error('Registration error:', error);
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
      messageDiv.textContent = 'An error occurred. Please try again.';
      messageDiv.className = 'error';
    }
    // Re-enable the register button on error
    const registerButton = document.querySelector('#registerForm button[onclick="handleRegisterWithLoading()"]');
    if (registerButton) registerButton.disabled = false;
    return false;
  }
}

async function handleVerificationWithLoading() {
  const codeInputs = document.querySelectorAll('.code-input');
  let code = '';
  codeInputs.forEach(input => {
    code += input.value.trim();
  });
  const messageDiv = document.getElementById('message');

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    messageDiv.textContent = 'Please enter a valid 6-digit code.';
    return;
  }

  // Clear any existing message
  messageDiv.textContent = '';

  // Hide verification form and show loading animation
  const verificationForm = document.getElementById('verificationForm');
  const passwordBox = document.querySelector('.password-box');
  verificationForm.style.display = 'none';

  // Create loading animation
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loadingAnimation';
  loadingDiv.style.textAlign = 'center';
  loadingDiv.style.padding = '20px';
  loadingDiv.innerHTML = `
    <h3 id="loadingText" style="color: white;">Verifying</h3>
    <div id="loadingDots" style="margin-top: 20px;">
      <span class="loading-dot" style="background-color: #1d4eb8;"></span>
      <span class="loading-dot" style="background-color: #1d4eb8;"></span>
      <span class="loading-dot" style="background-color: #1d4eb8;"></span>
    </div>
  `;
  passwordBox.appendChild(loadingDiv);

  // Style for dots
  const style = document.createElement('style');
  style.innerHTML = `
    .loading-dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin: 0 5px;
      animation: pulse 1.5s infinite;
    }
    .loading-dot:nth-child(2) { animation-delay: 0.5s; }
    .loading-dot:nth-child(3) { animation-delay: 1s; }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Verify the code
  const gmail = document.getElementById('registerGmail').value.trim();
  const result = await verifyCode(gmail, code);

  if (result.success) {
    // Change dots to green and update text
    const dots = document.querySelectorAll('.loading-dot');
    dots.forEach(dot => {
      dot.style.backgroundColor = '#2edb65';
      dot.style.animation = 'none';
      dot.style.opacity = '1';
    });
    document.getElementById('loadingText').textContent = 'Account Created';

    // Submit registration data
    const submitResult = await submitRegistration();
    if (submitResult.success) {
      loadingDiv.remove();
      style.remove();
      messageDiv.textContent = 'Registration successful! Redirecting to login...';
      showLogin();
    } else {
      // Clean up and show error
      loadingDiv.remove();
      style.remove();
      messageDiv.textContent = submitResult.message;
      verificationForm.style.display = 'block';
    }

  } else {
    // Clean up and show error
    loadingDiv.remove();
    style.remove();
    messageDiv.textContent = result.message;
    verificationForm.style.display = 'block';
  }
}

// Make functions globally available
window.handleRegisterWithLoading = handleRegisterWithLoading;
window.handleVerificationWithLoading = handleVerificationWithLoading;
