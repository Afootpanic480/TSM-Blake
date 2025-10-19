// Firebase User Service - Manages user relationships and DMs
class FirebaseUserService {
  constructor() {
    this.database = window.firebaseDatabase;
  }

  /**
   * Send friend request
   * @param {string} fromUserId - Sender user ID
   * @param {string} toUserId - Recipient user ID
   */
  async sendFriendRequest(fromUserId, toUserId) {
    try {
      const fromUserData = await this.database.ref(`users/${fromUserId}`).once('value');
      const fromUser = fromUserData.val();

      await this.database.ref(`friendRequests/${toUserId}/${fromUserId}`).set({
        from: fromUserId,
        fromUsername: fromUser.username,
        fromDisplayName: fromUser.displayName,
        fromProfilePicture: fromUser.profilePicture || '',
        status: 'pending',
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });

      console.log('Friend request sent');
      return { success: true };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Accept friend request
   * @param {string} userId - Current user ID
   * @param {string} friendId - Friend user ID
   */
  async acceptFriendRequest(userId, friendId) {
    try {
      // Add to both users' friends lists
      await this.database.ref(`users/${userId}/friends/${friendId}`).set({
        addedAt: firebase.database.ServerValue.TIMESTAMP
      });

      await this.database.ref(`users/${friendId}/friends/${userId}`).set({
        addedAt: firebase.database.ServerValue.TIMESTAMP
      });

      // Remove friend request
      await this.database.ref(`friendRequests/${userId}/${friendId}`).remove();

      // Create DM chat
      const chatId = this.generateChatId(userId, friendId);
      await this.createDMChat(chatId, userId, friendId);

      console.log('Friend request accepted');
      return { success: true, chatId };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Reject friend request
   * @param {string} userId - Current user ID
   * @param {string} friendId - Friend user ID
   */
  async rejectFriendRequest(userId, friendId) {
    try {
      await this.database.ref(`friendRequests/${userId}/${friendId}`).remove();
      console.log('Friend request rejected');
      return { success: true };
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get pending friend requests
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of friend requests
   */
  async getPendingFriendRequests(userId) {
    try {
      const snapshot = await this.database.ref(`friendRequests/${userId}`).once('value');
      const requests = [];

      snapshot.forEach((childSnapshot) => {
        requests.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      return requests;
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      return [];
    }
  }

  /**
   * Listen for new friend requests
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onNewFriendRequest(userId, callback) {
    const requestsRef = this.database.ref(`friendRequests/${userId}`);
    
    const listener = requestsRef.on('child_added', (snapshot) => {
      callback({
        id: snapshot.key,
        ...snapshot.val()
      });
    });

    return () => {
      requestsRef.off('child_added', listener);
    };
  }

  /**
   * Get user's friends list
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of friends
   */
  async getFriendsList(userId) {
    try {
      const snapshot = await this.database.ref(`users/${userId}/friends`).once('value');
      const friendIds = [];

      snapshot.forEach((childSnapshot) => {
        friendIds.push(childSnapshot.key);
      });

      // Fetch friend details
      const friends = await Promise.all(
        friendIds.map(async (friendId) => {
          const friendSnapshot = await this.database.ref(`users/${friendId}`).once('value');
          return {
            uid: friendId,
            ...friendSnapshot.val()
          };
        })
      );

      return friends;
    } catch (error) {
      console.error('Error fetching friends list:', error);
      return [];
    }
  }

  /**
   * Remove friend
   * @param {string} userId - Current user ID
   * @param {string} friendId - Friend user ID
   */
  async removeFriend(userId, friendId) {
    try {
      // Remove from both users' friends lists
      await this.database.ref(`users/${userId}/friends/${friendId}`).remove();
      await this.database.ref(`users/${friendId}/friends/${userId}`).remove();

      console.log('Friend removed');
      return { success: true };
    } catch (error) {
      console.error('Error removing friend:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Create DM chat between two users
   * @param {string} chatId - Chat ID
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   */
  async createDMChat(chatId, user1Id, user2Id) {
    try {
      // Get user data
      const [user1Data, user2Data] = await Promise.all([
        this.database.ref(`users/${user1Id}`).once('value'),
        this.database.ref(`users/${user2Id}`).once('value')
      ]);

      const user1 = user1Data.val();
      const user2 = user2Data.val();

      // Create chat metadata
      await this.database.ref(`chats/${chatId}/metadata`).set({
        type: 'dm',
        participants: {
          [user1Id]: {
            username: user1.username,
            displayName: user1.displayName,
            profilePicture: user1.profilePicture || ''
          },
          [user2Id]: {
            username: user2.username,
            displayName: user2.displayName,
            profilePicture: user2.profilePicture || ''
          }
        },
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastMessage: null,
        lastMessageTime: null
      });

      // Add chat to both users' DM lists
      await this.database.ref(`users/${user1Id}/dms/${chatId}`).set({
        otherUserId: user2Id,
        otherUsername: user2.username,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });

      await this.database.ref(`users/${user2Id}/dms/${chatId}`).set({
        otherUserId: user1Id,
        otherUsername: user1.username,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });

      console.log('DM chat created:', chatId);
      return { success: true, chatId };
    } catch (error) {
      console.error('Error creating DM chat:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get user's DM chats
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of DM chats
   */
  async getUserDMChats(userId) {
    try {
      const snapshot = await this.database.ref(`users/${userId}/dms`).once('value');
      const chats = [];

      for (const childSnapshot of snapshot.val() ? Object.entries(snapshot.val()) : []) {
        const [chatId, dmData] = childSnapshot;
        
        // Get chat metadata
        const chatMetadata = await this.database.ref(`chats/${chatId}/metadata`).once('value');
        
        chats.push({
          chatId,
          ...dmData,
          metadata: chatMetadata.val()
        });
      }

      return chats;
    } catch (error) {
      console.error('Error fetching DM chats:', error);
      return [];
    }
  }

  /**
   * Generate consistent chat ID for two users
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @returns {string} Chat ID
   */
  generateChatId(user1Id, user2Id) {
    // Sort IDs to ensure consistency
    const ids = [user1Id, user2Id].sort();
    return `dm_${ids[0]}_${ids[1]}`;
  }

  /**
   * Block user
   * @param {string} userId - Current user ID
   * @param {string} blockedUserId - User to block
   */
  async blockUser(userId, blockedUserId) {
    try {
      await this.database.ref(`users/${userId}/blocked/${blockedUserId}`).set({
        blockedAt: firebase.database.ServerValue.TIMESTAMP
      });

      console.log('User blocked');
      return { success: true };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Unblock user
   * @param {string} userId - Current user ID
   * @param {string} blockedUserId - User to unblock
   */
  async unblockUser(userId, blockedUserId) {
    try {
      await this.database.ref(`users/${userId}/blocked/${blockedUserId}`).remove();
      console.log('User unblocked');
      return { success: true };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get blocked users list
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of blocked user IDs
   */
  async getBlockedUsers(userId) {
    try {
      const snapshot = await this.database.ref(`users/${userId}/blocked`).once('value');
      const blockedIds = [];

      snapshot.forEach((childSnapshot) => {
        blockedIds.push(childSnapshot.key);
      });

      return blockedIds;
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }
  }
}

// Export the service
window.FirebaseUserService = FirebaseUserService;
