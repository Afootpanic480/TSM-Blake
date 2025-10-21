// Firebase Authentication Service
class FirebaseAuthService {
  constructor() {
    this.auth = window.firebaseAuth;
    this.database = window.firebaseDatabase;
    this.currentUser = null;
    this.authStateListeners = [];
  }

  /**
   * Sign up a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} userData - Additional user data
   * @returns {Promise<Object>} User object
   */
  async signUp(email, password, userData = {}) {
    try {
      // Create user with email and password
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Store additional user data in database
      await this.database.ref(`users/${user.uid}`).set({
        uid: user.uid,
        email: email,
        username: userData.username || email.split('@')[0],
        displayName: userData.displayName || userData.username || email.split('@')[0],
        bio: userData.bio || '',
        profilePicture: userData.profilePicture || '',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        status: 'online',
        ...userData
      });

      console.log('User signed up successfully:', user.uid);
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          ...userData
        }
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  /**
   * Sign in existing user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User object
   */
  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Update user status
      await this.updateUserStatus(user.uid, 'online');

      // Get user data from database
      const userData = await this.getUserData(user.uid);

      console.log('User signed in successfully:', user.uid);
      this.currentUser = { uid: user.uid, email: user.email, ...userData };

      return {
        success: true,
        user: this.currentUser
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      if (this.currentUser) {
        await this.updateUserStatus(this.currentUser.uid, 'offline');
        try {
          await this.database.ref(`presence/${this.currentUser.uid}`).set({
            status: 'offline',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
          });
        } catch (presenceError) {
          console.warn('⚠️ Presence sign-out update failed:', presenceError);
        }
      }
      await this.auth.signOut();
      this.currentUser = null;
      console.log('User signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get current user
   * @returns {Object|null} Current user object
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Listen for authentication state changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    const unsubscribe = this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in
        const userData = await this.getUserData(user.uid);
        this.currentUser = { uid: user.uid, email: user.email, ...userData };
        callback(this.currentUser);
      } else {
        // User is signed out
        this.currentUser = null;
        callback(null);
      }
    });

    this.authStateListeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Get user data from database
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUserData(userId) {
    try {
      const snapshot = await this.database.ref(`users/${userId}`).once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('Error fetching user data:', error);
      return {};
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   */
  async updateUserProfile(userId, updates) {
    try {
      await this.database.ref(`users/${userId}`).update({
        ...updates,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
      console.log('User profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Update user status (online/offline/away)
   * @param {string} userId - User ID
   * @param {string} status - User status
   */
  async updateUserStatus(userId, status) {
    try {
      await this.database.ref(`users/${userId}`).update({
        status: status,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  /**
   * Set up presence system (online/offline detection)
   * @param {string} userId - User ID
   */
  setupPresence(userId) {
    const userStatusRef = this.database.ref(`users/${userId}/status`);
    const connectedRef = this.database.ref('.info/connected');

    connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === true) {
        // User is online
        userStatusRef.onDisconnect().set('offline');
        userStatusRef.set('online');
      }
    });
  }

  /**
   * Search for users by username
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of users
   */
  async searchUsers(query) {
    try {
      // Try exact match first (faster and doesn't require index)
      const snapshot = await this.database.ref('users')
        .orderByChild('username')
        .equalTo(query)
        .limitToFirst(20)
        .once('value');

      const users = [];
      snapshot.forEach((childSnapshot) => {
        users.push({
          uid: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      // If exact match found, return it
      if (users.length > 0) {
        return users;
      }

      // Otherwise try prefix search (requires index)
      const prefixSnapshot = await this.database.ref('users')
        .orderByChild('username')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .limitToFirst(20)
        .once('value');

      prefixSnapshot.forEach((childSnapshot) => {
        users.push({
          uid: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Reset password
   * @param {string} email - User email
   */
  async resetPassword(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return {
        success: true,
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  /**
   * Update email
   * @param {string} newEmail - New email address
   */
  async updateEmail(newEmail) {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No user signed in');

      await user.updateEmail(newEmail);
      await this.database.ref(`users/${user.uid}`).update({ email: newEmail });

      return { success: true };
    } catch (error) {
      console.error('Email update error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Update password
   * @param {string} newPassword - New password
   */
  async updatePassword(newPassword) {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No user signed in');

      await user.updatePassword(newPassword);
      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get user-friendly error message
   * @param {string} errorCode - Firebase error code
   * @returns {string} User-friendly error message
   */
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/weak-password': 'Password is too weak',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection'
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again';
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    this.authStateListeners.forEach(unsubscribe => unsubscribe());
    this.authStateListeners = [];
  }
}

// Export the service
window.FirebaseAuthService = FirebaseAuthService;
