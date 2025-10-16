// Debounce function to delay Gmail check
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Define the gmailCheck URL if not already defined
const gmailCheck = window.gmailCheck || 'https://script.google.com/macros/s/AKfycbyya5t9Lsm3Bc3utmhSzEoX9awTNiiLc6EpZ8TIe6eN4x3jaX196Fx34ZFOE0tMslt96A/exec';

// Simple email validation - only checks for @ and specific domains
const isValidEmail = (email) => {
  if (!email) return false;
  email = email.trim();
  return email.includes('@') && 
         (email.endsWith('@gmail.com') || email.endsWith('@students.hcboe.net'));
};

// Real-time Gmail check logic (separated for reusability)
function setupGmailCheck() {
  const gmailInput = document.getElementById('registerGmail');
  const errorElement = document.getElementById('emailError');
  const inputGroup = gmailInput ? gmailInput.closest('.input-group') : null;
  const gmailIcon = inputGroup ? inputGroup.querySelector('.gmail-icon') : null;
  
  let checkInProgress = false;
  let lastCheckedEmail = ''; // Cache to prevent duplicate checks
  let lastCheckResult = null; // Cache the result

  const checkGmail = async function() {
    if (!gmailInput || !errorElement) return false;
    
    const email = gmailInput.value.trim();
    
    // Reset validation state
    if (inputGroup) {
      inputGroup.classList.remove('valid', 'invalid');
    }

    if (!email) {
      errorElement.textContent = '';
      return false;
    }

    // Validate format first
    if (!isValidEmail(email)) {
      inputGroup?.classList.add('invalid');
      if (gmailInput) gmailInput.classList.add('gmail-invalid');
      if (gmailIcon) gmailIcon.className = 'gmail-icon gmail-invalid-icon';
      errorElement.textContent = 'Please enter a valid @gmail.com or @students.hcboe.net email address';
      return false;
    }

    // Check if email is available using the server
    if (checkInProgress) return false;
    checkInProgress = true;

    try {
      // Check if we already checked this email
      if (lastCheckedEmail === email && lastCheckResult !== null) {
        if (lastCheckResult.available) {
          inputGroup?.classList.add('valid');
          if (gmailInput) gmailInput.classList.add('gmail-available');
          if (gmailIcon) gmailIcon.className = 'gmail-icon gmail-available-icon';
          errorElement.textContent = '';
        } else {
          inputGroup?.classList.add('invalid');
          if (gmailInput) gmailInput.classList.add('gmail-taken');
          if (gmailIcon) gmailIcon.className = 'gmail-icon gmail-taken-icon';
          errorElement.textContent = 'Email already registered. Choose another.';
        }
        return lastCheckResult.available;
      }
      
      // Show checking status
      errorElement.textContent = 'Checking availability...';
      inputGroup?.classList.remove('valid', 'invalid');
      
      // Check email availability with server
      fetch(gmailCheck + '?email=' + encodeURIComponent(email), {
        method: 'GET'
      })
        .then(response => response.json())
        .then(result => {
          // Cache the result
          lastCheckedEmail = email;
          lastCheckResult = result;
          
          if (result.error) {
            inputGroup?.classList.add('invalid');
            if (gmailInput) gmailInput.classList.add('gmail-taken');
            if (gmailIcon) gmailIcon.className = 'gmail-icon gmail-taken-icon';
            errorElement.textContent = 'Error checking email availability';
            lastCheckResult = null; // Don't cache errors
          } else if (result.available) {
            inputGroup?.classList.add('valid');
            if (gmailInput) gmailInput.classList.add('gmail-available');
            if (gmailIcon) gmailIcon.className = 'gmail-icon gmail-available-icon';
            errorElement.textContent = '';
          } else {
            inputGroup?.classList.add('invalid');
            if (gmailInput) gmailInput.classList.add('gmail-taken');
            if (gmailIcon) gmailIcon.className = 'gmail-icon gmail-taken-icon';
            errorElement.textContent = 'Email already registered. Choose another.';
          }
        })
        .catch(error => {
          console.error('Error checking email availability:', error);
          inputGroup?.classList.add('invalid');
          errorElement.textContent = 'Error checking email availability';
        });
      
      // Return true for now since this is async
      return true;
    } catch (error) {
      console.error('Error checking email availability:', error);
      inputGroup?.classList.add('invalid');
      errorElement.textContent = 'Error checking email availability';
      return false;
    } finally {
      checkInProgress = false;
    }
  };

  // Set up event listeners
  if (gmailInput) {
    // Debounced check for real-time validation - wait 2.5 seconds after user stops typing
    const debouncedCheck = debounce(() => {
      checkGmail();
    }, 2500);
    
    // Set up the debounced input listener
    gmailInput.addEventListener('input', (e) => {
      // Clear cache when email changes
      const currentEmail = gmailInput.value.trim();
      if (currentEmail !== lastCheckedEmail) {
        lastCheckedEmail = '';
        lastCheckResult = null;
      }
      
      // Clear any existing validation state while user is typing
      const inputGroup = gmailInput.closest('.input-group');
      if (inputGroup) {
        inputGroup.classList.remove('valid', 'invalid');
      }
      // Clear Gmail-specific classes
      if (gmailInput) {
        gmailInput.classList.remove('gmail-available', 'gmail-taken', 'gmail-invalid');
      }
      // Clear icon classes
      if (gmailIcon) {
        gmailIcon.className = 'gmail-icon';
      }
      // Clear error message while typing
      if (errorElement) {
        errorElement.textContent = '';
      }
      // Call debounced check
      debouncedCheck();
    });
    
    // Initial check if there's already a value (e.g., page refresh)
    if (gmailInput.value.trim()) {
      checkGmail();
    }
  }

  return checkGmail;
}

