/**
 * Cosmic Particle System - Optimized for Performance
 */

class CosmicParticles {
  // Handle window resize
  handleResize = () => {
    this.resizeCanvas();
  };

  // Start the animation
  start() {
    if (!this.animationId) {
      this.lastTime = performance.now();
      this.animate();
      return true;
    }
    return false;
  }

  // Update particle positions - simplified for performance
  updateParticles(dt = 1) {
    if (!this.particles || !Array.isArray(this.particles)) return;
    const { baseSpeed } = this.options;
    const width = this.canvas ? this.canvas.width / (window.devicePixelRatio || 1) : window.innerWidth;
    const height = this.canvas ? this.canvas.height / (window.devicePixelRatio || 1) : window.innerHeight;

    // Process particles in batches to reduce CPU usage
    const batchSize = 5;
    for (let i = 0; i < this.particles.length; i += batchSize) {
      for (let j = 0; j < batchSize && i + j < this.particles.length; j++) {
        const particle = this.particles[i + j];
        if (!particle) continue;

        // Simplified movement - less calculation
        particle.x += particle.vx * baseSpeed * dt;
        particle.y += particle.vy * baseSpeed * dt;

        // Wrap around edges
        if (particle.x < -particle.size * 2) particle.x = width + particle.size * 2;
        if (particle.x > width + particle.size * 2) particle.x = -particle.size * 2;
        if (particle.y < -particle.size * 2) particle.y = height + particle.size * 2;
        if (particle.y > height + particle.size * 2) particle.y = -particle.size * 2;
      }
    }
  }

  // Animation loop - throttled for performance
  animate(timestamp) {
    try {
      if (!this.ctx) {
        this.animationId = requestAnimationFrame(ts => this.animate(ts));
        return;
      }

      // Throttle animation to ~30fps for performance
      const now = timestamp || performance.now();
      if (now - this.lastFrameTime < 33) { // ~30fps
        this.animationId = requestAnimationFrame(ts => this.animate(ts));
        return;
      }
      this.lastFrameTime = now;

      // Calculate delta time (capped at 50ms to prevent large jumps)
      const deltaTime = Math.min(now - (this.lastTime || now - 16), 50);
      this.lastTime = now;

      // Update particles with normalized delta
      this.updateParticles(deltaTime / 16);

      // Draw the updated particles
      this.draw();

      // Continue the animation loop
      this.animationId = requestAnimationFrame(ts => this.animate(ts));
    } catch (error) {
      // Attempt to recover by restarting the animation
      this.animationId = requestAnimationFrame(ts => this.animate(ts));
    }
  }

  constructor(containerId = 'cosmicParticles', options = {}) {
    // Detect reduced motion or low-end device ONCE per instance
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;

    // Initialize properties
    this.animationId = null;
    this.lastTime = 0;
    this.lastFrameTime = 0;
    this.particles = [];
    this.isInitialized = false;
    this.initialDrawComplete = false;
    this.animationFrameRequested = false;

    // Set default options - significantly reduced for performance
    this.options = {
      particleCount: this.prefersReducedMotion ? 15 : (this.isLowEndDevice ? 25 : 40), // Reduced from 40/80
      minSize: 1,
      maxSize: this.prefersReducedMotion ? 1.5 : (this.isLowEndDevice ? 2 : 2.5), // Smaller particles
      baseSpeed: this.prefersReducedMotion ? 0.05 : 0.08, // Slower movement
      colors: [
        'rgba(138, 79, 255, 0.6)', // Reduced opacity
        'rgba(0, 191, 255, 0.6)',
        'rgba(255, 255, 255, 0.7)'
      ], // Fewer colors
      ...options
    };

    // Initialize in the next tick to ensure DOM is ready
    requestAnimationFrame(() => this.initialize(containerId));
  }
  
  initialize(containerId) {
    
    try {
      // Ensure DOM is ready
      if (document.readyState !== 'complete') {
        document.addEventListener('DOMContentLoaded', () => this.initialize(containerId));
        return;
      }
      
      // Get or create container
      this.container = document.getElementById(containerId);
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = containerId;
        this.container.className = 'cosmic-particles';
        
        // Make sure container is visible and properly positioned
        Object.assign(this.container.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          zIndex: '1000',
          pointerEvents: 'none',
          backgroundColor: 'transparent',
          overflow: 'hidden'
        });
        
        document.body.appendChild(this.container);
      } else {
      }
      
