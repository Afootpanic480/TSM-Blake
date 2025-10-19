// Initialize global alerts
(function() {
  // Skip if already initialized
  if (window._globalAlertsInitialized) return;
  window._globalAlertsInitialized = true;

  // Original fetch implementation
  if (!window._originalFetch) {
    window._originalFetch = window.fetch;
  }
})();

// Helper function to safely parse JSON
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

// Global variables to manage alert state
let _pendingAlertData = null;
let _initialAlertFetched = false;
let _lastGlobalAlertMessage = null;
let _globalAlertDismissed = false;

function fetchAlert(isInitial = false) {
  const url = new URL(GlobalAlerts);
  
  // First try to use fetch with CORS
  fetch(url.toString())
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      // First try to parse as JSON, if that fails, try to handle as JSONP
      return response.text().then(text => {
        try {
          // Try to parse as regular JSON first
          return JSON.parse(text);
        } catch (e) {
          // If it's a JSONP response, extract the JSON part
          const jsonpMatch = text.match(/^\s*\w+\(\s*({[\s\S]*})\s*\)\s*;?\s*$/);
          if (jsonpMatch && jsonpMatch[1]) {
            try {
              return JSON.parse(jsonpMatch[1]);
            } catch (e) {
              console.warn('Failed to parse JSONP response:', e);
              throw new Error('Invalid JSONP response format');
            }
          }
          throw e; // Re-throw if not JSONP
        }
      });
    })
    .then(data => {
      if (isInitial) {
        console.log('Fetched alert:', data);
      }
      handleAlertResponse(data);
    })
    .catch(fetchError => {
      if (isInitial) {
        console.log('Fetch API failed, falling back to JSONP:', fetchError);
      }
      
      // Fall back to JSONP if fetch fails or response is not parseable
      const jsonpUrl = new URL(GlobalAlerts);
      const callbackName = 'jsonpCallback_' + Math.round(Math.random() * 1000000);
      
      // Create a promise that will be resolved when the JSONP callback is called
      const jsonpPromise = new Promise((resolve, reject) => {
        window[callbackName] = (data) => {
          cleanup();
          resolve(data);
        };
        
        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('JSONP request timed out'));
        }, 10000); // 10 second timeout
        
        const script = document.createElement('script');
        script.src = `${jsonpUrl.toString()}${jsonpUrl.search ? '&' : '?'}callback=${encodeURIComponent(callbackName)}`;
        
        script.onerror = () => {
          cleanup();
          reject(new Error('JSONP script failed to load'));
        };
        
        function cleanup() {
          clearTimeout(timeoutId);
          delete window[callbackName];
          if (script.parentNode) {
            document.head.removeChild(script);
          }
        }
        
        document.head.appendChild(script);
        
        jsonpPromise
          .then(data => {
            if (isInitial) {
              console.log('Fetched alert via JSONP:', data);
            }
            handleAlertResponse(data);
          })
          .catch(err => {
            if (isInitial) {
              console.error('JSONP request failed:', err);
              showGlobalAlert('Failed to load alert. Check Console for details.', true);
            }
          });
      });
    })
    .catch(fetchError => {
      console.error('Fetch API failed:', fetchError);
      showGlobalAlert('Failed to load alert. Check Console for details.', true);
    });
}

// Handle the alert response from the server
function handleAlertResponse(data) {
  try {
    if (data && 'message' in data) {
      if (data.message) {
        // Store the alert data and process it when the DOM is ready
        _pendingAlertData = { message: data.message, isError: false };
      } else {
        // Only hide, no logs for recalled/empty alerts
        hideGlobalAlert();
        return;
      }
    } else {
      console.warn('Global alert: Failed to load alert: Invalid response', data);
      _pendingAlertData = { message: 'Failed to load alert: Invalid response', isError: true };
    }
    
    // If the DOM is already loaded, process the alert immediately
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      processPendingAlert();
    } else {
      // Otherwise, wait for the DOM to be fully loaded
      document.addEventListener('DOMContentLoaded', processPendingAlert);
    }
  } catch (err) {
    console.error('Error in handleAlertResponse:', err);
    showGlobalAlert('An error occurred while processing the alert.', true);
  }
}

// Process any pending alert once the DOM is ready
function processPendingAlert() {
  if (!_pendingAlertData) return;
  
  // Process the alert data
  const { message, isError } = _pendingAlertData;
  
  if (message) {
    // Small delay to ensure all elements are rendered
    setTimeout(() => {
      showGlobalAlert(message, isError);
    }, 500);
  }
  
  // Clear the pending alert data
  _pendingAlertData = null;
}

