function validatePassword() {
  const passwordInput = document.getElementById('registerPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const passwordGroup = passwordInput?.closest('.input-group');
  const confirmPasswordGroup = confirmPasswordInput?.closest('.input-group');
  
  if (!passwordInput || !confirmPasswordInput) return false;
  
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  let isValid = true;
  
  // Reset validation states
  [passwordGroup, confirmPasswordGroup].forEach(group => {
    if (group) {
      group.classList.remove('valid', 'invalid');
    }
  });
  
  // Clear input classes
  passwordInput?.classList.remove('password-valid', 'password-invalid');
  confirmPasswordInput?.classList.remove('confirm-valid', 'confirm-invalid');
  
  // Validate password length
  if (password.length < 5 || password.length > 20) {
    passwordGroup?.classList.add('invalid');
    passwordInput?.classList.add('password-invalid');
    passwordError.textContent = 'Password must be between 5 and 20 characters';
    isValid = false;
  } else {
    passwordGroup?.classList.add('valid');
    passwordInput?.classList.add('password-valid');
    passwordError.textContent = '';
  }
  
  // Validate confirm password
  if (confirmPassword) {
    if (password !== confirmPassword) {
      confirmPasswordGroup?.classList.add('invalid');
      confirmPasswordInput?.classList.add('confirm-invalid');
      confirmPasswordError.textContent = 'Passwords do not match';
      isValid = false;
    } else {
      confirmPasswordGroup?.classList.add('valid');
      confirmPasswordInput?.classList.add('confirm-valid');
      confirmPasswordError.textContent = '';
    }
  }
  
  return isValid;
}

function validatePasswordOnSubmit() {
  const passwordInput = document.getElementById('registerPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const passwordGroup = passwordInput?.closest('.input-group');
  const confirmPasswordGroup = confirmPasswordInput?.closest('.input-group');
  
  if (!passwordInput || !confirmPasswordInput) return false;
  
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  let isValid = true;
  
  // Reset validation states
  [passwordGroup, confirmPasswordGroup].forEach(group => {
    if (group) {
      group.classList.remove('valid', 'invalid');
    }
  });
  
  // Clear input classes
  passwordInput?.classList.remove('password-valid', 'password-invalid');
  confirmPasswordInput?.classList.remove('confirm-valid', 'confirm-invalid');
  
  // Clear error messages
  passwordError.textContent = '';
  confirmPasswordError.textContent = '';
  
  // Validate password length
  if (password.length < 5 || password.length > 20) {
    passwordGroup?.classList.add('invalid');
    passwordInput?.classList.add('password-invalid');
    passwordError.textContent = 'Password must be between 5 and 20 characters';
    isValid = false;
  } else {
    passwordGroup?.classList.add('valid');
    passwordInput?.classList.add('password-valid');
  }
  
  // Validate confirm password
  if (!confirmPassword) {
    confirmPasswordGroup?.classList.add('invalid');
    confirmPasswordInput?.classList.add('confirm-invalid');
    confirmPasswordError.textContent = 'Please confirm your password';
    isValid = false;
  } else if (password !== confirmPassword) {
    confirmPasswordGroup?.classList.add('invalid');
    confirmPasswordInput?.classList.add('confirm-invalid');
    confirmPasswordError.textContent = 'Passwords do not match';
    isValid = false;
  } else {
    confirmPasswordGroup?.classList.add('valid');
    confirmPasswordInput?.classList.add('confirm-valid');
  }
  
  return isValid;
}

function resetPasswordStyles() {
  const passwordInput = document.getElementById('registerPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const passwordGroup = passwordInput?.closest('.input-group');
  const confirmPasswordGroup = confirmPasswordInput?.closest('.input-group');
  
  // Reset validation states
  [passwordGroup, confirmPasswordGroup].forEach(group => {
    if (group) {
      group.classList.remove('valid', 'invalid');
    }
  });
  
  // Reset input classes
  passwordInput?.classList.remove('password-valid', 'password-invalid');
  confirmPasswordInput?.classList.remove('confirm-valid', 'confirm-invalid');
  
  // Clear error messages
  if (passwordError) passwordError.textContent = '';
  if (confirmPasswordError) confirmPasswordError.textContent = '';
  
  // Reset input values if needed
  // if (passwordInput) passwordInput.value = '';
  // if (confirmPasswordInput) confirmPasswordInput.value = '';
}

// Debounce helper function
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Set up event listeners for password validation
document.addEventListener('DOMContentLoaded', function() {
  const passwordInput = document.getElementById('registerPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  if (passwordInput && confirmPasswordInput) {
    // Debounced validation for better performance
    const debouncedValidate = debounce(validatePassword, 300);
    
    // Real-time validation on input
    passwordInput.addEventListener('input', debouncedValidate);
    confirmPasswordInput.addEventListener('input', debouncedValidate);
    
    // Validate on blur for immediate feedback
    passwordInput.addEventListener('blur', validatePassword);
    confirmPasswordInput.addEventListener('blur', validatePassword);
    
    // Initial validation if there are values (e.g., page refresh)
    if (passwordInput.value || confirmPasswordInput.value) {
      validatePassword();
    }
  }
});