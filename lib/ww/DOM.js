document.addEventListener('DOMContentLoaded', () => {
  // Initialize planets - cosmic particles are initialized separately
  if (typeof createPlanets === 'function') {
    createPlanets();
  }
});