// Initialize the global alerts when the script loads
(function initGlobalAlerts() {
  // If the DOM is already loaded, fetch the alert immediately
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    fetchAlert(true);
  } else {
    // Otherwise, wait for the DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', () => {
      fetchAlert(true);
    });
  }
})();

function setAlert(event) {
  event.preventDefault();
  const input = document.getElementById('alertInput');
  if (input) {
    const message = input.value.trim();
    const url = new URL(GlobalAlerts);
    url.searchParams.append('callback', 'handleSetResponse');
    url.searchParams.append('message', encodeURIComponent(message));
    console.log('Setting alert:', url.toString());
    const script = document.createElement('script');
    script.src = url.toString();
    script.onerror = () => showGlobalAlert('Could not set alert.', true);
    script.onload = () => console.log('Set script loaded');
    document.head.appendChild(script);
  }
}

function handleSetResponse(data) {
  console.log('Set response:', data);
  if (data && 'message' in data) {
    showGlobalAlert(data.message || 'Alert set.');
    const input = document.getElementById('alertInput');
    if (input) input.value = '';
  } else {
    showGlobalAlert('Error setting alert.', true);
  }
}

function dismissAlert() {
  // First trigger the visual animation
  hideGlobalAlert();
  
  // Then handle the server-side dismissal after a short delay
  // to ensure the animation has time to start
  setTimeout(() => {
    const url = new URL(GlobalAlerts);
    url.searchParams.append('callback', 'handleDismissResponse');
    url.searchParams.append('message', '');
    console.log('Dismissing alert on server:', url.toString());
    
    const script = document.createElement('script');
    script.src = url.toString();
    script.onerror = () => {
      console.error('Failed to dismiss alert on server');
      // Don't show an error to the user since the alert is already hidden
    };
    document.head.appendChild(script);
    
    // Clean up the script tag after it loads or fails
    setTimeout(() => {
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    }, 5000); // Clean up after 5 seconds regardless
  }, 100); // Small delay to ensure animation starts
}

function handleDismissResponse(data) {
  console.log('Dismiss response:', data);
  if (data && !data.message) {
    hideGlobalAlert();
}
}

// Particle effects removed for performance optimization on lower-end devices

function showGlobalAlert(message, isError = false) {
  // If confirmation prompt is open, do not update the alert
  if (window._globalAlertLinkConfirming) return;
  
  // Reset confirmation state and UI before rendering new alert
  window._globalAlertLinkConfirming = false;
  
  // Remove confirmation prompt if present
  const confirmPrompt = document.getElementById('alertLinkConfirmPrompt');
  if (confirmPrompt && confirmPrompt.parentNode) {
    confirmPrompt.parentNode.removeChild(confirmPrompt);
  }

  const container = document.getElementById('globalAlert');
  const messageEl = document.getElementById('alertMessage');

  if (container && messageEl) {
    // Remove any existing closing class and reset transform
    container.classList.remove('closing');
    container.style.animation = 'none';
    container.offsetHeight; // Trigger reflow
    container.style.animation = null;

    // Improved link detection: https?://... or drive.*.com (with or without protocol)
    const linkRegex = /(https?:\/\/[^\s]+)|(\bdrive\.[\w\-]+\.com[^\s]*)/gi;
    const htmlMessage = message.replace(linkRegex, (match, p1, p2) => {
      let href = match;
      if (!/^https?:\/\//i.test(href)) {
        href = 'https://' + href;
      }
      // Place link on a new line
      let extraClass = '';
      if (match.length > 40) extraClass = ' alert-long-link';
      return `<br><a href="${href}" target="_blank" rel="noopener noreferrer" class="${extraClass.trim()}">${match}</a>`;
    });

    messageEl.innerHTML = htmlMessage;
    container.style.display = 'flex';
    container.style.opacity = '1';

    if (isError) {
      container.classList.add('error');
    } else {
      container.classList.remove('error');
    }

    // Add close button if not exists or re-attach handler
    let closeBtn = document.getElementById('dismissGlobalAlertBtn');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.id = 'dismissGlobalAlertBtn';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Dismiss alert');
      container.appendChild(closeBtn);
    }
    // Always ensure the onclick handler is attached
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideGlobalAlert();
    };

    highlightLinks();

    // Trigger reflow to ensure animation plays
    container.offsetHeight;
  }
}

