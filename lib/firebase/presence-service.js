/**
 * Firebase Presence Service
 * Handles user online/offline/idle/dnd status
 */

class PresenceService {
  constructor(database, auth) {
    this.db = database;
    this.auth = auth;
    this.presenceRef = null;
    this.userStatusRef = null;
    this.statusListeners = new Map();
    this.currentStatus = 'online';
    this.isManualStatus = false; // Track if status was manually set
    this.idleTimeout = null;
    this.idleTime = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize presence for current user
   */
  async initialize() {
    const user = this.auth.currentUser;
    if (!user) {
      console.warn('⚠️ Presence: No user logged in');
      return;
    }

    this.presenceRef = this.db.ref(`presence/${user.uid}`);
    this.userStatusRef = this.db.ref(`users/${user.uid}`);
    
    // Restore previous status from Firebase user profile
    let initialStatus = 'online';
    let initialIsManual = false;
    
    try {
      const userProfileRef = this.db.ref(`users/${user.uid}/preferredStatus`);
      const snapshot = await userProfileRef.once('value');
      const savedStatus = snapshot.val();
      
      if (savedStatus && savedStatus !== 'idle') {
        // Only restore manual statuses (not auto-idle)
        initialStatus = savedStatus;
        initialIsManual = true;
        console.log('✅ Presence: Restored previous status from Firebase:', initialStatus);
      } else {
        console.log('✅ Presence: Starting with default online status');
      }
    } catch (error) {
      console.warn('⚠️ Presence: Could not load saved status, using default');
    }
    
    // Set up connection state monitoring
    const connectedRef = this.db.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === true) {
        // When connected (or reconnected), restore saved status
        this.setStatus(initialStatus, initialIsManual);

        // Set up disconnect handler
        this.presenceRef.onDisconnect().set({
          status: 'offline',
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
        if (this.userStatusRef) {
          this.userStatusRef.onDisconnect().update({
            status: 'offline',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
          });
        }
      }
    });

    // Set up idle detection
    this.setupIdleDetection();
    
    console.log('✅ Presence: Initialized for user', user.uid);
  }

  /**
   * Set user status
   * @param {string} status - 'online', 'idle', 'dnd', 'offline'
   * @param {boolean} isManual - Whether this was manually set by user
   */
  async setStatus(status, isManual = false) {
    if (!this.presenceRef) return;
    
    this.currentStatus = status;
    this.isManualStatus = isManual;
    
    // Save to Firebase user profile if manual (so it persists across sessions)
    const user = this.auth.currentUser;
    if (user && isManual) {
      try {
        const userProfileRef = this.db.ref(`users/${user.uid}/preferredStatus`);
        await userProfileRef.set(status);
        console.log('💾 Presence: Saved manual status to Firebase profile:', status);
      } catch (error) {
        console.warn('⚠️ Presence: Could not save status to profile:', error);
      }
    } else if (user && status === 'idle' && !isManual) {
      // Don't save auto-idle status - clear it
      try {
        const userProfileRef = this.db.ref(`users/${user.uid}/preferredStatus`);
        await userProfileRef.remove();
      } catch (error) {
        // Ignore errors when clearing
      }
    }
    
    try {
      const timestamp = firebase.database.ServerValue.TIMESTAMP;
      const updates = [
        this.presenceRef.set({
          status: status,
          lastSeen: timestamp
        })
      ];

      if (this.userStatusRef) {
        updates.push(this.userStatusRef.update({
          status: status,
          lastSeen: timestamp
        }));
      }

      await Promise.all(updates);
      
      console.log('✅ Presence: Status set to', status, isManual ? '(manual)' : '(auto)');
      
      // Update UI
      if (typeof window.updateOwnPresenceUI === 'function') {
        window.updateOwnPresenceUI(status);
      }
    } catch (error) {
      console.error('❌ Presence: Error setting status', error);
    }
  }

  /**
   * Set up idle detection based on user activity
   */
  setupIdleDetection() {
    let lastActivity = Date.now();
    
    const resetIdleTimer = () => {
      lastActivity = Date.now();
      
      // Only auto-return to online if idle was automatic (not manual)
      if (this.currentStatus === 'idle' && !this.isManualStatus) {
        this.setStatus('online', false); // Auto-set back to online
      }
      
      // Clear existing timeout
      if (this.idleTimeout) {
        clearTimeout(this.idleTimeout);
      }
      
      // Set new timeout - only auto-idle if online and not manually set
      this.idleTimeout = setTimeout(() => {
        // Only auto-idle if status is online and wasn't manually set
        if (this.currentStatus === 'online' && !this.isManualStatus) {
          this.setStatus('idle', false); // Auto-set to idle
          console.log('⏰ Auto-idle: Set to idle after 5 minutes of inactivity');
        }
      }, this.idleTime);
    };

    // Listen for user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    // Initial timer
    resetIdleTimer();
  }

  /**
   * Listen to another user's presence
   * @param {string} userId - User ID to monitor
   * @param {function} callback - Called with presence data
   */
  listenToUserPresence(userId, callback) {
    const presenceRef = this.db.ref(`presence/${userId}`);
    
    const listener = presenceRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          status: data.status || 'offline',
          lastSeen: data.lastSeen || Date.now()
        });
      } else {
        callback({ status: 'offline', lastSeen: Date.now() });
      }
    });

    // Store listener for cleanup
    this.statusListeners.set(userId, { ref: presenceRef, listener });
  }

  /**
   * Stop listening to a user's presence
   * @param {string} userId - User ID to stop monitoring
   */
  stopListeningToUser(userId) {
    const listenerData = this.statusListeners.get(userId);
    if (listenerData) {
      listenerData.ref.off('value', listenerData.listener);
      this.statusListeners.delete(userId);
    }
  }

  /**
   * Get user's current presence (one-time read)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Presence data
   */
  async getUserPresence(userId) {
    try {
      const snapshot = await this.db.ref(`presence/${userId}`).once('value');
      const data = snapshot.val();
      
      if (data) {
        return {
          status: data.status || 'offline',
          lastSeen: data.lastSeen || Date.now()
        };
      }
      
      return { status: 'offline', lastSeen: Date.now() };
    } catch (error) {
      console.error('❌ Presence: Error getting user presence', error);
      return { status: 'offline', lastSeen: Date.now() };
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup() {
    // Remove all status listeners
    this.statusListeners.forEach((listenerData, userId) => {
      this.stopListeningToUser(userId);
    });

    // Clear idle timeout
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    // Set offline status
    if (this.presenceRef) {
      this.setStatus('offline');
    }

    console.log('✅ Presence: Cleaned up');
  }

  /**
   * Format last seen time
   * @param {number} timestamp - Timestamp in milliseconds
   * @returns {string} Formatted string
   */
  static formatLastSeen(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.PresenceService = PresenceService;
}
