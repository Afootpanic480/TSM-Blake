// Session storage for user data that persists during the current session
let currentUserData = {
  uuid: null,
  username: null,
  email: null,
  isLoggedIn: false
};

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
        setTimeout(async () => {
          try {
            console.log('Fetching user email for settings...');
            const userEmails = await fetchUserEmails(username, result.uuid);
            if (userEmails && userEmails.length > 0) {
              currentUserData.email = userEmails[0].email;
              console.log('User email fetched and stored:', currentUserData.email);
              
              // Trigger settings update if settings panel is currently open
              if (document.querySelector('.settings-panel.active#panel-account')) {
                if (typeof updateEmailDisplay === 'function') {
                  updateEmailDisplay(currentUserData.email);
                } else if (window.updateEmailDisplay) {
                  window.updateEmailDisplay(currentUserData.email);
                }
              }
            } else {
              currentUserData.email = null;
              console.log('No email found for user');
            }
          } catch (emailError) {
            console.error('Failed to fetch user email during login:', emailError);
            currentUserData.email = null;
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