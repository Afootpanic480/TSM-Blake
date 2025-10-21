// Firebase Bridge - Connects existing login system with Firebase
// This automatically syncs your current authentication with Firebase

(function() {
  'use strict';

  // Firebase Bridge Configuration
  const FIREBASE_AUTO_SYNC = true; // Set to false to disable automatic syncing
  
  // Initialize Firebase services
  let authService;
  let messageService;
  let userService;
  let presenceService;
  let isFirebaseReady = false;

  // Wait for Firebase to be ready
  function initializeFirebaseServices() {
    if (window.firebaseAuth && window.firebaseDatabase) {
      authService = new FirebaseAuthService();
      messageService = new FirebaseMessageService();
      userService = new FirebaseUserService();
      presenceService = new PresenceService(window.firebaseDatabase, window.firebaseAuth);
      isFirebaseReady = true;
      
      console.log('✅ Firebase Bridge: Services initialized');
      
      // Set up authentication sync
      setupAuthenticationSync();
      
      // Make services globally available
      window.firebaseServices = {
        auth: authService,
        messages: messageService,
        user: userService,
        presence: presenceService
      };
      
      return true;
    }
    return false;
  }

  // Try to initialize immediately
  if (!initializeFirebaseServices()) {
    // If not ready, wait and try again
    setTimeout(() => {
      if (!initializeFirebaseServices()) {
        console.log('⏳ Firebase Bridge: Waiting for Firebase to initialize...');
      }
    }, 1000);
  }

  // ============================================
  // AUTHENTICATION SYNC
  // ============================================

  function setupAuthenticationSync() {
    console.log('🔄 Firebase Bridge: Authentication sync ready (waiting for login)');

    // Listen for Firebase auth state changes
    authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ Firebase Bridge: User authenticated in Firebase', firebaseUser.uid);
        
        // DON'T overwrite window.currentUserData - it's managed by your existing system
        // Just store the Firebase UID for message routing
        if (window.currentUserData && !window.currentUserData.firebaseUid) {
          window.currentUserData.firebaseUid = firebaseUser.uid;
          console.log('✅ Firebase Bridge: Stored Firebase UID in currentUserData');
        }

        // Initialize presence service
        presenceService.initialize();
        console.log('✅ Firebase Bridge: Presence service initialized');

        // DON'T sync DMs here - let the login flow handle it
        // This auth state listener fires on page load before Google Sheets DMs are loaded
        
        // Listen for friend requests (only if auto-sync enabled)
        if (FIREBASE_AUTO_SYNC) {
          setupFriendRequestListener(firebaseUser.uid);
        }

      }
      // Don't log anything if user is not authenticated - this is normal on page load
    });
  }

  // ============================================
  // INTERCEPT EXISTING LOGIN
  // ============================================

  // Wait for login function to be available and then intercept it
  function interceptLogin() {
    if (typeof window.handleLoginWithLogin === 'function') {
      const originalHandleLogin = window.handleLoginWithLogin;

      // Override login function to sync with Firebase
      window.handleLoginWithLogin = async function(username, password) {
        // If username/password not provided, get them from the input fields
        if (!username || !password) {
          const usernameInput = document.getElementById('username');
          const passwordInput = document.getElementById('password');
          
          username = usernameInput ? usernameInput.value : '';
          password = passwordInput ? passwordInput.value : '';
        }

        console.log('🔐 Firebase Bridge: Intercepting login for', username);

        // Call original login first (it also reads from inputs if params not provided)
        await originalHandleLogin.call(this, username, password);

        // Only sync if auto-sync is enabled
        if (!FIREBASE_AUTO_SYNC) {
          console.log('📊 Firebase Bridge: Auto-sync disabled, skipping Firebase authentication');
          return;
        }

        // The original login doesn't return a value, so we need to wait and check if login succeeded
        // by monitoring window.currentUserData
        setTimeout(async () => {
          if (window.currentUserData && window.currentUserData.uuid && window.currentUserData.uuid !== null) {
            console.log('✅ Firebase Bridge: Login successful, syncing to Firebase...');
            console.log('🔍 Firebase Bridge: User data:', window.currentUserData);

            // Now sync with Firebase
            if (isFirebaseReady) {
              console.log('🔄 Firebase Bridge: Starting Firebase sync...');
              await syncLoginWithFirebase(username, password, { 
                success: true, 
                user: window.currentUserData 
              });
            } else {
              console.warn('⚠️ Firebase Bridge: Not ready, waiting...');
            }
          } else {
            console.log('⚠️ Firebase Bridge: Login may have failed or user data not set');
          }
        }, 1500); // Wait for login animation and data to be set
      };

      console.log('✅ Firebase Bridge: Login interception set up');
    } else {
      // If login function doesn't exist yet, try again
      setTimeout(interceptLogin, 500);
    }
  }

  // Start trying to intercept login
  interceptLogin();

  async function syncLoginWithFirebase(username, password, loginResult) {
    try {
      // First, sign out any existing Firebase user
      const currentFirebaseUser = authService.getCurrentUser();
      if (currentFirebaseUser) {
        console.log('🔄 Firebase Bridge: Signing out previous Firebase user');
        await authService.signOut();
      }
      
      // Convert username to email format for Firebase
      const email = username.includes('@') ? username : `${username}@schoolmessenger.app`;

      console.log('🔄 Firebase Bridge: Syncing with Firebase auth for', email);

      // Try to sign in to Firebase
      let firebaseResult = await authService.signIn(email, password);

      console.log('🔍 Firebase Bridge: Sign in result:', firebaseResult);

      // If user doesn't exist in Firebase, create account
      if (!firebaseResult.success) {
        console.log('📝 Firebase Bridge: User not found, creating Firebase account...');
        
        // Get DM usernames from current user data
        const dmUsernames = window.currentUserData?.dmUsernames || [];
        
        console.log('📝 Firebase Bridge: User data:', {
          username: username,
          displayName: loginResult.user?.displayName || username,
          email: email,
          dmCount: dmUsernames.length
        });
        
        firebaseResult = await authService.signUp(email, password, {
          username: username,
          displayName: loginResult.user?.displayName || username,
          bio: loginResult.user?.bio || '',
          profilePicture: loginResult.user?.profilePicture || '',
          // Sync any additional data from your existing system
          ...loginResult.user
        });

        console.log('🔍 Firebase Bridge: Sign up result:', firebaseResult);
        
        // Check if signup failed because email already exists (old placeholder account)
        if (!firebaseResult.success && firebaseResult.message && 
            (firebaseResult.message.includes('already') || firebaseResult.message.includes('in use'))) {
          console.log('📝 Firebase Bridge: Account exists from old placeholder system');
          console.log('💡 Firebase Bridge: Finding existing account and using it');
          
          // Find the existing user - try multiple times
          let existingUser = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const users = await authService.searchUsers(username);
            console.log(`🔍 Search attempt ${attempt + 1}: Found ${users.length} users`);
            existingUser = users.find(u => u.username === username);
            
            if (existingUser) {
              console.log('✅ Firebase Bridge: Found existing account for', username, 'UID:', existingUser.uid);
              break;
            }
            
            // Wait before retrying
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          if (existingUser) {
            // Update the user's profile with real data
            await authService.updateUserProfile(existingUser.uid, {
              username: username,
              displayName: loginResult.user?.displayName || username,
              bio: loginResult.user?.bio || '',
              profilePicture: loginResult.user?.profilePicture || '',
              bannerColor: '#5865f2',
              isPlaceholder: false,
              lastLogin: Date.now()
            });
            
            // Store Firebase UID in currentUserData
            if (window.currentUserData) {
              window.currentUserData.firebaseUid = existingUser.uid;
              console.log('✅ Firebase Bridge: Stored Firebase UID in currentUserData');
            }
            
            // Fetch and store permission
            if (typeof window.fetchUserPermission === 'function') {
              try {
                const permission = await window.fetchUserPermission(username);
                await authService.updateUserProfile(existingUser.uid, {
                  permission: permission,
                  lastUpdated: Date.now()
                });
                console.log('✅ Firebase Bridge: Stored permission:', permission);
              } catch (permError) {
                console.warn('⚠️ Could not fetch permission:', permError);
              }
            }
            
            console.log('✅ Firebase Bridge: Account updated successfully');
            console.log('💡 Firebase Bridge: User can send/receive messages');
            
            // Mark as successful so the rest of the code doesn't run
            firebaseResult = { success: true, user: existingUser };
          } else {
            console.error('❌ Firebase Bridge: Could not find existing user in database');
            console.log('💡 Firebase Bridge: The account exists in Auth but not in Database');
            console.log('💡 Firebase Bridge: Creating database entry manually...');
            
            // The user exists in Firebase Auth but not in Realtime Database
            // We need to create the database entry manually
            // Get the user's UID from Firebase Auth by trying to get all users
            try {
              // We can't get the UID directly, so we'll just skip this user for now
              // They'll need to be manually added to the database
              console.error('❌ Firebase Bridge: Cannot create database entry without UID from Auth');
              console.log('💡 Firebase Bridge: Please delete the placeholder account from Firebase Auth Console');
              console.log('💡 Firebase Bridge: Then the user can log in fresh and it will work');
            } catch (e) {
              console.error('❌ Error:', e);
            }
          }
        }
        
        // Don't sync DMs - Google Sheets manages the DM list
        console.log('📊 Firebase Bridge: Skipping DM sync - using Google Sheets for DM list');
      } else {
        // User exists, update their profile and sync DMs
        console.log('🔄 Firebase Bridge: Updating user profile and DMs...');
        
        const dmUsernames = window.currentUserData?.dmUsernames || [];
        
        // Get existing profile data to preserve profilePicture
        const existingProfile = await authService.getUserData(firebaseResult.user.uid);
        
        // Update profile (preserve profilePicture if it exists)
        await authService.updateUserProfile(firebaseResult.user.uid, {
          username: username,
          displayName: loginResult.user?.displayName || username,
          bio: loginResult.user?.bio || '',
          profilePicture: existingProfile?.profilePicture || loginResult.user?.profilePicture || '',
          lastLogin: Date.now()
        });
        
        // Don't sync DMs - let Google Sheets handle DM list management
        // Firebase is only for message storage, not DM list management
        console.log('📊 Firebase Bridge: Skipping DM sync - using Google Sheets for DM list');
      }

      if (firebaseResult.success) {
        console.log('✅ Firebase Bridge: Firebase authentication synced successfully!');
        console.log('✅ Firebase Bridge: User ID:', firebaseResult.user?.uid);
        
        // Store Firebase UID in currentUserData for easy access
        if (window.currentUserData && firebaseResult.user?.uid) {
          window.currentUserData.firebaseUid = firebaseResult.user.uid;
          console.log('✅ Firebase Bridge: Stored Firebase UID in currentUserData');
          
          // Fetch and store user permission in Firebase for faster lookups
          if (typeof window.fetchUserPermission === 'function') {
            try {
              const permission = await window.fetchUserPermission(username);
              await authService.updateUserProfile(firebaseResult.user.uid, {
                permission: permission,
                bio: window.currentUserData.bio || '',
                displayName: window.currentUserData.displayName || username,
                bannerColor: window.currentUserData.bannerColor || '#5865f2',
                lastLogin: Date.now()
              });
              console.log('✅ Firebase Bridge: Stored permission and profile data:', permission);
            } catch (permError) {
              console.warn('⚠️ Firebase Bridge: Could not fetch/store permission:', permError);
            }
          }
        }
      } else {
        console.warn('⚠️ Firebase Bridge: Firebase sync failed:', firebaseResult.message);
      }

    } catch (error) {
      console.error('❌ Firebase Bridge: Error syncing with Firebase:', error);
      console.error('❌ Firebase Bridge: Error details:', error.message);
    }
  }

  // Sync existing DMs from your system to Firebase
  async function syncExistingDMsToFirebase(userId, dmUsernames) {
    try {
      for (const otherUsername of dmUsernames) {
        // Find or create the other user in Firebase
        let otherUsers = await authService.searchUsers(otherUsername);
        let otherUser = otherUsers.find(u => u.username === otherUsername);
        
        if (!otherUser) {
          // Other user doesn't exist in Firebase yet, create a placeholder
          console.log('📝 Firebase Bridge: Creating placeholder for', otherUsername);
          const placeholderEmail = `${otherUsername}@schoolmessenger.app`;
          
          // Create a minimal user entry (they'll complete it when they log in)
          const signupResult = await authService.signUp(placeholderEmail, 'temp_' + Math.random(), {
            username: otherUsername,
            displayName: otherUsername,
            isPlaceholder: true
          });
          
          if (signupResult.success) {
            otherUser = signupResult.user;
          } else {
            console.warn('⚠️ Firebase Bridge: Could not create placeholder for', otherUsername);
            continue;
          }
        }
        
        // Generate chat ID
        const chatId = userService.generateChatId(userId, otherUser.uid);
        
        // Check if chat already exists
        const existingChat = await messageService.getChatMetadata(chatId);
        
        if (!existingChat) {
          // Create the DM chat
          console.log('💬 Firebase Bridge: Creating DM chat with', otherUsername);
          await userService.createDMChat(chatId, userId, otherUser.uid);
        } else {
          console.log('✓ Firebase Bridge: DM chat with', otherUsername, 'already exists');
        }
      }
      
      console.log('✅ Firebase Bridge: All DM chats synced to Firebase');
    } catch (error) {
      console.error('❌ Firebase Bridge: Error syncing DMs:', error);
    }
  }

  // ============================================
  // DM CHAT SYNC
  // ============================================

  async function syncDMChats(userId) {
    try {
      // Get DM chats from Firebase
      const firebaseDMChats = await userService.getUserDMChats(userId);
      
      if (firebaseDMChats.length > 0) {
        console.log('📨 Firebase Bridge: Loaded', firebaseDMChats.length, 'DM chats from Firebase');
      }

      // Only merge if we have Firebase DMs to add
      if (window.currentUserData && firebaseDMChats.length > 0) {
        const existingDMs = window.currentUserData.dmUsernames || [];
        const firebaseDMs = firebaseDMChats.map(chat => chat.otherUsername);
        
        // Merge both arrays and remove duplicates
        const allDMs = [...new Set([...existingDMs, ...firebaseDMs])];
        
        console.log('📊 Firebase Bridge: Merged DMs - Existing:', existingDMs.length, 'Firebase:', firebaseDMs.length, 'Total:', allDMs.length);
        
        // Only update if we're actually adding something
        if (allDMs.length > existingDMs.length) {
          window.currentUserData.dmUsernames = allDMs;

          // Update UI if displayDirectMessages exists
          if (typeof displayDirectMessages === 'function') {
            displayDirectMessages();
          }
        } else {
          console.log('📊 Firebase Bridge: No new DMs to add, keeping existing list');
        }
      } else {
        console.log('📊 Firebase Bridge: No Firebase DMs to merge, keeping existing DM list');
      }

      return firebaseDMChats;
    } catch (error) {
      // Only log if it's not a permission error (expected during initial setup)
      if (!error.message.includes('permission') && !error.message.includes('Permission')) {
        console.error('❌ Firebase Bridge: Error syncing DM chats:', error);
      }
      return [];
    }
  }

  // ============================================
  // MESSAGE SYNC
  // ============================================

  // Intercept the sendMessage function when it's available
  function interceptSendMessage() {
    // Wait for sendMessage to be defined
    if (typeof window.sendMessage === 'function') {
      const originalSendMessage = window.sendMessage;

      // Override sendMessage to sync with Firebase
      window.sendMessage = function() {
        // Get message details BEFORE calling original (which clears the input)
        const chatInput = document.getElementById('chatInput');
        const activeConversation = document.getElementById('chatUserInfo');
        
        let messageText = '';
        let recipientUsername = '';
        
        if (chatInput && activeConversation) {
          messageText = chatInput.value.trim();
          // Get the actual username from data attribute (not the display name from textContent)
          recipientUsername = activeConversation.dataset.currentUsername || activeConversation.querySelector('.username')?.textContent;
        }

        console.log('📤 Firebase Bridge: Intercepting message send to', recipientUsername);

        // Call original function (handles UI display and clears input)
        originalSendMessage.call(this);

        // Also send through Firebase
        if (isFirebaseReady && window.currentUserData && messageText && recipientUsername) {
          sendMessageThroughFirebase(messageText, recipientUsername);
        }
      };

      console.log('✅ Firebase Bridge: Message interception set up');
    } else {
      // Try again if not ready
      setTimeout(interceptSendMessage, 500);
    }
  }

  // Start intercepting messages
  interceptSendMessage();

  async function sendMessageThroughFirebase(messageText, recipientUsername) {
    // Only try to send if user is authenticated
    if (!isFirebaseReady) {
      return; // Silently skip if Firebase not ready
    }

    if (!window.currentUserData || !window.currentUserData.uuid) {
      return; // Silently skip if user not logged in
    }

    // Get current user's Firebase UID from stored data
    const currentFirebaseUid = window.currentUserData.firebaseUid;
    if (!currentFirebaseUid) {
      console.warn('⚠️ Firebase Bridge: No Firebase UID in currentUserData');
      return;
    }

    try {
      // Find recipient user - search multiple times to ensure we find them
      let recipient = null;
      
      // Try searching by username first
      let recipientUsers = await authService.searchUsers(recipientUsername);
      recipient = recipientUsers.find(u => u.username === recipientUsername);
      
      // If not found, wait a bit and try again (Firebase indexing delay)
      if (!recipient) {
        await new Promise(resolve => setTimeout(resolve, 500));
        recipientUsers = await authService.searchUsers(recipientUsername);
        recipient = recipientUsers.find(u => u.username === recipientUsername);
      }

      if (!recipient) {
        console.log('⚠️ Firebase Bridge: Recipient not in Firebase yet');
        console.log('💡 Firebase Bridge: They will be added when they log in');
        console.log('📝 Firebase Bridge: Skipping message send - recipient must log in first');
        
        // Show user-friendly message
        if (typeof showAlert === 'function') {
          showAlert(`${recipientUsername} hasn't logged in yet. They need to log in before you can send them messages.`, 'info');
        }
        return;
      }

      // Generate chat ID using Firebase UIDs
      const chatId = userService.generateChatId(currentFirebaseUid, recipient.uid);

      // Initialize chat if needed
      if (!messageService.currentChatId || messageService.currentChatId !== chatId) {
        messageService.initializeChat(chatId);
      }

      // Send message using Firebase UID
      const messageId = await messageService.sendMessage({
        text: messageText,
        senderId: currentFirebaseUid,
        senderUsername: window.currentUserData.username,
        type: 'text'
      });

      console.log('✅ Firebase Bridge: Message sent through Firebase:', messageId);

    } catch (error) {
      // Only log errors if they're not permission-related (which are expected during initial setup)
      if (!error.message.includes('permission') && !error.message.includes('Permission')) {
        console.error('❌ Firebase Bridge: Error sending message:', error);
      }
    }
  }

  // ============================================
  // REAL-TIME MESSAGE LISTENER
  // ============================================

  let currentMessageListener = null;

  window.initializeFirebaseChat = function(otherUsername) {
    console.log('💬 Firebase Bridge: Initializing chat with', otherUsername);

    if (!isFirebaseReady || !window.currentUserData) {
      console.warn('⚠️ Firebase Bridge: Not ready to initialize chat');
      return;
    }

    // Get current user's Firebase UID from stored data
    const currentFirebaseUid = window.currentUserData.firebaseUid;
    if (!currentFirebaseUid) {
      console.warn('⚠️ Firebase Bridge: No Firebase UID found in currentUserData');
      return;
    }

    // Clear displayed message IDs for new chat
    displayedMessageIds.clear();
    console.log('🔄 Firebase Bridge: Cleared message history for new chat');

    // Find the other user
    authService.searchUsers(otherUsername).then(async users => {
      const otherUser = users.find(u => u.username === otherUsername);

      if (!otherUser) {
        console.warn('⚠️ Firebase Bridge: User not found:', otherUsername);
        return;
      }

      // Generate chat ID using Firebase UIDs
      const chatId = userService.generateChatId(currentFirebaseUid, otherUser.uid);
      console.log('🔍 Firebase Bridge: Chat ID:', chatId, '(Me:', currentFirebaseUid, 'Other:', otherUser.uid, ')');

      // Clean up previous listener
      if (currentMessageListener) {
        currentMessageListener();
      }

      // Initialize message service
      messageService.initializeChat(chatId);

      // Load message history FIRST (before setting up real-time listener)
      console.log('📜 Firebase Bridge: Loading message history...');
      const messages = await messageService.getMessageHistory(50);
      console.log('📜 Firebase Bridge: Loaded', messages.length, 'messages from Firebase');
      
      // Pre-cache all unique user profiles from message history
      if (typeof window.getFirebaseProfile === 'function') {
        const uniqueUsernames = [...new Set(messages.map(m => m.senderUsername))];
        console.log('🔄 Pre-caching profiles for:', uniqueUsernames);
        
        await Promise.all(uniqueUsernames.map(async username => {
          try {
            const profile = await window.getFirebaseProfile(username);
            if (profile) {
              window.profileDataCache = window.profileDataCache || {};
              window.profileDataCache[username] = profile;
              console.log('✅ Cached profile for', username);
            }
          } catch (e) {
            console.warn('Could not cache profile for', username);
          }
        }));
      }
      
      // Display messages in your UI (show ALL messages from history)
      messages.forEach(message => {
        displayFirebaseMessage(message, true); // true = from history
      });

      // NOW set up real-time listener (after history is loaded)
      currentMessageListener = messageService.onNewMessage((message) => {
        console.log('📨 Firebase Bridge: New message received:', message.id);
        
        // Display in your UI (skip own messages from real-time listener)
        displayFirebaseMessage(message, false); // false = real-time

        // Mark as read if from other user
        if (message.senderId !== window.currentUserData.uuid) {
          messageService.updateMessageStatus(message.id, 'read');
        }
      });

      // Set up typing indicator
      setupTypingIndicator(chatId);

      console.log('✅ Firebase Bridge: Chat initialized');
    });
  };

  // Track displayed message IDs to prevent duplicates
  const displayedMessageIds = new Set();

  // Function to display Firebase messages in the UI
  function displayFirebaseMessage(message, fromHistory = false) {
    console.log('🔍 Firebase Bridge: Attempting to display message:', {
      id: message.id,
      text: message.text?.substring(0, 20),
      from: message.senderUsername,
      fromHistory: fromHistory
    });

    // Check if user is on home screen - don't display messages if so
    if (window.currentScreen === 'home' || !window.currentChatId) {
      console.log('⏭️ Firebase Bridge: User on home screen, not displaying message');
      return;
    }

    // Check if we already displayed this message
    if (displayedMessageIds.has(message.id)) {
      console.log('⏭️ Firebase Bridge: Skipping duplicate message', message.id);
      return;
    }

    // Mark as displayed
    displayedMessageIds.add(message.id);

    // Check if message is from current user using stored Firebase UID
    const currentFirebaseUid = window.currentUserData?.firebaseUid;
    const isSent = currentFirebaseUid && message.senderId === currentFirebaseUid;
    
    // Only skip your own messages if they're from real-time listener (not from history)
    if (isSent && !fromHistory) {
      console.log('⏭️ Firebase Bridge: Skipping own message (already displayed by UI)');
      return;
    }

    // Use the new addMessageToChat function from index.html
    if (typeof window.addMessageToChat === 'function') {
      window.addMessageToChat({
        username: message.senderUsername,
        message: message.text,
        timestamp: message.timestamp,
        isSent: isSent
      });
      console.log('✅ Firebase Bridge: Message displayed via addMessageToChat');
    } else {
      console.error('❌ Firebase Bridge: addMessageToChat function not found!');
    }
  }

  // ============================================
  // TYPING INDICATOR
  // ============================================

  let typingTimeout;

  function setupTypingIndicator(chatId) {
    const chatInput = document.getElementById('chatInput');

    if (chatInput && !chatInput.dataset.firebaseTypingSetup) {
      chatInput.dataset.firebaseTypingSetup = 'true';

      chatInput.addEventListener('input', () => {
        if (!window.currentUserData) return;

        // Set typing status using Firebase UID
        const userId = window.currentUserData.firebaseUid || window.currentUserData.uuid;
        messageService.setTypingStatus(chatId, userId, true);

        // Clear previous timeout
        clearTimeout(typingTimeout);

        // Clear typing status after 2 seconds
        typingTimeout = setTimeout(() => {
          messageService.setTypingStatus(chatId, userId, false);
        }, 2000);
      });
    }

    // Listen for typing status
    messageService.onTypingStatusChanged(chatId, (typingUsers) => {
      const currentUserId = window.currentUserData?.firebaseUid || window.currentUserData?.uuid;
      const otherUsersTyping = typingUsers.filter(userId => 
        String(userId) !== String(currentUserId)
      );

      // Update UI
      if (typeof updateTypingIndicator === 'function') {
        updateTypingIndicator(otherUsersTyping.length > 0);
      }
    });
  }

  // ============================================
  // FRIEND REQUEST LISTENER
  // ============================================

  function setupFriendRequestListener(userId) {
    userService.onNewFriendRequest(userId, async (request) => {
      console.log('👥 Firebase Bridge: New friend request from', request.fromUsername);

      // Update pending count if function exists
      if (typeof fetchAndUpdatePendingCount === 'function') {
        fetchAndUpdatePendingCount(userId);
      }

      // Show notification
      if (typeof showAlert === 'function') {
        showAlert(`Friend request from ${request.fromUsername}`, 'info');
      }
    });
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  function displayMessageInUI(message) {
    // Try to use existing message display function
    if (typeof addMessageToChat === 'function') {
      addMessageToChat({
        username: message.senderUsername,
        message: message.text,
        timestamp: message.timestamp,
        isSent: message.senderId === window.currentUserData?.uuid
      });
    } else {
      console.log('Message:', message);
    }
  }

  // ============================================
  // LOGOUT SYNC
  // ============================================

  const originalLogout = window.logout;

  window.logout = async function() {
    console.log('🚪 Firebase Bridge: Intercepting logout');

    // Sign out from Firebase
    if (isFirebaseReady && authService) {
      await authService.signOut();
    }

    // Clean up listeners
    if (messageService) {
      messageService.cleanup();
    }

    // Call original logout
    if (originalLogout) {
      return originalLogout.call(this);
    }
  };

  
  // Debug: Log when page loads
  console.log('🔍 Debug: Current user data on load:', window.currentUserData);
  console.log('🔍 Debug: Firebase ready:', isFirebaseReady);
  console.log('🔍 Debug: handleLoginWithLogin exists:', typeof window.handleLoginWithLogin);
  console.log('🔍 Debug: sendMessage exists:', typeof window.sendMessage);
  
  // Manual test function
  window.testFirebaseWrite = async function() {
    console.log('\n🧪 Testing Firebase Write...');
    
    if (!window.firebaseDatabase) {
      console.error('❌ Firebase database not initialized');
      return;
    }
    
    try {
      console.log('📝 Writing test data to /test/...');
      await window.firebaseDatabase.ref('test').set({
        message: 'Hello from Firebase Bridge!',
        timestamp: Date.now()
      });
      console.log('✅ Test data written successfully!');
      console.log('👀 Check Firebase Console → Realtime Database → /test/');
    } catch (error) {
      console.error('❌ Write failed:', error);
      console.error('Error details:', error.message);
    }
  };
  
  console.log('\n💡 Run window.testFirebaseWrite() to test if Firebase writing works');

  // ============================================
  // PROFILE DATA HELPERS
  // ============================================

  /**
   * Get user profile data from Firebase (faster than Google Sheets)
   * @param {string} username - Username to lookup
   * @returns {Object|null} Profile data with permission, bio, displayName, bannerColor
   */
  window.getFirebaseProfile = async function(username) {
    if (!isFirebaseReady) return null;
    
    try {
      const users = await authService.searchUsers(username);
      const user = users.find(u => u.username === username);
      
      if (user) {
        return {
          permission: user.permission || 'DEFAULT',
          bio: user.bio || '',
          displayName: user.displayName || username,
          bannerColor: user.bannerColor || '#5865f2',
          profilePicture: user.profilePicture || '',
          uid: user.uid
        };
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Firebase Bridge: Error fetching profile:', error);
      return null;
    }
  };

  // Set global flag so other code knows Firebase Bridge is loaded
  window.firebaseBridge = true;
  console.log('✅ Firebase Bridge: Fully initialized and ready');

})();
