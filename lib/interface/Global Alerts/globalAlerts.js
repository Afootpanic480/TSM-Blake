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
        
        // Create cosmic particle effects with improved visual quality
        function createParticles(container, count = 32) {
          const particles = [];
          const colors = [
            '#5a1ea8', '#6a4ac9', '#0066cc', // Deep purples and blues
            '#00a8ff', '#00e5ff', '#b388ff', // Bright cyans and purples
            '#ff4081', '#ff6d00'             // Accent colors
          ];
          
          const containerRect = container.getBoundingClientRect();
          const centerX = containerRect.width / 2;
          const centerY = containerRect.height / 2;
          
          // Create particle container with improved stacking context
          const particlesContainer = document.createElement('div');
          Object.assign(particlesContainer.style, {
            position: 'absolute',
            inset: '0',
            overflow: 'hidden',
            borderRadius: '24px',
            pointerEvents: 'none',
            zIndex: '10001',
            mixBlendMode: 'screen',
            filter: 'contrast(1.5) brightness(1.2)'
          });
          container.appendChild(particlesContainer);
          
          // Create particles with improved distribution
          for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const size = Math.random() * 8 + 2; // Smaller particles
            const color = colors[Math.floor(Math.random() * colors.length)];
            const angle = (i / count) * Math.PI * 2;
            const distance = 15 + Math.random() * 25; // Wider spread
            const startX = centerX + Math.cos(angle) * distance * (0.8 + Math.random() * 0.4);
            const startY = centerY + Math.sin(angle) * distance * (0.8 + Math.random() * 0.4);
            
            // Create gradient for each particle
            const gradientId = `particle-gradient-${i}`;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            gradient.id = gradientId;
            
            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', 'white');
            
            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', color);
            
            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            defs.appendChild(gradient);
            svg.appendChild(defs);
            svg.style.position = 'absolute';
            svg.style.width = '0';
            svg.style.height = '0';
            container.appendChild(svg);
            
            Object.assign(particle.style, {
              position: 'absolute',
              width: `${size}px`,
              height: `${size}px`,
              background: `url(#${gradientId})`,
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: '10002',
              opacity: '0',
              boxShadow: `0 0 ${size * 4}px ${size * 0.8}px ${color}90`,
              left: `${startX}px`,
              top: `${startY}px`,
              transform: 'translate(-50%, -50%) scale(0)',
              willChange: 'transform, opacity, box-shadow',
              transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.3, 1.3)',
              filter: 'blur(0.5px)'
            });
            
            particlesContainer.appendChild(particle);
            
            particles.push({
              element: particle,
              startX,
              startY,
              angle: angle + (Math.random() - 0.5) * 0.7,
              speed: 0.8 + Math.random() * 1.2,
              distance: 40 + Math.random() * 120,
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 0.15,
              size: size,
              svg: svg
            });
          }
          
          // Trigger reflow to ensure transitions work
          void particlesContainer.offsetWidth;
          
          // Animate particles
          const duration = 1200; // 1.2 seconds
          const startTime = performance.now();
          let animationFrame;
          
          // Initial state with staggered delay
          particles.forEach((particle, index) => {
            const delay = index * 20; // Stagger each particle's start
            setTimeout(() => {
              particle.element.style.opacity = '0.9';
              particle.element.style.transform = 'translate(-50%, -50%) scale(1)';
              particle.element.style.transition = 'all 0.8s cubic-bezier(0.2, 0.8, 0.3, 1.3)';
            }, delay);
          });
          
          function updateParticles(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            // Update each particle
            particles.forEach(particle => {
              // Calculate movement with easing
              const moveProgress = Math.min(progress * 1.4, 1);
              const easedProgress = 1 - Math.pow(1 - moveProgress, 2); // Ease out quad
              
              // Calculate new position
              const distance = particle.distance * easedProgress;
              const x = particle.startX + Math.cos(particle.angle) * distance - centerX;
              const y = particle.startY + Math.sin(particle.angle) * distance - centerY - (progress * 60);
              
              // Update rotation and scale with easing
              particle.rotation += particle.rotationSpeed;
              const scale = 1 + (easedProgress * 0.8);
              const opacity = 0.9 * (1 - progress);
              
              // Get particle color for shadow
              const color = particle.element.style.background.match(/#[a-f0-9]+/i)?.[0] || '#ffffff';
              
              // Apply styles with hardware-accelerated properties
              particle.element.style.transform = `translate3d(-50%, -50%, 0) translate3d(${x}px, ${y}px, 0) rotate(${particle.rotation}rad) scale(${scale})`;
              particle.element.style.opacity = opacity.toString();
              particle.element.style.boxShadow = `0 0 ${particle.size * 4 * (1 + easedProgress)}px ${particle.size * (0.8 + easedProgress * 0.5)}px ${color}90`;
            });
            
            // Continue animation or clean up
            if (progress < 1) {
              animationFrame = requestAnimationFrame(updateParticles);
            } else {
              // Cleanup after animation completes
              setTimeout(() => {
                // Remove all particles and container
                particlesContainer.remove();
                particles.forEach(particle => {
                  if (particle.svg && particle.svg.parentNode) {
                    particle.svg.remove();
                  }
                });
                
                // Cancel any pending animation frame
                if (animationFrame) {
                  cancelAnimationFrame(animationFrame);
                }
              }, 200);
            }
          }
          
          // Start animation with a small delay to allow initial render
          setTimeout(() => {
            animationFrame = requestAnimationFrame(updateParticles);
          }, 50);
        }
        
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