function hideGlobalAlert() {
  const alert = document.getElementById('globalAlert');
  if (!alert) return;

  // Add closing class to trigger animation
  alert.classList.add('closing');

  // Use both animationend and a timeout fallback to ensure it always closes
  let hasHidden = false;
  
  const hideAlert = () => {
    if (hasHidden) return;
    hasHidden = true;
    alert.style.display = 'none';
    alert.classList.remove('closing');
  };

  // Listen for animation end
  alert.addEventListener('animationend', hideAlert, { once: true });
  
  // Fallback timeout in case animation doesn't fire (e.g., animations disabled)
  setTimeout(hideAlert, 500); // 500ms matches the animation duration
}


// allows text to be highlighted in the global alert box if it contains a link
function highlightLinks() {
  const messageEl = document.getElementById('alertMessage');
  // Store the original alert message string for restoring after confirmation
  const container = document.getElementById('globalAlert');
  let originalMessage = container ? container.dataset.originalAlertMessage : undefined;
  if (!originalMessage && container) {
    // Try to get from the last message shown
    originalMessage = messageEl.textContent;
    container.dataset.originalAlertMessage = originalMessage;
  }
  if (messageEl) {
    const links = messageEl.getElementsByTagName('a');
    for (const link of links) {
      link.addEventListener('click', function(event) {
        if (window._globalAlertLinkConfirming) return;
        event.preventDefault();
        window._globalAlertLinkConfirming = true;
        // Save the current HTML so we can restore it
        const alertMessageEl = document.getElementById('alertMessage');
        const originalMessageHTML = alertMessageEl.innerHTML;
        // Replace the alert message with the confirmation prompt
        alertMessageEl.innerHTML = `
          <div style="font-size:0.9em;margin-bottom:12px;">This link was posted via global alert.<br>Are you sure you want to visit this site?</div>
          <div style="margin-bottom:10px;"><span class="alert-long-link"><a href="${link.href}" target="_blank" rel="noopener noreferrer">${link.href}</a></span></div>
          <button id="alertLinkOpenBtn" class="alert-link-btn">Open Link</button>
          <button id="alertLinkCancelBtn" class="alert-link-btn-cancel">Cancel</button>
        `;
        setTimeout(() => {
          const openBtn = document.getElementById('alertLinkOpenBtn');
          const cancelBtn = document.getElementById('alertLinkCancelBtn');
          if (openBtn) openBtn.onclick = () => {
            window._globalAlertLinkConfirming = false;
            alertMessageEl.innerHTML = originalMessageHTML;
            highlightLinks();
            window.open(link.href, '_blank', 'noopener');
          };
          if (cancelBtn) cancelBtn.onclick = () => {
            window._globalAlertLinkConfirming = false;
            alertMessageEl.innerHTML = originalMessageHTML;
            highlightLinks();
          };
        }, 10);
      });
    }
  }
}

// Track last alert message and dismissed state
// These variables are now declared at the top of the file

function fetchAlertInterval() {
  if (_globalAlertDismissed) return; // Don't fetch if dismissed
  if (window._globalAlertLinkConfirming) return; // Don't fetch if confirmation prompt is open
  fetchAlert(false);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    fetchAlert(true); // Initial fetch with logging
    setInterval(fetchAlertInterval, 10000); // Every 10 seconds
    
    // Set up form and dismiss button if they exist
    const form = document.querySelector('form');
    if (form) form.addEventListener('submit', setAlert);
    const dismissBtn = document.getElementById('dismissAlertBtn');
    if (dismissBtn) dismissBtn.addEventListener('click', () => {
      _globalAlertDismissed = true;
      dismissAlert();
      hideGlobalAlert();
    });
  });
} else {
  fetchAlert(true);
  setInterval(fetchAlertInterval, 10000);
  
  // Set up form and dismiss button if they exist
  const form = document.querySelector('form');
  if (form) form.addEventListener('submit', setAlert);
  const dismissBtn = document.getElementById('dismissAlertBtn');
  if (dismissBtn) dismissBtn.addEventListener('click', () => {
    _globalAlertDismissed = true;
    dismissAlert();
    hideGlobalAlert();
  });
}

// Patch showGlobalAlert to only show if message has changed and not dismissed
const _origShowGlobalAlert = showGlobalAlert;
showGlobalAlert = function(message, isError = false) {
  if (_globalAlertDismissed) return;
  if (_lastGlobalAlertMessage === message) return; // Do nothing if same
  _lastGlobalAlertMessage = message;
  _origShowGlobalAlert(message, isError);
};