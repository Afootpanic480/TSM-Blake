// Form visibility and focus manager
class FormManager {
  constructor() {
    this.forms = {
      login: document.getElementById('loginForm'),
      register: document.getElementById('registerForm')
    };
    this.currentForm = 'login';
    this.focusTimeout = null;
    
    // Initialize forms
    this.init();
  }

  init() {
    // Hide register form initially
    if (this.forms.register) {
      this.forms.register.style.display = 'none';
      
      // Initialize username check when register form is shown
      const registerLink = document.querySelector('a[onclick*="showRegister"]');
      if (registerLink) {
        registerLink.addEventListener('click', () => {
          // Small delay to ensure form is visible before focusing
          this.focusTimeout = setTimeout(() => {
            const usernameInput = document.getElementById('registerUsername');
            if (usernameInput) {
              usernameInput.focus({ preventScroll: true });
            }
          }, 50);
        });
      }
    }
    
    // Show login form
    if (this.forms.login) {
      this.forms.login.style.display = 'block';
    }
  }
  
  // Switch between forms
  switchTo(formName) {
    if (!this.forms[formName] || formName === this.currentForm) return;
    
    // Clear any pending focus timeouts
    if (this.focusTimeout) {
      clearTimeout(this.focusTimeout);
      this.focusTimeout = null;
    }
    
    // Hide current form
    if (this.forms[this.currentForm]) {
      this.forms[this.currentForm].style.display = 'none';
    }
    
    // Show target form
    this.forms[formName].style.display = 'block';
    this.currentForm = formName;
    
    // Enhanced focus handling for register form
    if (formName === 'register') {
      // Multiple attempts to ensure focus is maintained
      const focusUsername = () => {
        const usernameInput = document.getElementById('registerUsername');
        if (usernameInput) {
          usernameInput.focus({ preventScroll: true });
          // Force focus if it gets lost
          setTimeout(() => {
            if (document.activeElement !== usernameInput) {
              usernameInput.focus({ preventScroll: true });
            }
          }, 100);
        }
      };
      
      // Initial focus attempt
      setTimeout(focusUsername, 50);
      // Backup focus attempt
      setTimeout(focusUsername, 150);
    } else {
      // Standard focus handling for other forms
      this.focusTimeout = setTimeout(() => {
        const firstInput = this.forms[formName].querySelector('input');
        if (firstInput) {
          firstInput.focus({ preventScroll: true });
        }
        this.focusTimeout = null;
      }, 50);
    }
  }
}

// Global functions for HTML onclick handlers
function showLogin() {
  if (window.formManager) {
    window.formManager.switchTo('login');
  } else {
    // Fallback if formManager isn't available
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
  }
  return false;
}

function showRegister() {
  // Reset user interaction flag for clean state
  if (typeof userHasInteracted !== 'undefined') {
    userHasInteracted = false;
  }
  
  // Add temporary focus protection for username field
  let focusProtectionActive = true;
  const protectFocus = (e) => {
    if (focusProtectionActive && e.target && e.target.id === 'registerUsername') {
      e.preventDefault();
      setTimeout(() => {
        const usernameInput = document.getElementById('registerUsername');
        if (usernameInput) usernameInput.focus({ preventScroll: true });
      }, 10);
    }
  };
  
  // Add blur protection temporarily
  document.addEventListener('blur', protectFocus, true);
  
  // Remove protection after a short time to allow normal interaction
  setTimeout(() => {
    focusProtectionActive = false;
    document.removeEventListener('blur', protectFocus, true);
  }, 500);
  
  if (window.formManager) {
    window.formManager.switchTo('register');
    
    // Initialize Gmail checking when register form is shown
    setTimeout(() => {
      if (typeof showGmailCheck === 'function') {
        const checkGmail = showGmailCheck();
        window.checkGmail = checkGmail; // Store for use in handleRegister
      }
    }, 100);
  } else {
    // Fallback if formManager isn't available
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) {
      registerForm.style.display = 'block';
      // Enhanced focus handling to ensure username stays focused
      const focusUsername = () => {
        const usernameInput = document.getElementById('registerUsername');
        if (usernameInput) {
          usernameInput.focus({ preventScroll: true });
          // Force focus if it gets lost
          setTimeout(() => {
            if (document.activeElement !== usernameInput) {
              usernameInput.focus({ preventScroll: true });
            }
          }, 100);
        }
      };
      
      // Multiple focus attempts to ensure it sticks
      setTimeout(focusUsername, 50);
      setTimeout(focusUsername, 150);
      
      // Initialize Gmail checking when register form is shown
      setTimeout(() => {
        if (typeof showGmailCheck === 'function') {
          const checkGmail = showGmailCheck();
          window.checkGmail = checkGmail; // Store for use in handleRegister
        }
      }, 100);
    }
  }
  return false;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('loginForm') && document.getElementById('registerForm')) {
    // Initialize form manager
    window.formManager = new FormManager();
    
    // Initialize username validation when register form is shown
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'style') {
            const display = window.getComputedStyle(registerForm).display;
            if (display === 'block') {
              // Initialize username validation
              if (typeof showUsernameCheck === 'function') {
                window.checkUsername = showUsernameCheck();
              }
            }
          }
        });
      });
      
      observer.observe(registerForm, { attributes: true });
    }
    
    // Enable register link immediately
    const registerLinks = document.querySelectorAll('.register a');
    registerLinks.forEach(link => {
      if (link.textContent.trim() === 'Register' || link.textContent.trim() === 'Create Account') {
        const parent = link.closest('.register');
        if (parent) {
          parent.style.pointerEvents = 'auto';
          parent.style.opacity = '1';
        }
      }
    });
  }
});

// Handle forgot password click
document.addEventListener('click', (e) => {
  if (e.target.matches('.forgot-password, .forgot-password *')) {
    e.preventDefault();
    const forgotPasswordOverlay = document.getElementById('forgotPasswordOverlay');
    if (forgotPasswordOverlay) {
      forgotPasswordOverlay.style.display = 'flex';
    }
  }
});