function createParticles(container, count) {
const particles = document.createElement('div');
particles.className = 'particles';
container.appendChild(particles);

// Get container dimensions
const rect = container.getBoundingClientRect();
const centerX = rect.width / 2;
const centerY = rect.height / 2;

// Create particles
for (let i = 0; i < count; i++) {
const particle = document.createElement('div');
particle.className = 'particle';

// Calculate position in a circular pattern
const angle = Math.random() * Math.PI * 2;
const distance = 5 + Math.random() * 20;
const x = centerX + Math.cos(angle) * distance - 10; // -10 to center the particle
const y = centerY + Math.sin(angle) * distance - 10; // -10 to center the particle

// Random properties
const size = 2 + Math.random() * 4;
const duration = 0.8 + Math.random() * 0.8;
const delay = Math.random() * 0.2;
const hue = 220 + Math.random() * 80; // Blue to purple range
const brightness = 70 + Math.random() * 20;

// Set initial position
Object.assign(particle.style, {
width: `${size}px`,
height: `${size}px`,
left: `${centerX - size/2}px`,
top: `${centerY - size/2}px`,
background: `hsla(${hue}, 100%, ${brightness}%, 0.9)`,
borderRadius: '50%',
position: 'absolute',
pointerEvents: 'none',
zIndex: 10001,
transform: 'translate(-50%, -50%)',
boxShadow: `0 0 ${size * 2}px ${size/2}px hsla(${hue}, 100%, ${brightness}%, 0.5)`,
opacity: '0',
transition: 'opacity 0.2s ease-out'
});

// Add to DOM first to trigger reflow
particles.appendChild(particle);

// Force reflow
void particle.offsetWidth;

// Fade in
particle.style.opacity = '0.9';

// Animate after a short delay
setTimeout(() => {
const endX = x + (Math.random() - 0.5) * 100;
const endY = y + (Math.random() - 0.5) * 100 - 20; // Slight upward bias

particle.style.transition = `transform ${duration}s cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${duration * 0.8}s ease-out`;

// Trigger animation
requestAnimationFrame(() => {
particle.style.transform = `translate(${endX}px, ${endY}px) scale(${0.2 + Math.random() * 0.3})`;
particle.style.opacity = '0';
});
}, delay * 1000);
}

// Remove particles after animation
setTimeout(() => {
if (particles.parentNode) {
particles.parentNode.removeChild(particles);
}
}, 2000);
}

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

    // Add close button if not exists
    if (!document.getElementById('dismissGlobalAlertBtn')) {
      const closeBtn = document.createElement('button');
      closeBtn.id = 'dismissGlobalAlertBtn';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Dismiss alert');
      closeBtn.onclick = hideGlobalAlert;
      container.appendChild(closeBtn);
    }

    highlightLinks();

    // Trigger reflow to ensure animation plays
    container.offsetHeight;
  }
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
    
    // Add close button if not exists
    if (!document.getElementById('dismissGlobalAlertBtn')) {
      const closeBtn = document.createElement('button');
      closeBtn.id = 'dismissGlobalAlertBtn';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Dismiss alert');
      closeBtn.onclick = hideGlobalAlert;
      container.appendChild(closeBtn);
    }
    
    highlightLinks();
    
    // Trigger reflow to ensure animation plays
    container.offsetHeight;
  }
}

function hideGlobalAlert() {
  const alert = document.getElementById('globalAlert');
  if (!alert) return;

  alert.classList.add('closing');

  alert.addEventListener('animationend', () => {
    alert.style.display = 'none';
    alert.classList.remove('closing');
  }, { once: true });
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