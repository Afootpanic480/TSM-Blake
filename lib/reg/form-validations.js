// Form validation functions

// Username validation on form submit
async function validateUsernameOnSubmit() {
  const usernameInput = document.getElementById('registerUsername');
  const errorElement = document.getElementById('usernameError');
  const inputGroup = usernameInput?.closest('.input-group');
  const username = usernameInput?.value.trim();
  
  if (!username) {
    if (errorElement) errorElement.textContent = 'Username is required';
    if (inputGroup) inputGroup.classList.add('invalid');
    return false;
  }
  
  // Username format validation (4-15 chars, letters, numbers, underscores, hyphens)
  const usernameRegex = /^[a-zA-Z0-9_-]{4,15}$/;
  if (!usernameRegex.test(username)) {
    if (errorElement) errorElement.textContent = 'Username must be 4-15 characters, using only letters, numbers, -, or _';
    if (inputGroup) inputGroup.classList.add('invalid');
    return false;
  }
  
  // Check if username is available (simulated API call)
  try {
    const isAvailable = await checkUsernameAvailability(username);
    if (!isAvailable) {
      if (errorElement) errorElement.textContent = 'Username is already taken';
      if (inputGroup) inputGroup.classList.add('invalid');
      return false;
    }
  } catch (error) {
    console.error('Error checking username availability:', error);
    if (errorElement) errorElement.textContent = 'Error checking username availability';
    if (inputGroup) inputGroup.classList.add('invalid');
    return false;
  }
  
  // If we get here, validation passed
  if (inputGroup) {
    inputGroup.classList.remove('invalid');
    inputGroup.classList.add('valid');
  }
  if (errorElement) errorElement.textContent = '';
  return true;
}

// Email validation on form submit
async function validateEmailOnSubmit() {
  const emailInput = document.getElementById('registerGmail');
  const errorElement = document.getElementById('emailError');
  const inputGroup = emailInput?.closest('.input-group');
  const email = emailInput?.value.trim();
  
  if (!email) {
    if (errorElement) errorElement.textContent = 'Email is required';
    if (inputGroup) inputGroup.classList.add('invalid');
    return false;
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    if (errorElement) errorElement.textContent = 'Please enter a valid email address';
    if (inputGroup) inputGroup.classList.add('invalid');
    return false;
  }
  
  // Check if email is already registered (simulated API call)
  try {
    const isAvailable = await checkEmailAvailability(email);
    if (!isAvailable) {
      if (errorElement) errorElement.textContent = 'Email is already registered';
      if (inputGroup) inputGroup.classList.add('invalid');
      return false;
    }
  } catch (error) {
    console.error('Error checking email availability:', error);
    if (errorElement) errorElement.textContent = 'Error checking email availability';
    if (inputGroup) inputGroup.classList.add('invalid');
    return false;
  }
  
  // If we get here, validation passed
  if (inputGroup) {
    inputGroup.classList.remove('invalid');
    inputGroup.classList.add('valid');
  }
  if (errorElement) errorElement.textContent = '';
  return true;
}

