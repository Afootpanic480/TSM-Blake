/**
 * LoginAnimator - A simple, reliable login animation system
 */
class LoginAnimator {
  constructor() {
    this.animationContainer = null;
    this.loginForm = null;
    this.originalStyles = {};
    this.animationTimeout = null;
  }

  /**
   * Initialize the login animation system
   * @param {HTMLElement} formElement - The login form element
   */
  init(formElement) {
    this.loginForm = formElement;
    this.saveOriginalStyles();
    this.createAnimationContainer();
  }

  /**
   * Save the original styles of the login form
   */
  saveOriginalStyles() {
    if (!this.loginForm) return;
    
    const style = window.getComputedStyle(this.loginForm);
    this.originalStyles = {
      display: style.display,
      position: style.position,
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      transition: style.transition
    };
  }

  /**
   * Create the animation container
   */
  createAnimationContainer() {
    // Create container if it doesn't exist
    let container = document.getElementById('loginAnimatorContainer');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'loginAnimatorContainer';
      container.style.cssText = `
        position: relative;
        width: 100%;
        min-height: ${this.loginForm.offsetHeight}px;
        display: flex;
        justify-content: center;
        align-items: center;
      `;
      
      // Insert container before the form and move form inside it
      this.loginForm.parentNode.insertBefore(container, this.loginForm);
      container.appendChild(this.loginForm);
    }
    
    this.animationContainer = container;
  }

  /**
   * Show loading state
   * @param {string} message - Loading message to display
   */
  showLoading(message = 'Logging in...') {
    if (!this.loginForm || !this.animationContainer) return;
    
    // Hide the form
    this.loginForm.style.opacity = '0';
    this.loginForm.style.pointerEvents = 'none';
    this.loginForm.style.transition = 'opacity 0.3s ease';
    
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'login-loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="login-spinner"></div>
      <div class="login-message">${message}</div>
    `;
    
    // Add styles
    this.addStyles();
    
    // Add to container
    this.animationContainer.appendChild(loadingOverlay);
    
    // Trigger reflow
    void loadingOverlay.offsetHeight;
    
    // Fade in
    loadingOverlay.style.opacity = '1';
  }

  /**
   * Show success state
   * @param {string} message - Success message to display
   * @param {Function} callback - Callback function to execute after animation
   */
  showSuccess(message = 'Success!', callback) {
    const loadingOverlay = document.querySelector('.login-loading-overlay');
    if (!loadingOverlay) return;
    
    // Update to success state
    loadingOverlay.innerHTML = `
      <div class="login-success-icon">✓</div>
      <div class="login-message">${message}</div>
    `;
    loadingOverlay.classList.add('success');
    
    // Execute callback after delay
    if (callback) {
      this.animationTimeout = setTimeout(() => {
        callback();
      }, 1500);
    }
  }

  /**
   * Show error state
   * @param {string} message - Error message to display
   */
  showError(message = 'Login failed') {
    const loadingOverlay = document.querySelector('.login-loading-overlay');
    if (!loadingOverlay) return;
    
    // Update to error state
    loadingOverlay.innerHTML = `
      <div class="login-error-icon">!</div>
      <div class="login-message">${message}</div>
      <button class="login-retry-btn">Try Again</button>
    `;
    loadingOverlay.classList.add('error');
    
    // Add retry button handler
    const retryBtn = loadingOverlay.querySelector('.login-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.reset());
    }
  }

  /**
   * Reset to initial state
   */
  reset() {
    // Clear any pending timeouts
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }
    
    // Remove loading overlay
    const loadingOverlay = document.querySelector('.login-loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        if (loadingOverlay && loadingOverlay.parentNode) {
          loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
      }, 300);
    }
    
    // Reset form styles
    if (this.loginForm) {
      Object.assign(this.loginForm.style, {
        opacity: '1',
        pointerEvents: this.originalStyles.pointerEvents,
        transition: 'opacity 0.3s ease'
      });
    }
  }

  /**
   * Add required styles
   */
  addStyles() {
    // Only add styles once
    if (document.getElementById('loginAnimatorStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'loginAnimatorStyles';
    style.textContent = `
      .login-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: rgba(30, 33, 58, 0.98);
        border-radius: 12px;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 10;
      }
      
      .login-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        border-top-color: #7cbfff;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }
      
      .login-message {
        color: #e0e6f3;
        font-size: 1.1em;
        margin: 10px 0;
        text-align: center;
        max-width: 80%;
      }
      
      .login-success-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #4CAF50;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 32px;
        margin-bottom: 20px;
        animation: scaleIn 0.3s ease-out;
      }
      
      .login-error-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #f44336;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 20px;
        animation: shake 0.5s ease-in-out;
      }
      
      .login-retry-btn {
        background: #7cbfff;
        color: #1e213a;
        border: none;
        padding: 10px 24px;
        border-radius: 6px;
        font-size: 1em;
        font-weight: 500;
        margin-top: 20px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .login-retry-btn:hover {
        background: #6aa8e8;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      @keyframes scaleIn {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-5px); }
        40%, 80% { transform: translateX(5px); }
      }
    `;
    
    document.head.appendChild(style);
  }
}

// Create a singleton instance and make it globally available
window.loginAnimator = new LoginAnimator();
