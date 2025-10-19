// Image Cropper - Zoom and Pan for Avatar Upload
class ImageCropper {
  constructor() {
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.image = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.onComplete = null;
  }

  /**
   * Open cropper modal with image
   * @param {File} file - Image file
   * @returns {Promise<Blob>} Cropped image blob
   */
  open(file) {
    return new Promise((resolve, reject) => {
      this.onComplete = resolve;
      this.createModal();
      this.loadImage(file);
    });
  }

  createModal() {
    // Create modal overlay
    this.modal = document.createElement('div');
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Container card
    const card = document.createElement('div');
    card.style.cssText = `
      background: #2b2d31;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 500px;
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Crop Your Avatar';
    title.style.cssText = `
      color: #fff;
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 600;
    `;
    card.appendChild(title);

    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Drag to reposition • Use slider to zoom';
    instructions.style.cssText = `
      color: #b5bac1;
      margin: 0 0 20px 0;
      font-size: 14px;
    `;
    card.appendChild(instructions);

    // Canvas container with border
    const canvasWrapper = document.createElement('div');
    canvasWrapper.style.cssText = `
      position: relative;
      padding: 8px;
      background: linear-gradient(135deg, #5865f2 0%, #7289da 100%);
      border-radius: 50%;
      margin-bottom: 24px;
    `;

    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
      position: relative;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      overflow: hidden;
      background: #1e1f22;
      cursor: move;
      box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
    `;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 400;
    this.canvas.height = 400;
    this.ctx = this.canvas.getContext('2d');
    canvasContainer.appendChild(this.canvas);
    canvasWrapper.appendChild(canvasContainer);
    card.appendChild(canvasWrapper);

    // Zoom control
    const zoomControl = document.createElement('div');
    zoomControl.style.cssText = `
      width: 100%;
      margin-bottom: 24px;
      background: #1e1f22;
      padding: 16px;
      border-radius: 12px;
    `;

    const zoomHeader = document.createElement('div');
    zoomHeader.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 12px;';

    const zoomLabel = document.createElement('label');
    zoomLabel.textContent = 'Zoom';
    zoomLabel.style.cssText = 'color: #b5bac1; font-size: 14px; font-weight: 500;';
    
    this.zoomValue = document.createElement('span');
    this.zoomValue.textContent = '100%';
    this.zoomValue.style.cssText = 'color: #5865f2; font-size: 14px; font-weight: 600;';

    zoomHeader.appendChild(zoomLabel);
    zoomHeader.appendChild(this.zoomValue);
    zoomControl.appendChild(zoomHeader);
    
    const zoomSlider = document.createElement('input');
    zoomSlider.type = 'range';
    zoomSlider.min = '1';
    zoomSlider.max = '3';
    zoomSlider.step = '0.1';
    zoomSlider.value = '1';
    zoomSlider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #313338;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
    `;
    
    // Custom slider thumb styling
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #5865f2;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #5865f2;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        background: #7289da;
      }
      input[type="range"]::-moz-range-thumb:hover {
        background: #7289da;
      }
    `;
    document.head.appendChild(style);
    
    zoomSlider.addEventListener('input', (e) => {
      this.scale = parseFloat(e.target.value);
      this.zoomValue.textContent = Math.round(this.scale * 100) + '%';
      this.constrainOffset();
      this.render();
    });

    zoomControl.appendChild(zoomSlider);
    card.appendChild(zoomControl);

    // Buttons
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 12px; width: 100%;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 14px 24px;
      background: #4e5058;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 500;
      transition: background 0.2s;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#5d5f66';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#4e5058';
    cancelBtn.onclick = () => {
      this.onComplete = null;
      this.close();
    };

    const cropBtn = document.createElement('button');
    cropBtn.textContent = 'Crop & Upload';
    cropBtn.style.cssText = `
      flex: 2;
      padding: 14px 24px;
      background: #5865f2;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 500;
      transition: background 0.2s;
    `;
    cropBtn.onmouseover = () => cropBtn.style.background = '#4752c4';
    cropBtn.onmouseout = () => cropBtn.style.background = '#5865f2';
    cropBtn.onclick = () => this.crop();

    buttons.appendChild(cancelBtn);
    buttons.appendChild(cropBtn);
    card.appendChild(buttons);

    this.modal.appendChild(card);

    // Add drag events
    this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
    this.canvas.addEventListener('mousemove', (e) => this.drag(e));
    this.canvas.addEventListener('mouseup', () => this.endDrag());
    this.canvas.addEventListener('mouseleave', () => this.endDrag());

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.drag(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.endDrag());

    document.body.appendChild(this.modal);
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.image = new Image();
      this.image.onload = () => {
        // Center image and set initial scale to fill canvas
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = Math.max(
          400 / this.image.width,
          400 / this.image.height
        );
        this.render();
      };
      this.image.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Constrain offset to prevent showing empty space
   */
  constrainOffset() {
    if (!this.image) return;

    const scaledWidth = this.image.width * this.scale;
    const scaledHeight = this.image.height * this.scale;

    // Calculate max offset to keep image covering the canvas
    const maxOffsetX = Math.max(0, (scaledWidth - 400) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - 400) / 2);

    // Constrain offsets
    this.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.offsetX));
    this.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.offsetY));
  }

  render() {
    if (!this.image) return;

    this.ctx.clearRect(0, 0, 400, 400);
    this.ctx.save();

    // Apply transformations
    this.ctx.translate(200 + this.offsetX, 200 + this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    this.ctx.translate(-this.image.width / 2, -this.image.height / 2);

    // Draw image
    this.ctx.drawImage(this.image, 0, 0);
    this.ctx.restore();
  }

  startDrag(e) {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  drag(e) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;

    this.offsetX += dx;
    this.offsetY += dy;

    // Constrain to prevent empty space
    this.constrainOffset();

    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.render();
  }

  endDrag() {
    this.isDragging = false;
  }

  crop() {
    // Final constraint check before cropping
    this.constrainOffset();
    
    // Create final canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 400;
    finalCanvas.height = 400;
    const finalCtx = finalCanvas.getContext('2d');

    // Draw cropped image with same transformations
    finalCtx.save();
    finalCtx.translate(200 + this.offsetX, 200 + this.offsetY);
    finalCtx.scale(this.scale, this.scale);
    finalCtx.translate(-this.image.width / 2, -this.image.height / 2);
    finalCtx.drawImage(this.image, 0, 0);
    finalCtx.restore();

    // Convert to blob (high quality JPEG)
    finalCanvas.toBlob((blob) => {
      if (this.onComplete) {
        this.onComplete(blob);
      }
      this.close();
    }, 'image/jpeg', 0.92);
  }

  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}

// Export globally
window.ImageCropper = ImageCropper;
console.log('✅ Image Cropper initialized');
