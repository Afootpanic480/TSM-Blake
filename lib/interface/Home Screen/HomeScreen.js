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
