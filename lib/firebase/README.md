# Firebase Integration Setup Guide

## Prerequisites
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the following Firebase services:
   - **Authentication** (Email/Password)
   - **Realtime Database**
   - **Storage** (for file uploads)

## Setup Steps

### 1. Get Firebase Configuration
1. Go to your Firebase project settings
2. Scroll down to "Your apps" section
3. Click "Add app" and select Web (</>) icon
4. Copy the `firebaseConfig` object

### 2. Update Configuration
Open `firebase-config.js` and replace the placeholder values with your actual Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
};
```

### 3. Configure Firebase Realtime Database Rules
In Firebase Console, go to Realtime Database > Rules and set:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "$uid === auth.uid"
      }
    },
    "chats": {
      "$chatId": {
        ".read": "auth != null && (data.child('metadata/participants/' + auth.uid).exists())",
        ".write": "auth != null && (data.child('metadata/participants/' + auth.uid).exists())"
      }
    },
    "friendRequests": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "auth != null"
      }
    }
  }
}
```

### 4. Configure Firebase Storage Rules
In Firebase Console, go to Storage > Rules and set:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /chats/{chatId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Usage Examples

### Initialize Services
```javascript
// Initialize services
const authService = new FirebaseAuthService();
const messageService = new FirebaseMessageService();
const userService = new FirebaseUserService();
```

### Authentication
```javascript
// Sign up
const result = await authService.signUp('user@example.com', 'password123', {
  username: 'johndoe',
  displayName: 'John Doe'
});

// Sign in
const result = await authService.signIn('user@example.com', 'password123');

// Listen for auth state
authService.onAuthStateChanged((user) => {
  if (user) {
    console.log('User logged in:', user);
  } else {
    console.log('User logged out');
  }
});
```

### Messaging
```javascript
// Initialize chat
messageService.initializeChat('chatId123');

// Send message
await messageService.sendMessage({
  text: 'Hello!',
  senderId: 'userId123',
  senderUsername: 'johndoe'
});

// Listen for new messages
messageService.onNewMessage((message) => {
  console.log('New message:', message);
});

// Get message history
const messages = await messageService.getMessageHistory(50);
```

### User Management
```javascript
// Send friend request
await userService.sendFriendRequest('myUserId', 'friendUserId');

// Accept friend request
await userService.acceptFriendRequest('myUserId', 'friendUserId');

// Get friends list
const friends = await userService.getFriendsList('myUserId');

// Get DM chats
const dmChats = await userService.getUserDMChats('myUserId');
```

## Database Structure

```
firebase-database/
├── users/
│   ├── {userId}/
│   │   ├── uid: string
│   │   ├── email: string
│   │   ├── username: string
│   │   ├── displayName: string
│   │   ├── bio: string
│   │   ├── profilePicture: string
│   │   ├── status: "online" | "offline" | "away"
│   │   ├── lastSeen: timestamp
│   │   ├── friends/
│   │   │   └── {friendId}: { addedAt: timestamp }
│   │   ├── dms/
│   │   │   └── {chatId}: { otherUserId, otherUsername, createdAt }
│   │   └── blocked/
│   │       └── {blockedUserId}: { blockedAt: timestamp }
├── chats/
│   ├── {chatId}/
│   │   ├── metadata/
│   │   │   ├── type: "dm" | "group"
│   │   │   ├── participants: { [userId]: {...} }
│   │   │   ├── lastMessage: string
│   │   │   └── lastMessageTime: timestamp
│   │   ├── messages/
│   │   │   └── {messageId}/
│   │   │       ├── text: string
│   │   │       ├── senderId: string
│   │   │       ├── senderUsername: string
│   │   │       ├── timestamp: timestamp
│   │   │       ├── type: "text" | "image" | "file"
│   │   │       └── status: "sent" | "delivered" | "read"
│   │   └── typing/
│   │       └── {userId}: { isTyping: boolean, timestamp }
└── friendRequests/
    └── {userId}/
        └── {fromUserId}/
            ├── from: string
            ├── fromUsername: string
            ├── status: "pending"
            └── timestamp: timestamp
```

## Features

### Authentication Service
- ✅ Sign up with email/password
- ✅ Sign in
- ✅ Sign out
- ✅ Password reset
- ✅ User profile management
- ✅ Online/offline presence
- ✅ User search

### Message Service
- ✅ Real-time messaging
- ✅ Message history
- ✅ Message status (sent/delivered/read)
- ✅ Typing indicators
- ✅ Message deletion
- ✅ Chat metadata

### User Service
- ✅ Friend requests
- ✅ Friends list management
- ✅ DM chat creation
- ✅ User blocking
- ✅ Real-time friend request notifications

## Security Notes

1. **Never commit your Firebase config with real credentials to public repositories**
2. Use environment variables for production
3. Implement proper security rules in Firebase Console
4. Enable App Check for additional security
5. Regularly review Firebase usage and security rules

## Troubleshooting

### Common Issues

**Issue**: "Firebase not defined"
- **Solution**: Make sure Firebase SDK is loaded before your scripts

**Issue**: "Permission denied"
- **Solution**: Check your Firebase Database and Storage rules

**Issue**: "Network error"
- **Solution**: Verify your Firebase configuration and internet connection

**Issue**: "User not authenticated"
- **Solution**: Ensure user is signed in before accessing protected resources

## Support

For more information, visit:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Realtime Database Guide](https://firebase.google.com/docs/database)
- [Firebase Authentication Guide](https://firebase.google.com/docs/auth)