function showGmailCheck() {
  // No need to fetch all emails anymore - we check individually
  return setupGmailCheck();
}

// Gmail checking is now initialized directly in showRegister() function

function handleGmailCheck() {
  const gmailInput = document.getElementById('registerGmail');
  const messageDiv = document.getElementById('message');
  
  if (!gmailInput || !messageDiv) {
    return false;
  }
  
  const gmail = gmailInput.value.trim();

  if (!gmail) {
    messageDiv.textContent = 'Please fill in all fields.';
    return false;
  }

  // Check email format
  if (!isValidEmail(gmail)) {
    if (messageDiv) {
      messageDiv.textContent = 'Please use a valid @gmail.com or @students.hcboe.net email';
      messageDiv.style.display = 'block';
    }
    // Update visual state
    if (window.checkGmail) {
      window.checkGmail();
    }
    return false;
  }
  
  // Clear any error messages if format validation passes
  if (messageDiv) {
    messageDiv.textContent = '';
    messageDiv.style.display = 'none';
  }
  
  // Use the secure checkGmail function for availability check
  if (typeof window.checkGmail === 'function') {
    try {
      window.checkGmail();
    } catch (e) {
      messageDiv.textContent = 'Error checking email availability';
      return false;
    }
  }
  
  return true; // Format validation passed, availability check is now async
}

// Function to fetch user emails from GAS
async function fetchUserEmails(username, userUUID = '') {
  try {
    if (!userEmails || userEmails.includes('REPLACE_WITH_DEPLOYED_USER_EMAILS_URL')) {
      throw new Error('User emails endpoint URL is not configured');
    }
    const url = new URL(userEmails);
    url.searchParams.append('action', 'getUserEmails');
    url.searchParams.append('username', username);
    if (userUUID) {
      url.searchParams.append('uuid', userUUID);
    }

    console.log('Fetching user emails from:', url.toString());

    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('User emails response:', data);

    if (data.status === 'success') {
      return data.emails || [];
    } else {
      throw new Error(data.message || 'Failed to fetch user emails');
    }
  } catch (error) {
    console.error('Error fetching user emails:', error);
    throw error;
  }
}

// Function to display user emails in a modal or list
function displayUserEmails(emails, username) {
  // Create or update a modal to show the emails
  let emailModal = document.getElementById('userEmailsModal');

  if (!emailModal) {
    emailModal = document.createElement('div');
    emailModal.id = 'userEmailsModal';
    emailModal.className = 'user-emails-modal';
    emailModal.innerHTML = `
      <div class="user-emails-content">
        <div class="user-emails-header">
          <h3>Registered Emails for ${username}</h3>
          <button class="close-emails-modal" onclick="this.closest('#userEmailsModal').style.display='none'">×</button>
        </div>
        <div class="user-emails-list" id="userEmailsList">
          <!-- Email list will be populated here -->
        </div>
      </div>
    `;
    document.body.appendChild(emailModal);

    // Add modal styles
    if (!document.getElementById('user-emails-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'user-emails-modal-styles';
      style.textContent = `
        .user-emails-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        .user-emails-content {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .user-emails-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }

        .user-emails-header h3 {
          margin: 0;
          color: #f1f5f9;
          font-size: 1.2em;
          font-weight: 600;
        }

        .close-emails-modal {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-emails-modal:hover {
          background: rgba(148, 163, 184, 0.1);
          color: #f1f5f9;
        }

        .user-emails-list {
          padding: 20px;
        }

        .user-email-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          margin-bottom: 8px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px;
          color: #e2e8f0;
          font-family: 'Fira Code', monospace;
          font-size: 0.9em;
        }

        .user-email-item:last-child {
          margin-bottom: 0;
        }

        .user-email-item.primary {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.1);
        }

        .email-badge {
          font-size: 0.8em;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .no-emails {
          text-align: center;
          color: #94a3b8;
          padding: 40px 20px;
          font-style: italic;
        }
      `;
      document.head.appendChild(style);
    }
  }

  const emailList = emailModal.querySelector('#userEmailsList');
  emailList.innerHTML = '';

  if (emails && emails.length > 0) {
    emails.forEach((emailData, index) => {
      const emailItem = document.createElement('div');
      emailItem.className = `user-email-item ${index === 0 ? 'primary' : ''}`;

      emailItem.innerHTML = `
        <span>${emailData.email}</span>
        ${index === 0 ? '<span class="email-badge">Primary</span>' : '<span class="email-badge">Secondary</span>'}
      `;

      emailList.appendChild(emailItem);
    });
  } else {
    emailList.innerHTML = '<div class="no-emails">No emails found for this account</div>';
  }

  // Show the modal
  emailModal.style.display = 'flex';
}

// Function to show user emails (public API)
window.showUserEmails = async function(username) {
  try {
    if (!username) {
      if (window.currentUserData && window.currentUserData.username) {
        username = window.currentUserData.username;
      } else {
        throw new Error('No username provided and user not logged in');
      }
    }

    const emails = await fetchUserEmails(username);
    displayUserEmails(emails, username);
  } catch (error) {
    console.error('Error showing user emails:', error);
    showAlert('Error loading user emails: ' + error.message, 'error');
  }
};