      // Set container styles
      Object.assign(this.container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '1',
        overflow: 'hidden',
        backgroundColor: 'transparent'
      });
      
      // Create canvas with explicit styles
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'cosmic-canvas';
      
      // Apply critical styles directly
      Object.assign(this.canvas.style, {
        display: 'block',
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '1001',
        pointerEvents: 'none'
      });
      
      this.container.appendChild(this.canvas);
      
      // Initialize canvas context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        throw new Error('Could not get 2D context');
      }
      
      // Initial resize and particle generation
      this.resizeCanvas();
      this.generateParticles();
      
      // Force initial draw
      this.draw();
      this.initialDrawComplete = true;
      
      // Only start animation if not reduced motion or low-end device
      if (!this.animationFrameRequested && !this.prefersReducedMotion && !this.isLowEndDevice) {
        this.animationFrameRequested = true;
        requestAnimationFrame((timestamp) => {
          this.lastTime = timestamp || performance.now();
          this.animate();
        });
      }
      
      // Add window resize listener
      window.addEventListener('resize', this.handleResize);
      
      this.isInitialized = true;      
      // Force multiple redraw attempts to ensure visibility
      const attemptDraw = (attempt = 0) => {
        if (attempt >= 5) return; // Max 5 attempts
        
        this.draw();
        
        if (attempt < 4) {
          setTimeout(() => attemptDraw(attempt + 1), 50 * (attempt + 1));
        }
      };
      
      // Initial draw attempts
      setTimeout(() => attemptDraw(0), 50);
    } catch (error) {
      throw error;
    }
  }
  
  resizeCanvas() {
    if (!this.canvas || !this.container) {
      return;
    }
    
    try {
      const rect = this.container.getBoundingClientRect();
      const width = Math.max(rect.width, window.innerWidth);
      const height = Math.max(rect.height, window.innerHeight);
      
      if (width <= 0 || height <= 0) {
        return;
      }
      
      // Update container size
      this.container.style.width = `${width}px`;
      this.container.style.height = `${height}px`;
      
      // Scale for high DPI displays
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      
      // Set canvas size
      const canvasWidth = Math.round(width * dpr);
      const canvasHeight = Math.round(height * dpr);
      
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      
      // Reset transform and scale
      if (this.ctx) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
      }
      
      
      
      // Regenerate particles to fill the new size
      this.generateParticles();
    } catch (error) {
      throw error;
    }
  }
  
  generateParticles() {
    if (!this.canvas || !this.ctx) {
      console.error('[TFG] Cannot generate particles: Canvas or context not ready');
      return;
    }
    
    try {
      this.particles = [];
      const { particleCount, minSize, maxSize, colors } = this.options;
      
      // Get the actual display size (not the scaled size)
      const width = this.canvas.width / (window.devicePixelRatio || 1);
      const height = this.canvas.height / (window.devicePixelRatio || 1);
      
      if (width <= 0 || height <= 0) {
        console.warn('[TFG] Invalid dimensions in generateParticles:', { width, height });
        return;
      }
      

      
      for (let i = 0; i < particleCount; i++) {
        const size = minSize + Math.random() * (maxSize - minSize);
        const speed = 0.05 + Math.random() * 0.15;
        const angle = Math.random() * Math.PI * 2;
        
        // Ensure particles are spread across the entire visible area
        this.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: size,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        });
      }
      // Force an immediate redraw
      this.draw();
    } catch (error) {
      console.error('[TFG] Error in generateParticles:', error);
    }
  }

  // Validate the canvas state before drawing
  validateCanvasState() {
    if (!this.canvas) {
      return false;
    }
    // Force a reflow to ensure canvas dimensions are updated
    const forceReflow = this.canvas.offsetHeight;
    const isValid = document.body.contains(this.canvas) &&
                   this.canvas.offsetWidth > 0 &&
                   this.canvas.offsetHeight > 0;
    return isValid;
  }

  // Force canvas to be treated as a side effect
  forceCanvasUpdate() {
    // This empty method call forces the canvas operations to not be optimized away
    return Math.random() >= 0;
  }
  
  draw() {
    // Force canvas to be treated as having side effects
    if (this.forceCanvasUpdate()) {
      // This empty block ensures the canvas operations aren't optimized away
    }
    
    // Validate canvas state before drawing
    if (!this.validateCanvasState()) {
      // Schedule a redraw on the next frame
      this.animationId = requestAnimationFrame(() => this.draw());
      return;
    }
    
    try {
      // Get the current display dimensions
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = this.canvas.offsetWidth || window.innerWidth;
      const height = this.canvas.offsetHeight || window.innerHeight;
      
      // Ensure we have valid dimensions
      if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
        console.warn('[Cosmic] Invalid canvas dimensions, skipping draw');
        return;
      }
      
      const displayWidth = Math.round(width * dpr);
      const displayHeight = Math.round(height * dpr);
      
      // Only resize canvas if needed
      if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;
        this.ctx.scale(dpr, dpr);
      }
      
      // Clear the canvas
      this.ctx.clearRect(0, 0, width, height);
      
      // Draw each particle
      this.particles.forEach(particle => {
        // Skip invalid particles
        if (!particle || !isFinite(particle.x) || !isFinite(particle.y) || !isFinite(particle.size)) {
          return;
        }
        
        const x = particle.x;
        const y = particle.y;
        const size = particle.size;
        
        // Skip particles outside the visible area with some padding
        if (x < -size * 2 || x > width + size * 2 || y < -size * 2 || y > height + size * 2) {
          return;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        
        try {
          // Add glow effect with safety checks
          const gradient = this.ctx.createRadialGradient(
            x, y, 0,
            x, y, size * 2
          );
          
          gradient.addColorStop(0, particle.color);
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          
          this.ctx.fillStyle = gradient;
          this.ctx.fill();
        } catch (e) {
          console.warn('[Cosmic] Error drawing particle:', e);
          // Fallback to simple fill if gradient fails
          this.ctx.fillStyle = particle.color;
          this.ctx.fill();
        }
      });
    } catch (error) {
      console.error('[Cosmic] Error in draw:', error);
    }
  }
  
  destroy() {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Clean up DOM
    if (this.container && this.canvas) {
      this.container.removeChild(this.canvas);
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Clear references
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.particles = [];
  }
}

// Export for use in other files
window.CosmicParticles = CosmicParticles;

// Add a global toggle for the effect
window.toggleCosmicParticlesEffect = function(enable) {
  if (window.cosmicParticles && window.cosmicParticles.container) {
    window.cosmicParticles.container.style.display = enable ? 'block' : 'none';
    if (enable && !window.cosmicParticles.animationId && !window.cosmicParticles.prefersReducedMotion && !window.cosmicParticles.isLowEndDevice) {
      window.cosmicParticles.animate();
    } else if (!enable && window.cosmicParticles.animationId) {
      window.cosmicParticles.destroy();
    }
  }
};

