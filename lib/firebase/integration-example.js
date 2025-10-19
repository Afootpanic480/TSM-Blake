// Firebase Integration Example
// This file shows how to integrate Firebase services with your existing School Messenger code

// Initialize Firebase services globally
let authService;
let messageService;
let userService;

// Initialize services when Firebase is ready
document.addEventListener('DOMContentLoaded', function() {
  // Wait for Firebase to initialize
  setTimeout(() => {
    if (window.firebaseAuth && window.firebaseDatabase) {
      authService = new FirebaseAuthService();
      messageService = new FirebaseMessageService();
      userService = new FirebaseUserService();
      
      console.log('Firebase services initialized');
      
      // Set up auth state listener
      setupAuthStateListener();
    } else {
      console.error('Firebase not initialized. Check firebase-config.js');
    }
  }, 500);
});

// ============================================
// AUTHENTICATION INTEGRATION
// ============================================

function setupAuthStateListener() {
  authService.onAuthStateChanged((user) => {
    if (user) {
      console.log('User authenticated:', user);
      onUserAuthenticated(user);
    } else {
      console.log('User not authenticated');
      onUserLoggedOut();
    }
  });
}

function onUserAuthenticated(user) {
  // Store user data globally
  window.currentUserData = {
    uuid: user.uid,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio || '',
    profilePicture: user.profilePicture || ''
  };
  
  // Set up presence system
  authService.setupPresence(user.uid);
  
  // Load user's DM chats
  loadUserDMChats(user.uid);
  
  // Listen for friend requests
  setupFriendRequestListener(user.uid);
}

function onUserLoggedOut() {
  window.currentUserData = null;
  // Clean up listeners
  if (messageService) messageService.cleanup();
  if (authService) authService.cleanup();
}

// ============================================
// LOGIN/REGISTER INTEGRATION
// ============================================

// Replace your existing login function with Firebase
async function handleFirebaseLogin(username, password) {
  try {
    // Convert username to email format if needed
    const email = username.includes('@') ? username : `${username}@schoolmessenger.app`;
    
    const result = await authService.signIn(email, password);
    
    if (result.success) {
      console.log('Login successful');
      return {
        success: true,
        user: result.user
      };
    } else {
      return {
        success: false,
        message: result.message
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login'
    };
  }
}

// Replace your existing register function with Firebase
async function handleFirebaseRegister(username, email, password, additionalData = {}) {
  try {
    const result = await authService.signUp(email, password, {
      username: username,
      displayName: additionalData.displayName || username,
      bio: additionalData.bio || '',
      profilePicture: additionalData.profilePicture || ''
    });
    
    if (result.success) {
      console.log('Registration successful');
      return {
        success: true,
        user: result.user
      };
    } else {
      return {
        success: false,
        message: result.message
      };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'An error occurred during registration'
    };
  }
}

// ============================================
// MESSAGING INTEGRATION
// ============================================

// Initialize chat when user opens a DM
function openDMChat(otherUsername) {
  if (!window.currentUserData) {
    console.error('User not authenticated');
    return;
  }
  
  const currentUserId = window.currentUserData.uuid;
  
  // Find the other user's ID (you'll need to implement user lookup)
  findUserByUsername(otherUsername).then(otherUser => {
    if (!otherUser) {
      console.error('User not found:', otherUsername);
      return;
    }
    
    // Generate chat ID
    const chatId = userService.generateChatId(currentUserId, otherUser.uid);
    
    // Initialize message service for this chat
    messageService.initializeChat(chatId);
    
    // Load message history
    loadMessageHistory(chatId);
    
    // Listen for new messages
    setupMessageListener();
    
    // Set up typing indicator
    setupTypingIndicator(chatId);
  });
}

async function loadMessageHistory(chatId) {
  try {
    const messages = await messageService.getMessageHistory(50);
    
    // Display messages in your UI
    messages.forEach(message => {
      displayMessage(message);
    });
    
    // Mark messages as read
    if (window.currentUserData) {
      await messageService.markAllAsRead(window.currentUserData.uuid);
    }
  } catch (error) {
    console.error('Error loading message history:', error);
  }
}

function setupMessageListener() {
  // Listen for new messages
  messageService.onNewMessage((message) => {
    console.log('New message received:', message);
    displayMessage(message);
    
    // Mark as read if chat is open
    if (window.currentUserData && message.senderId !== window.currentUserData.uuid) {
      messageService.updateMessageStatus(message.id, 'read');
    }
  });
  
  // Listen for message updates
  messageService.onMessageChanged((message) => {
    console.log('Message updated:', message);
    updateMessageInUI(message);
  });
}

// Send message function
async function sendFirebaseMessage(text) {
  if (!window.currentUserData) {
    console.error('User not authenticated');
    return;
  }
  
  try {
    const messageId = await messageService.sendMessage({
      text: text,
      senderId: window.currentUserData.uuid,
      senderUsername: window.currentUserData.username,
      type: 'text'
    });
    
    console.log('Message sent:', messageId);
    return { success: true, messageId };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// TYPING INDICATOR
// ============================================

let typingTimeout;

function setupTypingIndicator(chatId) {
  const chatInput = document.getElementById('chatInput');
  
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      if (!window.currentUserData) return;
      
      // Set typing status to true
      messageService.setTypingStatus(chatId, window.currentUserData.uuid, true);
      
      // Clear previous timeout
      clearTimeout(typingTimeout);
      
      // Set timeout to clear typing status
      typingTimeout = setTimeout(() => {
        messageService.setTypingStatus(chatId, window.currentUserData.uuid, false);
      }, 2000);
    });
  }
  
  // Listen for typing status changes
  messageService.onTypingStatusChanged(chatId, (typingUsers) => {
    // Filter out current user
    const otherUsersTyping = typingUsers.filter(userId => 
      userId !== window.currentUserData?.uuid
    );
    
    // Update UI to show typing indicator
    updateTypingIndicator(otherUsersTyping);
  });
}

