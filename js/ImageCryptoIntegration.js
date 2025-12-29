/**
 * INTEGRATION EXAMPLE: ImageCryptoContainer + TSM-Blake System
 * 
 * This file demonstrates how to integrate the Image Crypto Container
 * with the existing TSM-Blake encryption system (MessageService, etc.)
 */

// ============================================================================
// EXAMPLE 1: Add Image Export to MessageService
// ============================================================================

/**
 * Extend MessageService to support image-based message encryption
 */
class MessageServiceImageExtension {
    
    /**
     * Encrypt and send message as image
     */
    static async encryptAndExportAsImage(message, recipientId, password, options = {}) {
        try {
            // Step 1: Create message object (existing TSM-Blake flow)
            const messageObj = {
                id: MessageService.generateMessageId(),
                sender: MessageService.getCurrentUserId(),
                recipient: recipientId,
                content: message,
                timestamp: Date.now(),
                type: 'image_encrypted'
            };

            // Step 2: Encrypt with Image Crypto Container
            const container = await ImageCryptoContainer.encryptToImage(
                JSON.stringify(messageObj),
                password,
                {
                    width: options.width || 512,
                    height: options.height || 512
                }
            );

            // Step 3: Store or transmit
            const imageBlob = container.blob;
            const imageURL = container.dataURL;

            // Option A: Upload to storage
            if (options.uploadToStorage) {
                const uploadURL = await this._uploadImageToStorage(imageBlob, messageObj.id);
                messageObj.imageURL = uploadURL;
            }

            // Option B: Download locally
            if (options.download) {
                this._downloadImage(imageBlob, `message_${messageObj.id}.png`);
            }

            // Option C: Store in message history
            if (options.storeLocally) {
                MessageHistory.addMessage({
                    ...messageObj,
                    imageData: imageURL,
                    encrypted: true
                });
            }

            return {
                success: true,
                messageId: messageObj.id,
                imageData: imageURL,
                imageBlob: imageBlob
            };

        } catch (error) {
            console.error('Image encryption failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Decrypt message from image
     */
    static async decryptImageMessage(imageSource, password) {
        try {
            // Step 1: Extract and decrypt from image
            const result = await ImageCryptoContainer.decryptFromImage(
                imageSource,
                password
            );

            if (!result.success) {
                return { success: false, error: result.error };
            }

            // Step 2: Parse message object
            const messageObj = JSON.parse(result.plaintext);

            // Step 3: Validate message structure
            if (!messageObj.id || !messageObj.sender || !messageObj.content) {
                return { success: false, error: 'Invalid message structure' };
            }

            // Step 4: Store in history (optional)
            MessageHistory.addMessage({
                ...messageObj,
                decrypted: true,
                decryptedAt: Date.now()
            });

            return {
                success: true,
                message: messageObj
            };

        } catch (error) {
            console.error('Image decryption failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Helper methods
    static async _uploadImageToStorage(blob, messageId) {
        // Implement your storage upload logic
        // Example: Firebase Storage, AWS S3, etc.
        const formData = new FormData();
        formData.append('file', blob, `${messageId}.png`);
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        return data.url;
    }

    static _downloadImage(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }
}


// ============================================================================
// EXAMPLE 2: UI Integration with Existing HTML
// ============================================================================

/**
 * Add image encryption buttons to existing message UI
 */
function integrateImageCryptoUI() {
    
    // Add export button to message interface
    const exportButton = document.createElement('button');
    exportButton.textContent = '🖼️ Export as Image';
    exportButton.className = 'btn-secondary';
    exportButton.onclick = handleImageExport;
    
    // Add to existing button group
    const buttonGroup = document.querySelector('.message-actions');
    if (buttonGroup) {
        buttonGroup.appendChild(exportButton);
    }

    // Add import button
    const importButton = document.createElement('button');
    importButton.textContent = '📥 Import Image';
    importButton.className = 'btn-secondary';
    importButton.onclick = handleImageImport;
    
    if (buttonGroup) {
        buttonGroup.appendChild(importButton);
    }
}

async function handleImageExport() {
    const message = document.getElementById('messageInput').value;
    const recipient = document.getElementById('recipientSelect').value;
    const password = prompt('Enter password for image encryption:');

    if (!message || !password) {
        alert('Please enter a message and password');
        return;
    }

    // Show loading
    showLoadingSpinner();

    try {
        const result = await MessageServiceImageExtension.encryptAndExportAsImage(
            message,
            recipient,
            password,
            {
                width: 512,
                height: 512,
                download: true,
                storeLocally: true
            }
        );

        if (result.success) {
            showNotification('✅ Message encrypted and exported as image', 'success');
            
            // Optional: Display preview
            displayImagePreview(result.imageData);
        } else {
            showNotification('❌ Export failed: ' + result.error, 'error');
        }

    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

async function handleImageImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/webp';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const password = prompt('Enter password to decrypt image:');
        if (!password) return;

        showLoadingSpinner();

        try {
            const result = await MessageServiceImageExtension.decryptImageMessage(
                file,
                password
            );

            if (result.success) {
                showNotification('✅ Message decrypted successfully', 'success');
                
                // Display decrypted message
                displayDecryptedMessage(result.message);
            } else {
                showNotification('❌ Decryption failed: ' + result.error, 'error');
            }

        } catch (error) {
            showNotification('❌ Error: ' + error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    };

    input.click();
}


// ============================================================================
// EXAMPLE 3: Settings Panel Integration
// ============================================================================

/**
 * Add image crypto settings to existing Settings module
 */
function addImageCryptoSettings() {
    const settingsHTML = `
        <div class="settings-section" id="imageCryptoSettings">
            <h3>🖼️ Image Encryption Settings</h3>
            
            <div class="setting-item">
                <label for="defaultImageWidth">Default Image Width:</label>
                <select id="defaultImageWidth">
                    <option value="256">256px (Small)</option>
                    <option value="512" selected>512px (Standard)</option>
                    <option value="1024">1024px (Large)</option>
                    <option value="2048">2048px (Maximum)</option>
                </select>
            </div>
            
            <div class="setting-item">
                <label for="autoDownloadImages">Auto-download exported images:</label>
                <input type="checkbox" id="autoDownloadImages" checked>
            </div>
            
            <div class="setting-item">
                <label for="showImagePreview">Show image preview after encryption:</label>
                <input type="checkbox" id="showImagePreview" checked>
            </div>
            
            <div class="setting-item">
                <label for="storeImagesLocally">Store encrypted images in history:</label>
                <input type="checkbox" id="storeImagesLocally">
                <small>Warning: Increases storage usage</small>
            </div>
            
            <div class="setting-item">
                <button onclick="testImageCryptoSystem()">🧪 Test Image Crypto System</button>
            </div>
        </div>
    `;

    // Add to existing settings container
    const settingsContainer = document.querySelector('#settingsContainer');
    if (settingsContainer) {
        settingsContainer.insertAdjacentHTML('beforeend', settingsHTML);
    }
}

function getImageCryptoSettings() {
    return {
        width: parseInt(document.getElementById('defaultImageWidth')?.value || 512),
        autoDownload: document.getElementById('autoDownloadImages')?.checked ?? true,
        showPreview: document.getElementById('showImagePreview')?.checked ?? true,
        storeLocally: document.getElementById('storeImagesLocally')?.checked ?? false
    };
}

async function testImageCryptoSystem() {
    const testMessage = "Test message: " + Date.now();
    const testPassword = "test123";
    
    showNotification('Running image crypto test...', 'info');

    try {
        // Encrypt
        const container = await ImageCryptoContainer.encryptToImage(
            testMessage,
            testPassword,
            { width: 256, height: 256 }
        );

        // Decrypt
        const result = await ImageCryptoContainer.decryptFromImage(
            container.canvas,
            testPassword
        );

        if (result.success && result.plaintext === testMessage) {
            showNotification('✅ Image crypto system test PASSED', 'success');
        } else {
            showNotification('❌ Image crypto system test FAILED', 'error');
        }

    } catch (error) {
        showNotification('❌ Test error: ' + error.message, 'error');
    }
}


// ============================================================================
// EXAMPLE 4: Batch Processing
// ============================================================================

/**
 * Encrypt multiple messages at once
 */
class BatchImageProcessor {
    
    static async encryptMultipleMessages(messages, password, options = {}) {
        const results = [];
        const batchId = Date.now();
        
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            
            try {
                const container = await ImageCryptoContainer.encryptToImage(
                    message.content,
                    password,
                    options
                );

                // Save with sequential naming
                const filename = `batch_${batchId}_${i + 1}.png`;
                this._downloadImage(container.blob, filename);

                results.push({
                    index: i,
                    success: true,
                    filename: filename
                });

                // Progress callback
                if (options.onProgress) {
                    options.onProgress(i + 1, messages.length);
                }

            } catch (error) {
                results.push({
                    index: i,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    static async decryptMultipleImages(files, password, options = {}) {
        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                const result = await ImageCryptoContainer.decryptFromImage(
                    file,
                    password
                );

                results.push({
                    filename: file.name,
                    success: result.success,
                    message: result.plaintext,
                    error: result.error
                });

                if (options.onProgress) {
                    options.onProgress(i + 1, files.length);
                }

            } catch (error) {
                results.push({
                    filename: file.name,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    static _downloadImage(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }
}


// ============================================================================
// EXAMPLE 5: Drag-and-Drop Integration
// ============================================================================

function setupDragAndDropDecryption() {
    const dropZone = document.getElementById('messageArea');
    
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(f => f.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showNotification('No image files dropped', 'warning');
            return;
        }

        const password = prompt('Enter password to decrypt image(s):');
        if (!password) return;

        if (imageFiles.length === 1) {
            // Single file
            const result = await MessageServiceImageExtension.decryptImageMessage(
                imageFiles[0],
                password
            );

            if (result.success) {
                displayDecryptedMessage(result.message);
                showNotification('✅ Message decrypted', 'success');
            } else {
                showNotification('❌ Decryption failed', 'error');
            }

        } else {
            // Multiple files
            const results = await BatchImageProcessor.decryptMultipleImages(
                imageFiles,
                password,
                {
                    onProgress: (current, total) => {
                        showNotification(`Decrypting ${current}/${total}...`, 'info');
                    }
                }
            );

            const successCount = results.filter(r => r.success).length;
            showNotification(`✅ Decrypted ${successCount}/${imageFiles.length} images`, 'success');

            // Display all decrypted messages
            results.forEach(result => {
                if (result.success) {
                    displayDecryptedMessage(JSON.parse(result.message));
                }
            });
        }
    });
}


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showLoadingSpinner() {
    document.getElementById('loadingSpinner')?.classList.add('active');
}

function hideLoadingSpinner() {
    document.getElementById('loadingSpinner')?.classList.remove('active');
}

function showNotification(message, type = 'info') {
    // Use existing notification system or create new
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Example: Use TSM-Blake's existing notification
    if (typeof Console !== 'undefined' && Console.log) {
        Console.log(message, type);
    }
}

function displayImagePreview(imageDataURL) {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;

    previewContainer.innerHTML = `
        <img src="${imageDataURL}" alt="Encrypted image" style="max-width: 100%; border: 2px solid #00ff41;">
        <p>Image generated successfully. Right-click to save.</p>
    `;
}

function displayDecryptedMessage(messageObj) {
    const messageContainer = document.getElementById('decryptedMessages');
    if (!messageContainer) return;

    const messageHTML = `
        <div class="message-item decrypted" data-id="${messageObj.id}">
            <div class="message-header">
                <span class="sender">${messageObj.sender}</span>
                <span class="timestamp">${new Date(messageObj.timestamp).toLocaleString()}</span>
            </div>
            <div class="message-content">${messageObj.content}</div>
        </div>
    `;

    messageContainer.insertAdjacentHTML('afterbegin', messageHTML);
}


// ============================================================================
// INITIALIZATION
// ============================================================================

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if ImageCryptoContainer is loaded
    if (typeof ImageCryptoContainer === 'undefined') {
        console.error('ImageCryptoContainer not loaded!');
        return;
    }

    // Integrate UI elements
    integrateImageCryptoUI();
    addImageCryptoSettings();
    setupDragAndDropDecryption();

    console.log('✅ Image Crypto Container integration complete');
});


// ============================================================================
// EXPORT FOR MODULE SYSTEMS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MessageServiceImageExtension,
        BatchImageProcessor,
        getImageCryptoSettings
    };
}
