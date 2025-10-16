const LoginAnimation = {
  showLoginAnimation(container, loginText = 'Processing') {
    this.removeLoginAnimation();
    const loginDiv = document.createElement('div');
    loginDiv.id = 'loginAnimation';
    loginDiv.style.textAlign = 'center';
    loginDiv.style.padding = '20px';
    loginDiv.innerHTML = `
      <h3 id="loginText" style="color: white;">${loginText}</h3>
      <div id="loginDots" style="margin-top: 20px;">
        <span class="login-dot" style="background-color: #1d4eb8;"></span>
        <span class="login-dot" style="background-color: #1d4eb8;"></span>
        <span class="login-dot" style="background-color: #1d4eb8;"></span>
      </div>
    `;
    container.appendChild(loginDiv);
    const style = document.createElement('style');
    style.id = 'loginAnimationStyles';
    style.innerHTML = `
      .login-dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin: 0 5px;
        animation: pulse 1.5s infinite;
      }
      .login-dot:nth-child(2) { animation-delay: 0.5s; }
      .login-dot:nth-child(3) { animation-delay: 1s; }
      @keyframes pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    return { loginDiv, style };
  },

  showSuccess(loginDiv, successText = 'Logged In') {
    const dots = loginDiv.querySelectorAll('.login-dot');
    dots.forEach(dot => {
      dot.style.backgroundColor = '#2edb65';
      dot.style.animation = 'none';
      dot.style.opacity = '1';
    });
    const loginTextElement = loginDiv.querySelector('#loginText');
    if (loginTextElement) {
      loginTextElement.textContent = successText;
    }
  },

  removeLoginAnimation() {
    const loginDiv = document.getElementById('loginAnimation');
    const style = document.getElementById('loginAnimationStyles');
    if (loginDiv) loginDiv.remove();
    if (style) style.remove();
  },

  async withLogin(container, asyncOperation, options = {}) {
    const {
      loginText = 'Logging In',
      successText = 'Logged In',
      errorMessage = 'Login failed.',
      messageDiv = null,
      skipSuccessMessage = false,
      onSuccessCallback = null
    } = options;
    const { loginDiv, style } = this.showLoginAnimation(container, loginText);
    try {
      const result = await asyncOperation();
      if (result.success) {
        this.showSuccess(loginDiv, successText);
        // Wait a shorter time to see the green dots
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // If there's a success callback, execute it immediately
        if (onSuccessCallback && typeof onSuccessCallback === 'function') {
          onSuccessCallback(result);
        }
        
        // Skip showing success message if requested
        if (messageDiv && !skipSuccessMessage) {
          messageDiv.innerHTML = result.message || 'Login successful!';
        }
      } else {
        if (messageDiv) {
          messageDiv.innerHTML = result.message || errorMessage;
        }
      }
      return result;
    } catch (error) {
      if (messageDiv) {
        messageDiv.innerHTML = errorMessage + ' Error: ' + error.message;
      }
      throw error;
    } finally {
      this.removeLoginAnimation();
    }
  }
};