/**
 * Ban Guard Utility
 * Prevents banned users from performing actions and secures the banned state
 */

// Store original functions we override
const originalFunctions = {
  sendMessage: window.sendMessage,
  open: window.open,
  alert: window.alert,
  confirm: window.confirm,
  prompt: window.prompt
};

// Block all keyboard shortcuts when banned
function blockKeyboardShortcuts(event) {
  if (!isUserBanned()) return;
  
  // Allow only Tab, Enter, and Escape keys for accessibility
  const allowedKeys = [9, 13, 27]; // Tab, Enter, Escape
  const target = event.target || event.srcElement;
  const isLogoutButton = target.closest('.logout-button');
  
  // Only allow tabbing to/from the logout button
  if (event.keyCode === 9 && isLogoutButton) return;
  
  // Block all other keys
  if (!allowedKeys.includes(event.keyCode)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
}

// Block right-click context menu
function blockContextMenu(event) {
  if (!isUserBanned()) return;
  event.preventDefault();
  event.stopPropagation();
  return false;
}

// Check if current user is banned
function isUserBanned() {
  return window.currentUserData && window.currentUserData.isBanned === true;
}

// Show banned message and return true if user is banned
function checkBanned() {
  if (isUserBanned() && window.BannedScreen) {
    // Ensure the banned screen is shown
    if (!document.getElementById('bannedOverlay')?.classList.contains('visible')) {
      window.BannedScreen.show(window.currentUserData.bannedInfo);
      blockPageInteractions();
    }
    return true;
  }
  return false;
}

// Block all page interactions when banned
function blockPageInteractions() {
  if (!isUserBanned()) return;
  
  // Block keyboard events
  document.addEventListener('keydown', blockKeyboardShortcuts, { capture: true, passive: false });
  document.addEventListener('keypress', blockKeyboardShortcuts, { capture: true, passive: false });
  document.addEventListener('keyup', blockKeyboardShortcuts, { capture: true, passive: false });
  
  // Block right-click and other interactions
  document.addEventListener('contextmenu', blockContextMenu, { capture: true });
  document.addEventListener('mousedown', blockContextMenu, { capture: true });
  
  // Block form submissions
  document.addEventListener('submit', blockFormSubmit, { capture: true });
  
  // Block all links
  document.addEventListener('click', blockLinks, { capture: true });
  
  // Block drag and drop
  document.addEventListener('dragstart', blockDragDrop, { capture: true });
  document.addEventListener('drop', blockDragDrop, { capture: true });
  
  // Block selection
  document.addEventListener('selectstart', blockSelection, { capture: true });
}

// Clean up event listeners when unbanned
function cleanupBlockers() {
  // Remove all our event listeners
  const events = ['keydown', 'keypress', 'keyup', 'contextmenu', 'mousedown', 'submit', 'click', 'dragstart', 'drop', 'selectstart'];
  const handlers = [blockKeyboardShortcuts, blockContextMenu, blockFormSubmit, blockLinks, blockDragDrop, blockSelection];
  
  events.forEach(event => {
    handlers.forEach(handler => {
      document.removeEventListener(event, handler, { capture: true });
      document.removeEventListener(event, handler, false);
    });
  });
}

// Block form submissions
function blockFormSubmit(event) {
  if (!isUserBanned()) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  return false;
}

// Block link clicks
function blockLinks(event) {
  if (!isUserBanned()) return;
  
  let target = event.target;
  while (target && target !== document) {
    if (target.tagName === 'A' || target.tagName === 'AREA' || target.getAttribute('role') === 'link') {
      // Allow logout link to work
      if (target.classList.contains('logout-button') || target.closest('.logout-button')) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
    target = target.parentNode;
  }
}

// Block drag and drop
function blockDragDrop(event) {
  if (!isUserBanned()) return;
  event.preventDefault();
  event.stopPropagation();
  return false;
}

// Block text selection
function blockSelection(event) {
  if (!isUserBanned()) return;
  event.preventDefault();
  event.stopPropagation();
  return false;
}

// Guard function to wrap around actions that should be blocked for banned users
function guardBanned(action) {
  if (checkBanned()) {
    console.warn('Action blocked: User is banned');
    return false;
  }
  return action ? action() : true;
}

// Override window functions to block for banned users
(function() {
  // Override sendMessage
  if (window.sendMessage) {
    window.sendMessage = function() {
      if (checkBanned()) {
        console.warn('Message sending blocked: User is banned');
        return Promise.reject(new Error('Cannot send messages while banned'));
      }
      return originalFunctions.sendMessage.apply(this, arguments);
    };
  }
  
  // Override window.open
  if (window.open) {
    window.open = function() {
      if (checkBanned()) {
        console.warn('Window.open blocked: User is banned');
        return null;
      }
      return originalFunctions.open.apply(this, arguments);
    };
  }
  
  // Override alert/confirm/prompt
  if (window.alert) {
    window.alert = function(message) {
      if (checkBanned()) {
        console.warn('Alert blocked:', message);
        return;
      }
      return originalFunctions.alert(message);
    };
  }
  
  if (window.confirm) {
    window.confirm = function(message) {
      if (checkBanned()) {
        console.warn('Confirm blocked:', message);
        return false;
      }
      return originalFunctions.confirm(message);
    };
  }
  
  if (window.prompt) {
    window.prompt = function(message, defaultValue) {
      if (checkBanned()) {
        console.warn('Prompt blocked:', message);
        return null;
      }
      return originalFunctions.prompt(message, defaultValue);
    };
  }
})();

// Block all buttons when banned
document.addEventListener('click', function(event) {
  if (!isUserBanned()) return;
  
  let target = event.target;
  while (target && target !== document) {
    if (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button') {
      // Allow logout button to work
      if (target.classList.contains('logout-button') || target.closest('.logout-button')) {
        return;
      }
      
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      // Show feedback that the action is blocked
      const originalText = target.textContent;
      target.textContent = 'Action Blocked';
      target.disabled = true;
      
      setTimeout(() => {
        target.textContent = originalText;
        target.disabled = false;
      }, 1000);
      
      return false;
    }
    target = target.parentNode;
  }
}, { capture: true });

// Initialize ban guard when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBanGuard);
} else {
  initializeBanGuard();
}

// Initialize the ban guard
function initializeBanGuard() {
  // Check if user is already banned on page load
  if (isUserBanned()) {
    checkBanned();
  }
  
  // Watch for changes to the banned status
  const originalUserData = window.currentUserData || {};
  
  Object.defineProperty(window, 'currentUserData', {
    get: function() {
      return originalUserData;
    },
    set: function(newValue) {
      // Handle null value (logout)
      if (newValue === null) {
        Object.assign(originalUserData, { isBanned: false });
        cleanupBlockers();
        return;
      }
      
      const wasBanned = originalUserData.isBanned;
      Object.assign(originalUserData, newValue);
      
      // If user just got banned, show the banned screen
      if (newValue.isBanned && !wasBanned) {
        checkBanned();
      }
      // If user was unbanned, clean up blockers
      else if (!newValue.isBanned && wasBanned) {
        cleanupBlockers();
      }
    }
  });
}

// Export for testing and debugging
window.BanGuard = {
  isUserBanned,
  checkBanned,
  guardBanned,
  cleanupBlockers,
  blockPageInteractions
};
