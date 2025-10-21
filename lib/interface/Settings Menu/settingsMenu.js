// Settings Menu JavaScript
(function() {
  'use strict';

  // Load account information when account panel is active
  function loadAccountInfo() {
    const username = window.currentUserData?.username || 'Not logged in';
    const rawEmail = window.currentUserData?.email || window.currentUserData?.firebaseEmail || '';
    const sanitizedEmail = typeof rawEmail === 'string' ? rawEmail.trim() : '';
    const hasEmail = sanitizedEmail && sanitizedEmail.toLowerCase() !== 'no email set';
    const email = hasEmail ? sanitizedEmail : 'No email set';
    const status = window.currentUserData?.isLoggedIn ? 'Active' : 'Inactive';

    document.getElementById('accountUsername').textContent = username;
    updateEmailDisplay(email);
    document.getElementById('accountStatus').textContent = status;
    document.getElementById('accountStatus').className = 'setting-value ' + (status === 'Active' ? 'status-online' : '');
  }

  // Update email display with show/hide functionality
  function updateEmailDisplay(email) {
    const emailContainer = document.getElementById('emailContainer');
    const emailValue = document.getElementById('accountEmail');
    const emailToggle = document.getElementById('emailToggle');

    if (!emailContainer || !emailValue || !emailToggle) return;

    const normalized = typeof email === 'string' ? email.trim() : '';
    const hasEmail = normalized && normalized.toLowerCase() !== 'no email set';
    const showEmail = hasEmail && localStorage.getItem('showEmail') === 'true';

    if (!hasEmail) {
      emailValue.textContent = 'No email set';
      emailToggle.textContent = '➕ Add';
      emailToggle.title = 'Add an email address to your account';
      emailToggle.dataset.hasEmail = 'false';
      return;
    }

    emailToggle.dataset.hasEmail = 'true';

    if (showEmail) {
      emailValue.textContent = normalized;
      emailToggle.textContent = '🙈 Hide';
      emailToggle.title = 'Hide email address';
    } else {
      emailValue.textContent = '••••••••••••••••';
      emailToggle.textContent = '👁️ Show';
      emailToggle.title = 'Show email address';
    }
  }

  // Make updateEmailDisplay globally available
  window.updateEmailDisplay = updateEmailDisplay;

  // Load settings from localStorage
  function loadSettings() {
    // Privacy settings
    document.getElementById('showOnlineStatus').checked = localStorage.getItem('showOnlineStatus') !== 'false';
    document.getElementById('allowDMs').checked = localStorage.getItem('allowDMs') !== 'false';
    document.getElementById('showReadReceipts').checked = localStorage.getItem('showReadReceipts') === 'true';

    // Appearance settings
    document.getElementById('compactMode').checked = localStorage.getItem('compactMode') === 'true';
    document.getElementById('showAnimations').checked = localStorage.getItem('showAnimations') !== 'false';

    // Notification settings
    document.getElementById('desktopNotifications').checked = localStorage.getItem('desktopNotifications') !== 'false';
    document.getElementById('soundNotifications').checked = localStorage.getItem('soundNotifications') !== 'false';
    document.getElementById('messagePreviews').checked = localStorage.getItem('messagePreviews') !== 'false';
    document.getElementById('friendRequestNotifications').checked = localStorage.getItem('friendRequestNotifications') !== 'false';

    // Language setting
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.value = localStorage.getItem('language') || 'en';
    }

    // Theme setting
    const savedTheme = localStorage.getItem('theme') || 'default';
    document.querySelectorAll('.theme-option').forEach(option => {
      option.classList.toggle('active', option.dataset.theme === savedTheme);
    });
  }

  // Save setting to localStorage
  function saveSetting(key, value) {
    localStorage.setItem(key, value);
  }

  // Initialize settings when panel becomes active
  function initializeSettingsPanel() {
    // Load account info
    loadAccountInfo();

    // Load saved settings
    loadSettings();

    // Set up event listeners for settings
    setupSettingsListeners();
  }

  // Set up event listeners for all settings
  function setupSettingsListeners() {
    // Email visibility toggle
    const emailToggle = document.getElementById('emailToggle');
    if (emailToggle) {
      emailToggle.addEventListener('click', function() {
        const hasEmail = emailToggle.dataset.hasEmail === 'true';
        const currentEmail = window.currentUserData?.email || window.currentUserData?.firebaseEmail || '';

        if (!hasEmail || !currentEmail) {
          if (typeof resolveAndSyncUserEmail === 'function' && window.currentUserData?.username) {
            resolveAndSyncUserEmail(window.currentUserData.username, window.currentUserData.uuid);
          } else {
            console.warn('resolveAndSyncUserEmail helper not available; cannot collect email.');
          }
          return;
        }

        const currentState = localStorage.getItem('showEmail') === 'true';
        const newState = !currentState;
        localStorage.setItem('showEmail', newState.toString());

        const email = window.currentUserData?.email || window.currentUserData?.firebaseEmail || 'No email set';
        updateEmailDisplay(email);
      });
    }

    // Privacy settings
    document.getElementById('showOnlineStatus').addEventListener('change', function() {
      saveSetting('showOnlineStatus', this.checked);
    });

    document.getElementById('allowDMs').addEventListener('change', function() {
      saveSetting('allowDMs', this.checked);
    });

    document.getElementById('showReadReceipts').addEventListener('change', function() {
      saveSetting('showReadReceipts', this.checked);
    });

    // Appearance settings
    document.getElementById('compactMode').addEventListener('change', function() {
      saveSetting('compactMode', this.checked);
      applyCompactMode(this.checked);
    });

    document.getElementById('showAnimations').addEventListener('change', function() {
      saveSetting('showAnimations', this.checked);
      applyAnimationSetting(this.checked);
    });

    // Theme options
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', function() {
        const theme = this.dataset.theme;
        document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        saveSetting('theme', theme);
        applyTheme(theme);
      });
    });

    // Notification settings
    document.getElementById('desktopNotifications').addEventListener('change', function() {
      saveSetting('desktopNotifications', this.checked);
    });

    document.getElementById('soundNotifications').addEventListener('change', function() {
      saveSetting('soundNotifications', this.checked);
    });

    document.getElementById('messagePreviews').addEventListener('change', function() {
      saveSetting('messagePreviews', this.checked);
    });

    document.getElementById('friendRequestNotifications').addEventListener('change', function() {
      saveSetting('friendRequestNotifications', this.checked);
    });

    // Language setting
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.addEventListener('change', function() {
        saveSetting('language', this.value);
        // In a real app, you would reload the page or update UI strings
        showAlert('Language changed. Please refresh the page to apply changes.', 'info');
      });
    }
  }

  // Apply compact mode
  function applyCompactMode(enabled) {
    document.body.classList.toggle('compact-mode', enabled);
  }

  // Apply animation setting
  function applyAnimationSetting(enabled) {
    document.body.classList.toggle('no-animations', !enabled);
  }

  // Apply theme
  function applyTheme(theme) {
    document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
    if (theme !== 'default') {
      document.body.classList.add(`theme-${theme}`);
    }
  }

  // Account action functions
  window.showChangePassword = function() {
    showAlert('Password change functionality would be implemented here.', 'info');
  };

  window.showDeleteAccount = function() {
    showAlert(
      'Are you sure you want to delete your account? This action cannot be undone.',
      'warning',
      {
        buttons: ['Cancel', 'Delete Account'],
        onConfirm: () => {
          showAlert('Account deletion would be implemented here.', 'info');
        }
      }
    );
  };

  window.showBlockedUsers = function() {
    showAlert('Blocked users management would be implemented here.', 'info');
  };

  // Handle logout
  window.handleLogout = function() {
    showAlert(
      'Are you sure you want to log out?',
      'warning',
      {
        buttons: ['Cancel', 'Log Out'],
        onConfirm: () => {
          // Clear user data
          window.currentUserData = {
            uuid: null,
            username: null,
            email: null,
            isLoggedIn: false,
            isBanned: false,
            bannedInfo: null
          };

          // Set logout flag
          localStorage.setItem('justLoggedOut', '1');

          // Show logout message
          showAlert('You have been logged out successfully.', 'success');

          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      }
    );
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Listen for settings panel becoming active
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const panel = document.querySelector('.settings-panel.active');
          if (panel && panel.id === 'panel-account') {
            loadAccountInfo();
          }
        }
      });
    });

    const settingsPanels = document.querySelector('.settings-panels');
    if (settingsPanels) {
      observer.observe(settingsPanels, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class']
      });
    }

    // Apply saved settings on load
    loadSettings();
    applyCompactMode(localStorage.getItem('compactMode') === 'true');
    applyAnimationSetting(localStorage.getItem('showAnimations') !== 'false');
    applyTheme(localStorage.getItem('theme') || 'default');
  });

})();