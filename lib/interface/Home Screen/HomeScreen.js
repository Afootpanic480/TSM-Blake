// HomeScreen.js
// Handles animation and button logic for the animated home screen

document.addEventListener('DOMContentLoaded', function() {
  const addFriendBtn = document.getElementById('homeAddFriendBtn');
  if (addFriendBtn) {
    addFriendBtn.addEventListener('click', function() {
      // Use the function that properly shows and resets the overlay
      if (typeof showAddFriendPopup === 'function') {
        showAddFriendPopup();
      }
    });
  }
});

// Function to switch friends sub-tabs without breaking the main UI
function switchFriendsTab(tab) {
  // Assuming the friends content is in an element with id 'friends-content'
  const friendsContent = document.getElementById('friends-content');
  if (!friendsContent) return;

  // Hide all sub-tabs content
  const subTabs = friendsContent.querySelectorAll('.friends-sub-tab');
  subTabs.forEach(t => t.style.display = 'none');

  // Show the selected sub-tab
  const targetTab = friendsContent.querySelector(`.friends-sub-tab[data-tab="${tab}"]`);
  if (targetTab) {
    targetTab.style.display = 'block';
  }
}

// Function to accept friend request
window.acceptFriendRequest = async function(username) {
  try {
    console.log('Accepting friend request for:', username);
    
    const myUUID = window.currentUserData?.uuid;
    if (!myUUID) {
      throw new Error('User not logged in or UUID not found');
    }
    
    const formData = new URLSearchParams();
    formData.append('action', 'accept');
    formData.append('myUUID', myUUID);
    formData.append('theirUsername', username);
    
    const response = await fetch(Acc_DenF, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Accept friend request response:', result);
    
    if (result.status === 'success') {
      showAlert('Friend request accepted!', 'success');
      // Refresh pending via integrated Friends view if available
      if (typeof showFriendsView === 'function') {
        showFriendsView('pending');
      } else if (typeof showPendingRequestsPopup === 'function') {
        showPendingRequestsPopup();
      }
    } else {
      showAlert('Failed to accept friend request: ' + (result.message || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error accepting friend request:', error);
    showAlert('Error accepting friend request: ' + error.message, 'error');
  }
};

// Function to decline friend request
window.declineFriendRequest = async function(username) {
  try {
    console.log('Declining friend request for:', username);
    
    const myUUID = window.currentUserData?.uuid;
    if (!myUUID) {
      throw new Error('User not logged in or UUID not found');
    }
    
    const formData = new URLSearchParams();
    formData.append('action', 'deny');
    formData.append('myUUID', myUUID);
    formData.append('theirUsername', username);
    
    const response = await fetch(Acc_DenF, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Decline friend request response:', result);
    
    if (result.status === 'success') {
      showAlert('Friend request declined.', 'info');
      // Refresh pending via integrated Friends view if available
      if (typeof showFriendsView === 'function') {
        showFriendsView('pending');
      } else if (typeof showPendingRequestsPopup === 'function') {
        showPendingRequestsPopup();
      }
    } else {
      showAlert('Failed to decline friend request: ' + (result.message || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Error declining friend request:', error);
    showAlert('Error declining friend request: ' + error.message, 'error');
  }
};