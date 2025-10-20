// Firebase Message Service
class FirebaseMessageService {
  constructor() {
    this.database = window.firebaseDatabase;
    this.messagesRef = null;
    this.currentChatId = null;
    this.messageListeners = [];
  }

  /**
   * Initialize message service for a specific chat
   * @param {string} chatId - The chat/conversation ID
   */
  initializeChat(chatId) {
    this.currentChatId = chatId;
    this.messagesRef = this.database.ref(`chats/${chatId}/messages`);
    console.log(`Initialized chat: ${chatId}`);
  }

  /**
   * Send a message to the current chat
   * @param {Object} messageData - Message data
   * @returns {Promise<string>} Message ID
   */
  async sendMessage(messageData) {
    if (!this.messagesRef) {
      throw new Error('Chat not initialized. Call initializeChat() first.');
    }

    const message = {
      text: messageData.text || '',
      senderId: messageData.senderId,
      senderUsername: messageData.senderUsername,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      type: messageData.type || 'text', // text, image, file, etc.
      status: 'sent', // sent, delivered, read
      ...messageData
    };

    try {
      const newMessageRef = await this.messagesRef.push(message);
      console.log('Message sent:', newMessageRef.key);
      return newMessageRef.key;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Listen for new messages in real-time
   * @param {Function} callback - Callback function to handle new messages
   * @returns {Function} Unsubscribe function
   */
  onNewMessage(callback) {
    if (!this.messagesRef) {
      throw new Error('Chat not initialized. Call initializeChat() first.');
    }

    const listener = this.messagesRef.on('child_added', (snapshot) => {
      const message = {
        id: snapshot.key,
        ...snapshot.val()
      };
      callback(message);
    });

    this.messageListeners.push({ type: 'child_added', listener });

    // Return unsubscribe function
    return () => {
      this.messagesRef.off('child_added', listener);
    };
  }

  /**
   * Listen for message updates (e.g., status changes)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onMessageChanged(callback) {
    if (!this.messagesRef) {
      throw new Error('Chat not initialized. Call initializeChat() first.');
    }

    const listener = this.messagesRef.on('child_changed', (snapshot) => {
      const message = {
        id: snapshot.key,
        ...snapshot.val()
      };
      callback(message);
    });

    this.messageListeners.push({ type: 'child_changed', listener });

    return () => {
      this.messagesRef.off('child_changed', listener);
    };
  }

  /**
   * Get message history
   * @param {number} limit - Number of messages to fetch
   * @returns {Promise<Array>} Array of messages
   */
  async getMessageHistory(limit = 50) {
    if (!this.messagesRef) {
      throw new Error('Chat not initialized. Call initializeChat() first.');
    }

    try {
      const snapshot = await this.messagesRef
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      return messages;
    } catch (error) {
      console.error('Error fetching message history:', error);
      throw error;
    }
  }

  /**
   * Update message status (delivered, read, etc.)
   * @param {string} messageId - Message ID
   * @param {string} status - New status
   */
  async updateMessageStatus(messageId, status) {
    if (!this.messagesRef) {
      throw new Error('Chat not initialized. Call initializeChat() first.');
    }

    try {
      await this.messagesRef.child(messageId).update({ status });
      console.log(`Message ${messageId} status updated to ${status}`);
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   */
  async deleteMessage(messageId) {
    if (!this.messagesRef) {
      throw new Error('Chat not initialized. Call initializeChat() first.');
    }

    try {
      await this.messagesRef.child(messageId).remove();
      console.log(`Message ${messageId} deleted`);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Mark all messages as read
   */
  async markAllAsRead(userId) {
    if (!this.messagesRef) {
      throw new Error('Chat not initialized. Call initializeChat() first.');
    }

    try {
      const snapshot = await this.messagesRef
        .orderByChild('status')
        .equalTo('delivered')
        .once('value');

      const updates = {};
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        // Only mark messages from other users as read
        if (message.senderId !== userId) {
          updates[`${childSnapshot.key}/status`] = 'read';
        }
      });

      if (Object.keys(updates).length > 0) {
        await this.messagesRef.update(updates);
        console.log('All messages marked as read');
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.messagesRef) {
      this.messageListeners.forEach(({ type, listener }) => {
        this.messagesRef.off(type, listener);
      });
      this.messageListeners = [];
      console.log('Message listeners cleaned up');
    }
  }

  /**
   * Get chat metadata
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Chat metadata
   */
  async getChatMetadata(chatId) {
    try {
      const snapshot = await this.database.ref(`chats/${chatId}/metadata`).once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Error fetching chat metadata:', error);
      throw error;
    }
  }

  /**
   * Update chat metadata (e.g., last message, typing status)
   * @param {string} chatId - Chat ID
   * @param {Object} metadata - Metadata to update
   */
  async updateChatMetadata(chatId, metadata) {
    try {
      await this.database.ref(`chats/${chatId}/metadata`).update({
        ...metadata,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
      });
    } catch (error) {
      console.error('Error updating chat metadata:', error);
      throw error;
    }
  }

  /**
   * Set typing indicator
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {boolean} isTyping - Typing status
   */
  async setTypingStatus(chatId, userId, isTyping) {
    try {
      await this.database.ref(`chats/${chatId}/typing/${userId}`).set(isTyping ? {
        isTyping: true,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      } : null);
    } catch (error) {
      console.error('Error setting typing status:', error);
      throw error;
    }
  }

  /**
   * Listen for typing indicators
   * @param {string} chatId - Chat ID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onTypingStatusChanged(chatId, callback) {
    const typingRef = this.database.ref(`chats/${chatId}/typing`);
    
    const listener = typingRef.on('value', (snapshot) => {
      const typingUsers = [];
      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val()?.isTyping) {
          typingUsers.push(childSnapshot.key);
        }
      });
      callback(typingUsers);
    });

    return () => {
      typingRef.off('value', listener);
    };
  }

  /**
   * Mark message as delivered
   * @param {string} chatId - Chat ID
   * @param {string} messageId - Message ID
   */
  async markAsDelivered(chatId, messageId) {
    try {
      await this.database.ref(`chats/${chatId}/messages/${messageId}/status`).set('delivered');
      await this.database.ref(`chats/${chatId}/messages/${messageId}/deliveredAt`).set(firebase.database.ServerValue.TIMESTAMP);
    } catch (error) {
      console.error('Error marking message as delivered:', error);
    }
  }

  /**
   * Mark message as read
   * @param {string} chatId - Chat ID
   * @param {string} messageId - Message ID
   */
  async markAsRead(chatId, messageId) {
    try {
      await this.database.ref(`chats/${chatId}/messages/${messageId}/status`).set('read');
      await this.database.ref(`chats/${chatId}/messages/${messageId}/readAt`).set(firebase.database.ServerValue.TIMESTAMP);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  /**
   * Mark all messages in chat as read
   * @param {string} chatId - Chat ID
   * @param {string} userId - Current user ID
   */
  async markAllAsRead(chatId, userId) {
    try {
      const messagesSnapshot = await this.database.ref(`chats/${chatId}/messages`).once('value');
      const updates = {};
      
      messagesSnapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        // Only mark messages from other users
        if (message.senderId !== userId && message.status !== 'read') {
          updates[`${childSnapshot.key}/status`] = 'read';
          updates[`${childSnapshot.key}/readAt`] = firebase.database.ServerValue.TIMESTAMP;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await this.database.ref(`chats/${chatId}/messages`).update(updates);
      }
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  }
}

// Export the service
window.FirebaseMessageService = FirebaseMessageService;
