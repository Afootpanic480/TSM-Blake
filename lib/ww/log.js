// Session storage for user data that persists during the current session
let currentUserData = {
  uuid: null,
  username: null,
  email: null,
  isLoggedIn: false
};

const EMAIL_PLACEHOLDER_VALUES = new Set(['', 'no email set', 'n/a', 'na', 'undefined', 'null']);
const EMAIL_ERROR_PATTERNS = ['#ERROR', '#REF'];

function logEmailIsValid(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeEmail(rawEmail) {
  if (!rawEmail && rawEmail !== 0) return null;
  const normalized = String(rawEmail).trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (EMAIL_PLACEHOLDER_VALUES.has(lower)) return null;
  if (EMAIL_ERROR_PATTERNS.some(pattern => normalized.toUpperCase().includes(pattern))) return null;
  if (!logEmailIsValid(normalized)) return null;
  return normalized;
}

async function waitForFirebaseContext(timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const firebaseUid = window.currentUserData?.firebaseUid;
    const authService = window.firebaseServices?.auth;
    if (firebaseUid && authService) {
      return { firebaseUid, authService };
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return { firebaseUid: null, authService: null };
}

async function getFirebaseStoredEmail() {
  const { firebaseUid, authService } = await waitForFirebaseContext();
  if (!firebaseUid || !authService || typeof authService.getUserData !== 'function') {
    return null;
  }
  try {
    const data = await authService.getUserData(firebaseUid);
    let fromFirebase = sanitizeEmail(data?.regemail);
    if (!fromFirebase) {
      fromFirebase = sanitizeEmail(data?.email);
    }
    return fromFirebase;
  } catch (error) {
    console.warn('Failed to get email from Firebase profile:', error);
    return null;
  }
}

async function storeEmailInFirebase(email) {
  const sanitized = sanitizeEmail(email);
  if (!sanitized) return;

  const { firebaseUid, authService } = await waitForFirebaseContext(8000);
  if (!firebaseUid || !authService || typeof authService.updateUserProfile !== 'function') {
    return;
  }

  try {
    await authService.updateUserProfile(firebaseUid, {
      regemail: sanitized,
      lastEmailSync: Date.now()
    });
    console.log('✅ Email synced to Firebase profile');
    window.currentUserData = window.currentUserData || {};
    window.currentUserData.firebaseEmail = sanitized;
  } catch (error) {
    console.warn('⚠️ Failed to sync email to Firebase profile:', error);
  }
}

function notifyInvalidEmail() {
  const message = 'We could not verify your email address. Please enter a valid email to continue.';
  if (typeof showAlert === 'function') {
    showAlert(message, 'warning');
  } else {
    alert(message);
  }
}

async function promptForEmailInput() {
  let attempts = 0;
  while (attempts < 3) {
    const input = window.prompt('Enter your email address:', '');
    if (input === null) {
      return null;
    }
    const sanitized = sanitizeEmail(input);
    if (sanitized) {
      return sanitized;
    }
    attempts += 1;
    if (typeof showAlert === 'function') {
      showAlert('Please enter a valid email address.', 'error');
    } else {
      alert('Please enter a valid email address.');
    }
  }
  return null;
}

async function waitForGlobalFunction(functionName, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (typeof window[functionName] === 'function') {
      return window[functionName];
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}

async function resolveAndSyncUserEmail(username, userUUID) {
  try {
    let resolvedEmail = null;

    try {
      const fetchEmailsFn = typeof fetchUserEmails === 'function'
        ? fetchUserEmails
        : await waitForGlobalFunction('fetchUserEmails');

      if (typeof fetchEmailsFn === 'function') {
        const userEmails = await fetchEmailsFn(username, userUUID);
        if (Array.isArray(userEmails)) {
          for (const entry of userEmails) {
            resolvedEmail = sanitizeEmail(entry?.email);
            if (resolvedEmail) break;
          }
        } else {
          resolvedEmail = sanitizeEmail(userEmails?.email);
        }
      }
    } catch (sheetError) {
      console.warn('Failed to fetch email from Sheets:', sheetError);
    }

    if (!resolvedEmail) {
      resolvedEmail = await getFirebaseStoredEmail();
    }

    if (!resolvedEmail) {
      notifyInvalidEmail();
      resolvedEmail = await promptForEmailInput();
    }

    if (resolvedEmail) {
      currentUserData.email = resolvedEmail;
      currentUserData.firebaseEmail = resolvedEmail;
      console.log('Using email:', resolvedEmail);
      if (typeof updateEmailDisplay === 'function') {
        updateEmailDisplay(resolvedEmail);
      } else if (window.updateEmailDisplay) {
        window.updateEmailDisplay(resolvedEmail);
      }
      storeEmailInFirebase(resolvedEmail);
    } else {
      currentUserData.email = null;
      currentUserData.firebaseEmail = null;
      if (typeof updateEmailDisplay === 'function') {
        updateEmailDisplay('No email set');
      } else if (window.updateEmailDisplay) {
        window.updateEmailDisplay('No email set');
      }
    }
  } catch (error) {
    console.error('Failed to resolve user email:', error);
  }
}

window.resolveAndSyncUserEmail = resolveAndSyncUserEmail;

// Fetch and update pending friend requests count
function fetchAndUpdatePendingCount(username) {
  console.log('[fetchAndUpdatePendingCount] called with username:', username);
  let badge = document.getElementById('pendingCount');
  if (!badge) {
    const friendsBtn = document.getElementById('homeAddFriendBtn');
    if (friendsBtn) {
      badge = document.createElement('span');
      badge.id = 'pendingCount';
      badge.className = 'badge';
      badge.style.display = 'none';
      friendsBtn.appendChild(badge);
    }
  }
  if (!badge) {
    console.warn('[fetchAndUpdatePendingCount] No badge element found');
    return;
  }
  // Use uuid if argument is a likely UUID (all digits, length >= 8), otherwise username
  let param, value;
  if (/^\d{8,}$/.test(username)) {
    param = 'uuid';
    value = username;
  } else {
    param = 'username';
    value = username;
  }
  fetch(`${pendingFR}?${param}=${encodeURIComponent(value)}`)
    .then(res => res.json())
    .then(data => {
      let count;
      if (Array.isArray(data.pendingRequests)) {
        count = data.pendingRequests.length;
      } else {
        count = Number(data.count || data.pending || 0);
      }
      console.log('[fetchAndUpdatePendingCount] Pending count received:', count);
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = '';
      } else {
        badge.textContent = '';
        badge.style.display = 'none';
      }
    })
    .catch((err) => {
      console.error('[fetchAndUpdatePendingCount] Error fetching pending count:', err);
      badge.textContent = '';
      badge.style.display = 'none';
    });
}
window.fetchAndUpdatePendingCount = fetchAndUpdatePendingCount;

// Function to get the current user's UUID
function getCurrentUserUUID() {
  return currentUserData.uuid;
}

// Function to get the current user's username
function getCurrentUsername() {
  return currentUserData.username;
}

// Function to check if user is logged in
function isUserLoggedIn() {
  return currentUserData.isLoggedIn;
}

async function handleLogin() {
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const messageDiv = document.getElementById('message');

      // Validate inputs
      if (!username || !password) {
        messageDiv.style.color = 'red';
        messageDiv.textContent = 'Please enter both username and password.';
        return;
      }

      // Show verifying screen - safely handle missing elements
      const passwordContainer = document.getElementById('passwordContainer');
      const verifyContainer = document.getElementById('verifyContainer');
      
      if (passwordContainer) passwordContainer.style.display = 'none';
      if (verifyContainer) verifyContainer.style.display = 'flex';

      try {
        // Skip prohibited check if not configured
        if (typeof prohibitedCheck !== 'undefined' && prohibitedCheck) {
          // Check if the user is prohibited
          const prohibitedCheckUrl = new URL(prohibitedCheck);
          prohibitedCheckUrl.searchParams.append('username', username);
          
          const prohibitedResponse = await fetch(prohibitedCheckUrl);
          if (!prohibitedResponse.ok) {
            throw new Error(`HTTP error: ${prohibitedResponse.status}`);
          }
          
          const prohibitedResult = await prohibitedResponse.json();
          if (prohibitedResult.status === 'prohibited') {
            // User is prohibited/banned
            if (verifyContainer) verifyContainer.style.display = 'none';
            if (passwordContainer) passwordContainer.style.display = 'flex';
            messageDiv.style.color = 'red';
            messageDiv.textContent = `Account prohibited: ${prohibitedResult.reason || 'No reason provided'}. Ban length: ${prohibitedResult.banLength || 'indefinite'}`;
            return;
          }
        } else {
          console.log('Skipping prohibited check - not configured');
        }

        // If we get here, user is not prohibited or check was skipped
        const url = new URL(signinGasUrl);
        url.searchParams.append('username', username);
        url.searchParams.append('password', password);

        const response = await fetch(url);
        if (!response.ok) {
        }

        const result = await response.json();

        if (result.status === 'success') {
        // Store the username
        currentUserData.username = username;
        currentUserData.uuid = result.uuid || null;
        console.log('User UUID stored for session:', currentUserData.uuid);
        
        // Fetch and store user email asynchronously (don't block login)
        setTimeout(() => {
          if (typeof resolveAndSyncUserEmail === 'function') {
            resolveAndSyncUserEmail(username, result.uuid);
          }
        }, 100); // Small delay to let login complete first
        
        // Fetch user permission using the same method as whitelist check
        try {
          const permissionUrl = new URL(permissionCheck);
          permissionUrl.searchParams.append('username', username);
          const permissionResponse = await fetch(permissionUrl);
          
          if (!permissionResponse.ok) {
            throw new Error('Failed to fetch permission');
          }
          
          const permissionResult = await permissionResponse.json();
          currentUserData.permission = permissionResult.permission || 'USER';
          console.log('User permission set:', currentUserData.permission);
        } catch (permError) {
          console.error('Permission check error:', permError);
          currentUserData.permission = 'USER'; // Default to USER if permission check fails
        }

        // Successful login
        currentUserData.isLoggedIn = true;
        if (verifyContainer) verifyContainer.style.display = 'none';
        const messagingContainer = document.getElementById('messagingContainer');
        if (messagingContainer) messagingContainer.style.display = 'flex';
        
        // Fetch pending friend requests in background
        console.log('[handleLogin] Calling fetchAndUpdatePendingCount after login');
        fetchAndUpdatePendingCount(username);
      } else {
          // Handle authentication failure
          currentUserData.uuid = null;
          currentUserData.username = null;
          currentUserData.email = null;
          currentUserData.isLoggedIn = false;
          if (verifyContainer) verifyContainer.style.display = 'none';
          if (passwordContainer) passwordContainer.style.display = 'flex';
          messageDiv.style.color = 'red';
          messageDiv.textContent = result.status === 'incorrect' ? 'Incorrect password.' : 'Username not found.';
          focusUsernameIfNoInputActive();
        }
      } catch (error) {
        console.error('Sign-in error:', error);
        document.getElementById('verifyContainer').style.display = 'none';
        document.getElementById('passwordContainer').style.display = 'flex';
        messageDiv.style.color = 'red';
        messageDiv.textContent = `Error: ${error.message}. Please try again.`;
        focusUsernameIfNoInputActive();
      }
    }