// ============================================
// FRIEND MANAGEMENT
// ============================================

async function loadUserDMChats(userId) {
  try {
    const dmChats = await userService.getUserDMChats(userId);
    console.log('DM chats loaded:', dmChats);
    
    // Update your UI with DM list
    displayDMList(dmChats);
  } catch (error) {
    console.error('Error loading DM chats:', error);
  }
}

function setupFriendRequestListener(userId) {
  userService.onNewFriendRequest(userId, (request) => {
    console.log('New friend request:', request);
    
    // Show notification to user
    showFriendRequestNotification(request);
    
    // Update pending count
    updatePendingFriendRequestCount();
  });
}

async function sendFriendRequest(friendUsername) {
  if (!window.currentUserData) {
    console.error('User not authenticated');
    return;
  }
  
  try {
    // Find friend by username
    const friend = await findUserByUsername(friendUsername);
    
    if (!friend) {
      return { success: false, message: 'User not found' };
    }
    
    const result = await userService.sendFriendRequest(
      window.currentUserData.uuid,
      friend.uid
    );
    
    return result;
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { success: false, message: error.message };
  }
}

async function acceptFriendRequest(friendId) {
  if (!window.currentUserData) {
    console.error('User not authenticated');
    return;
  }
  
  try {
    const result = await userService.acceptFriendRequest(
      window.currentUserData.uuid,
      friendId
    );
    
    if (result.success) {
      console.log('Friend request accepted, chat created:', result.chatId);
      // Reload DM list
      loadUserDMChats(window.currentUserData.uuid);
    }
    
    return result;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function findUserByUsername(username) {
  try {
    const users = await authService.searchUsers(username);
    return users.find(u => u.username === username) || null;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

function displayMessage(message) {
  // Implement your message display logic here
  console.log('Display message:', message);
  
  // Example:
  // const messageElement = createMessageElement(message);
  // document.getElementById('messagesContainer').appendChild(messageElement);
}

function updateMessageInUI(message) {
  // Update existing message in UI (e.g., status change)
  console.log('Update message in UI:', message);
}

function displayDMList(dmChats) {
  // Update your DM list UI
  console.log('Display DM list:', dmChats);
}

function showFriendRequestNotification(request) {
  // Show notification to user
  console.log('Friend request notification:', request);
}

function updatePendingFriendRequestCount() {
  // Update pending count badge
  console.log('Update pending friend request count');
}

function updateTypingIndicator(typingUsers) {
  // Show/hide typing indicator
  console.log('Users typing:', typingUsers);
}

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ============================================

window.firebaseIntegration = {
  handleFirebaseLogin,
  handleFirebaseRegister,
  openDMChat,
  sendFirebaseMessage,
  sendFriendRequest,
  acceptFriendRequest,
  authService: () => authService,
  messageService: () => messageService,
  userService: () => userService
};