// Password validation on form submit
function validatePasswordOnSubmit() {
  console.log('Starting password validation...');
  const passwordInput = document.getElementById('registerPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const passwordErrorElement = document.getElementById('passwordError');
  const confirmPasswordErrorElement = document.getElementById('confirmPasswordError');
  const passwordGroup = passwordInput?.closest('.input-group');
  const confirmPasswordGroup = confirmPasswordInput?.closest('.input-group');
  
  console.log('Password input elements:', { 
    passwordInput: !!passwordInput, 
    confirmPasswordInput: !!confirmPasswordInput,
    passwordErrorElement: !!passwordErrorElement,
    confirmPasswordErrorElement: !!confirmPasswordErrorElement,
    passwordGroup: !!passwordGroup,
    confirmPasswordGroup: !!confirmPasswordGroup
  });
  
  const password = passwordInput?.value;
  const confirmPassword = confirmPasswordInput?.value;
  
  console.log('Password values:', { 
    password: password ? '***' : 'empty', 
    confirmPassword: confirmPassword ? '***' : 'empty' 
  });
  
  // Reset states
  if (passwordGroup) passwordGroup.classList.remove('invalid', 'valid');
  if (confirmPasswordGroup) confirmPasswordGroup.classList.remove('invalid', 'valid');
  if (passwordErrorElement) passwordErrorElement.textContent = '';
  if (confirmPasswordErrorElement) confirmPasswordErrorElement.textContent = '';
  
  // Check if password is provided
  if (!password) {
    console.log('Password is empty');
    if (passwordErrorElement) passwordErrorElement.textContent = 'Password is required';
    if (passwordGroup) passwordGroup.classList.add('invalid');
    return false;
  }
  
  // Password strength validation
  if (password.length < 6) {  // Temporarily reduced to 6 for testing
    console.log('Password is too short');
    const errorMsg = 'Password must be at least 6 characters long';
    console.log('Error message:', errorMsg);
    if (passwordErrorElement) {
      passwordErrorElement.textContent = errorMsg;
      passwordErrorElement.style.display = 'block';
      passwordErrorElement.style.color = '#ff4444';
    }
    if (passwordGroup) {
      passwordGroup.classList.add('invalid');
      // Ensure the error is visible
      passwordGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return false;
  }
  
  // Check if confirm password is provided
  if (!confirmPassword) {
    console.log('Confirm password is empty');
    const errorMsg = 'Please confirm your password';
    console.log('Error message:', errorMsg);
    if (confirmPasswordErrorElement) {
      confirmPasswordErrorElement.textContent = errorMsg;
      confirmPasswordErrorElement.style.display = 'block';
      confirmPasswordErrorElement.style.color = '#ff4444';
    }
    if (confirmPasswordGroup) {
      confirmPasswordGroup.classList.add('invalid');
      confirmPasswordGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return false;
  }
  
  // Check if passwords match
  if (password !== confirmPassword) {
    console.log('Passwords do not match');
    if (confirmPasswordErrorElement) confirmPasswordErrorElement.textContent = 'Passwords do not match';
    if (confirmPasswordGroup) confirmPasswordGroup.classList.add('invalid');
    // Also mark password as invalid for better UX
    if (passwordGroup) passwordGroup.classList.add('invalid');
    return false;
  }
  
  // If we get here, validation passed
  if (passwordGroup) passwordGroup.classList.add('valid');
  if (confirmPasswordGroup) confirmPasswordGroup.classList.add('valid');
  return true;
}

// Simulated API call to check username availability
async function checkUsernameAvailability(username) {
  // In a real app, this would be an API call
  // For now, we'll simulate a network delay and return true (available)
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, 300);
  });
}

// Simulated API call to check email availability
async function checkEmailAvailability(email) {
  // In a real app, this would be an API call
  // For now, we'll simulate a network delay and return true (available)
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, 300);
  });
}

// Store registration data (simulated)
function storeRegistrationData(username, email, password) {
  try {
    console.log('Storing registration data in sessionStorage');
    
    const registrationData = {
      username: String(username),
      email: String(email),
      password: String(password) // Store password as-is, let GAS handle encoding
    };
    
    // Store in sessionStorage
    sessionStorage.setItem('tempRegistration', JSON.stringify(registrationData));
    console.log('Registration data stored in sessionStorage');
    
    return registrationData;
  } catch (error) {
    console.error('Error in storeRegistrationData:', error);
    throw new Error('Failed to store registration data');
  }
}

// Make functions available globally
window.validateUsernameOnSubmit = validateUsernameOnSubmit;
window.validateEmailOnSubmit = validateEmailOnSubmit;
window.validatePasswordOnSubmit = validatePasswordOnSubmit;
window.checkUsernameAvailability = checkUsernameAvailability;
window.checkEmailAvailability = checkEmailAvailability;
window.storeRegistrationData = storeRegistrationData;
