// Debug: Check if CosmicParticles is defined
console.log('[TFG] Checking if CosmicParticles is defined:', typeof CosmicParticles);

// Initialize cosmic particles system when the DOM is ready
function initCosmicParticles() {
  console.log('[TFG] Initializing cosmic particles...');
  
  try {
    // Ensure the container exists
    let container = document.getElementById('cosmicParticles');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cosmicParticles';
      container.className = 'cosmic-particles';
      Object.assign(container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '1',
        opacity: '0.9',
        display: 'none' // Start hidden, will be shown when toggled on
      });
      document.body.appendChild(container);
    } else {
      // Ensure container is hidden initially
      container.style.display = 'none';
    }
    
    // Initialize the particle system with reduced count for performance
    window.cosmicParticles = new CosmicParticles('cosmicParticles', {
      particleCount: 50, // Reduced from 200 for better performance
      minSize: 1,
      maxSize: 3, // Reduced from 4
      baseSpeed: 0.08, // Reduced from 0.1
      colors: [
        'rgba(138, 79, 255, 0.6)', // Reduced opacity
        'rgba(0, 191, 255, 0.6)',
        'rgba(255, 107, 255, 0.6)',
        'rgba(0, 255, 204, 0.6)',
        'rgba(255, 255, 255, 0.7)'
      ]
    });
    
    return true;
  } catch (error) {
    console.error('[TFG] Error initializing cosmic particles:', error);
    return false;
  }
}

// Toggle cosmic particles on/off
function toggleCosmicParticles(show = true) {
  
  const container = document.getElementById('cosmicParticles');
  if (!container) {
    console.error('[Cosmic] Particle container not found');
    return false;
  }
  
  if (!window.cosmicParticles) {
    console.error('[Cosmic] Particle system not initialized');
    return false;
  }
  
  try {
    if (show) {
      container.style.display = 'block';
      // The CosmicParticles class now handles its own animation loop
      // No need to call start() as it's already running
      container.classList.add('active');
    } else {
      // Just hide the container, the animation will continue but not be visible
      container.style.display = 'none';
      container.classList.remove('active');
    }
    return true;
  } catch (error) {
    console.error('[TFG] Error toggling particles:', error);
    return false;
  }
}

// Initialize cosmic particles when the DOM is ready
function initializeParticleSystem() {
  
  try {
    // Create planets first
    createPlanets();
    
    // Then initialize particles (which will serve as stars)
    const initSuccess = initCosmicParticles();
    
    if (initSuccess) {
      // Start with particles visible after a short delay to ensure everything is ready
      setTimeout(() => {
        toggleCosmicParticles(true);
      }, 100);
      
      // Stop particles when user logs in
      document.addEventListener('userLoggedIn', () => {
        toggleCosmicParticles(false);
      });
      
    } else {
      console.error('[TFG] Failed to initialize particle system');
    }
  } catch (error) {
    console.error('[TFG] Error in particle system initialization:', error);
  }
}

// Export functions for other scripts
window.CosmicParticlesManager = {
  init: initCosmicParticles,
  toggle: toggleCosmicParticles
};

// Create planets
function createPlanets() {
  const container = document.getElementById('planets');
  if (!container) {
    console.warn('[TFG] Planets container not found');
    return;
  }
  
  // Ensure planets container is above the particle system
  container.style.position = 'relative';
  container.style.zIndex = '10';
  
  const planets = [
    { 
      size: '100px', 
      color: '#ff6b6b', 
      top: '15%', 
      left: '10%',
      delay: 0.2  // Reduced from 0.5
    },
    { 
      size: '60px', 
      color: '#4ecdc4', 
      top: '70%', 
      left: '80%',
      delay: 0.4  // Reduced from 1.0
    },
    { 
      size: '40px', 
      color: '#45b7d1', 
      top: '20%', 
      left: '85%',
      delay: 0.6  // Reduced from 1.5
    },
    { 
      size: '30px', 
      color: '#96ceb4', 
      top: '80%', 
      left: '15%',
      delay: 0.8  // Reduced from 2.0
    }
  ];
  
  // Add CSS for planet animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes planetFadeIn {
      0% { 
        opacity: 0;
        transform: scale(0.8) translateY(10px);
      }
      100% { 
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    .planet {
      position: absolute;
      border-radius: 50%;
      opacity: 0; /* Start invisible */
      animation: planetFadeIn 0.6s ease-out forwards;
      box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      z-index: 10; /* Ensure planets are above particles */
      pointer-events: auto; /* Allow interaction */
    }
    .planet:hover {
      transform: scale(1.1);
      box-shadow: 0 0 50px rgba(255, 255, 255, 0.4);
    }
  `;
  document.head.appendChild(style);
  
  // Create planets with staggered fade-in
  planets.forEach((planet, index) => {
    const planetEl = document.createElement('div');
    planetEl.className = 'planet';
    planetEl.style.width = planet.size;
    planetEl.style.height = planet.size;
    planetEl.style.background = `radial-gradient(circle at 30% 30%, #fff, ${planet.color} 70%)`;
    planetEl.style.top = planet.top;
    planetEl.style.left = planet.left;
    planetEl.style.animationDelay = `${planet.delay}s`;
    planetEl.style.animationFillMode = 'forwards';
    
    // Add subtle pulsing effect
    planetEl.style.setProperty('--pulse-scale', '1');
    planetEl.style.boxShadow = `0 0 ${parseInt(planet.size) * 0.5}px ${planet.color}`;
    
    container.appendChild(planetEl);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeParticleSystem);
} else {
  // If the document is already loaded, initialize immediately
  setTimeout(initializeParticleSystem, 100); // Small delay to ensure everything is ready
}