let userHasInteracted = false; // Track if user has actually started typing

// Debounce function to delay username check
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Real-time username check logic (separated for reusability)
function setupUsernameCheck() {
  const usernameInput = document.getElementById('registerUsername');
  const errorElement = document.getElementById('usernameError');
  const inputGroup = usernameInput ? usernameInput.closest('.input-group') : null;

  const usernameRegex = /^[a-zA-Z\-_]{4,15}$/; // Regex: 4-15 chars, letters, -, _
  let checkInProgress = false;
  let lastCheckedUsername = ''; // Cache to prevent duplicate checks
  let lastCheckResult = null; // Cache the result



  const checkUsername = async function() {
    if (!usernameInput || !errorElement) return false;
    
    const username = usernameInput.value.trim();
    
    // Reset validation state
    if (inputGroup) {
      inputGroup.classList.remove('valid', 'invalid');
    }

    if (!username) {
      errorElement.textContent = '';
      return false;
    }

    // Validate format first
    if (!usernameRegex.test(username)) {
      inputGroup?.classList.add('invalid');
      errorElement.textContent = 'Username must be 4-15 characters, using only letters, -, or _.';
      return false;
    }

    // Check if username is available using the real existingUsernames array
    if (checkInProgress) return false;
    checkInProgress = true;

    try {
      // Check if we already checked this username
      if (lastCheckedUsername === username && lastCheckResult !== null) {
        if (lastCheckResult.available) {
          inputGroup?.classList.add('valid');
          errorElement.textContent = '';
        } else {
          inputGroup?.classList.add('invalid');
          errorElement.textContent = 'Username taken. Choose another.';
        }
        return lastCheckResult.available;
      }
      
      // Show checking status
      errorElement.textContent = 'Checking availability...';
      inputGroup?.classList.remove('valid', 'invalid');
      
      // Check username availability with server
      fetch(userCheck + '?username=' + encodeURIComponent(username), {
        method: 'GET'
      })
        .then(response => response.json())
        .then(result => {
          // Cache the result
          lastCheckedUsername = username;
          lastCheckResult = result;
          
          if (result.error) {
            inputGroup?.classList.add('invalid');
            errorElement.textContent = 'Error checking username availability';
            lastCheckResult = null; // Don't cache errors
          } else if (result.available) {
            inputGroup?.classList.add('valid');
            errorElement.textContent = '';
          } else {
            inputGroup?.classList.add('invalid');
            errorElement.textContent = 'Username taken. Choose another.';
          }
        })
        .catch(error => {
          console.error('Error checking username availability:', error);
          inputGroup?.classList.add('invalid');
          errorElement.textContent = 'Error checking username availability';
        });
      
      // Return true for now since this is async
      return true;
    } catch (error) {
      console.error('Error checking username availability:', error);
      inputGroup?.classList.add('invalid');
      errorElement.textContent = 'Error checking username availability';
      return false;
    } finally {
      checkInProgress = false;
    }
  };

  // Set up event listeners
  if (usernameInput) {
    // Debounced check for real-time validation - wait 2.5 seconds after user stops typing
    const debouncedCheck = debounce(() => {
      checkUsername();
    }, 2500);
    
    // Set up the debounced input listener
    usernameInput.addEventListener('input', (e) => {
      // Clear cache when username changes
      const currentUsername = usernameInput.value.trim();
      if (currentUsername !== lastCheckedUsername) {
        lastCheckedUsername = '';
        lastCheckResult = null;
      }
      
      // Set user interaction flag
      if (typeof userHasInteracted !== 'undefined') {
        userHasInteracted = true;
      }
      // Clear any existing validation state while user is typing
      const inputGroup = usernameInput.closest('.input-group');
      if (inputGroup) {
        inputGroup.classList.remove('valid', 'invalid');
      }
      // Clear error message while typing
      if (errorElement) {
        errorElement.textContent = '';
      }
      // Call debounced check
      debouncedCheck();
    });
    
    // Initial check if there's already a value (e.g., page refresh)
    if (usernameInput.value.trim()) {
      checkUsername();
    }
  }

  return checkUsername;
}

function showUsernameCheck() {
  console.log('Setting up secure username checking...');
  return setupUsernameCheck();
}

// Call showUsernameCheck only when register form is shown
document.addEventListener('DOMContentLoaded', function() {
  const registerLink = document.querySelector('.lpad[href="#"][onclick="showRegister()"]');
  if (registerLink) {
    registerLink.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Register link clicked, setting up username checking...');
      const checkUsername = showUsernameCheck();
      window.checkUsername = checkUsername; // Store for use in handleRegister
    });
  }
});

// Also call when the register screen is actually shown
if (typeof window.showRegister === 'function') {
  const originalShowRegister = window.showRegister;
  window.showRegister = function() {
    console.log('Register screen being shown, setting up username checking...');
    showUsernameCheck();
    return originalShowRegister.apply(this, arguments);
  };
}

function handleUsernameCheck() {
  const usernameInput = document.getElementById('registerUsername');
  const messageDiv = document.getElementById('message');
  
  if (!usernameInput || !messageDiv) {
    console.error('Required elements not found');
    return false;
  }
  
  const username = usernameInput.value.trim();
  const usernameRegex = /^[a-zA-Z\-_]{4,20}$/; // Regex: 4-20 chars, letters, -, _

  // Don't show validation messages if user hasn't interacted yet
  if (!username) {
    if (userHasInteracted) {
      messageDiv.textContent = 'Please fill in all fields.';
      console.log('handleUsernameCheck failed: No username');
    } else {
      messageDiv.textContent = ''; // Clear any existing messages
    }
    return false;
  }

  if (!usernameRegex.test(username)) {
    messageDiv.textContent = 'Username must be 4-20 characters, using only letters, -, or _.';
    console.log('handleUsernameCheck failed: Invalid username format');
    // Update visual state safely
    if (typeof window.checkUsername === 'function') {
      try {
        window.checkUsername();
      } catch (e) {
        console.error('Error in checkUsername:', e);
      }
    }
    return false;
  }

  // Use the secure checkUsername function for availability check
  if (typeof window.checkUsername === 'function') {
    try {
      window.checkUsername();
    } catch (e) {
      console.error('Error in checkUsername:', e);
      messageDiv.textContent = 'Error checking username availability';
      return false;
    }
  }
  
  // Clear any error messages if format validation passes
  // Note: Availability check is now async, so we return true for format validation
  messageDiv.textContent = '';
  return true;
}