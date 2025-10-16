/**
 * Input Animation Handler
 * Handles focus/blur animations for input fields
 */

(function() {
  'use strict';
  
  // Initialize input animations when DOM is ready
  function initInputAnimations() {
    // Get all input groups
    const inputGroups = document.querySelectorAll('.input-group');
    
    inputGroups.forEach(group => {
      const input = group.querySelector('input, textarea');
      
      if (!input) return;
      
      // Add focus event listener
      input.addEventListener('focus', function() {
        group.classList.add('focused');
      });
      
      // Add blur event listener
      input.addEventListener('blur', function() {
        group.classList.remove('focused');
      });
      
      // Check if input has value on load (for autofill)
      if (input.value) {
        group.classList.add('has-value');
      }
      
      // Monitor value changes
      input.addEventListener('input', function() {
        if (input.value) {
          group.classList.add('has-value');
        } else {
          group.classList.remove('has-value');
        }
      });
    });
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInputAnimations);
  } else {
    initInputAnimations();
  }
  
  // Re-initialize when new content is added (for dynamic forms)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.classList && node.classList.contains('input-group')) {
              initInputAnimations();
            } else if (node.querySelectorAll) {
              const newGroups = node.querySelectorAll('.input-group');
              if (newGroups.length > 0) {
                initInputAnimations();
              }
            }
          }
        });
      }
    });
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
})();
