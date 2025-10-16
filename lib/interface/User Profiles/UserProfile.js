// UserProfile.js
// Pure JS user profile modal for your app
// Usage: showUserProfile({ username, avatarUrl, badge, email, bio })

(function() {
  // Remove any existing profile modal
  function removeUserProfile() {
    const modal = document.getElementById('userProfileModal');
    if (modal) modal.remove();
    document.body.style.overflow = '';
  }

  // Inject styles for the profile modal (only once)
  if (!document.getElementById('user-profile-style')) {
    const style = document.createElement('style');
    style.id = 'user-profile-style';
    style.textContent = `
      .user-profile-modal {
        position: fixed; inset: 0;
        display: flex; align-items: center; justify-content: center;
        background: rgba(6, 10, 30, 0.45);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 2147483646;
      }
      .user-profile-content {
        position: relative; width: min(460px, 92vw); max-height: 86vh; overflow: auto; box-sizing: border-box;
        background: rgba(21, 24, 35, 0.88);
        border: 1px solid rgba(114, 137, 218, 0.35);
        border-radius: 16px;
        box-shadow: 0 20px 80px rgba(0,0,0,0.50), 0 0 0 1px rgba(114, 137, 218, 0.20);
        color: #e5eaff;
        padding-top: calc(var(--banner-h) + var(--avatar)/2 + 0px);
      }
      .user-profile-content::-webkit-scrollbar { width: 10px; }
      .user-profile-content::-webkit-scrollbar-thumb { background: rgba(114,137,218,0.35); border-radius: 10px; }
      .close-profile {
        position: absolute; top: 10px; right: 10px;
        width: 32px; height: 32px; border: none; border-radius: 8px;
        background: transparent; color: #bfc4d1; font-size: 20px; cursor: pointer;
        transition: background .2s ease, color .2s ease;
      }
      .close-profile:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .profile-layout { display: none; }
      .profile-avatar-section { display: none; }
      .profile-avatar { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; border: 1px solid rgba(114,137,218,0.35); box-shadow: 0 6px 18px rgba(0,0,0,0.35); }
      .profile-avatar.status-online { box-shadow: 0 0 0 2px rgba(67,181,129,0.35), 0 10px 30px rgba(0,0,0,0.35); }
      .profile-avatar.status-away { box-shadow: 0 0 0 2px rgba(250,166,26,0.35), 0 10px 30px rgba(0,0,0,0.35); }
      .profile-avatar.status-offline { box-shadow: 0 0 0 2px rgba(185,185,185,0.35), 0 10px 30px rgba(0,0,0,0.35); }
      .profile-info { display: flex; flex-direction: column; gap: 2px; }
      .username-row { display: flex; align-items: center; gap: 3px; }
      .profile-username { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: .2px; }
      .profile-uname-badge .role-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); font-size: 12px; letter-spacing: .3px; }
      .badge-row { display: inline-flex; flex-wrap: wrap; gap: 4px; padding-top: 0; }
      .badge-row .role-badge { font-size: 10px; padding: 2px 6px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.10); opacity: .95; }
      .role-badge.cosmic.mod { background: rgba(114,137,218,0.18); color: #b7c3ff; border-color: rgba(114,137,218,0.35); }
      .role-badge.cosmic.tester { background: rgba(124,191,255,0.18); color: #cce7ff; border-color: rgba(124,191,255,0.35); }
      .role-badge.cosmic.bot { background: rgba(173,114,218,0.18); color: #e5ccff; border-color: rgba(173,114,218,0.35); }
      .role-badge.cosmic.owner { background: rgba(240,71,71,0.18); color: #ffd6d6; border-color: rgba(240,71,71,0.35); }
      .profile-bio { width: calc(0.9 * min(460px, 92vw)); box-sizing: border-box; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px 14px; min-height: 96px; max-width: none; margin: 0 auto; color: #cfd6ec; white-space: pre-wrap; word-break: break-word; }
      .profile-bio.empty { color: #9aa3c7; font-style: italic; text-align: left; }
      .profile-bio.editing { padding: 0; border: none; background: transparent; }
      .profile-bio-input { width: 100%; box-sizing: border-box; min-height: 120px; background: rgba(255,255,255,0.04); color: #e5eaff; border: 1px solid rgba(124,191,255,0.25); border-radius: 10px; padding: 12px; resize: vertical; overflow: auto; white-space: pre-wrap; word-break: break-word; }
      .profile-actions { display: flex; gap: 8px; margin-top: 4px; justify-content: flex-start; }
      .profile-action-btn { background: rgba(114,137,218,0.15); color: #e5eaff; border: 1px solid rgba(114,137,218,0.35); border-radius: 10px; padding: 9px 14px; font-size: 13px; cursor: pointer; white-space: nowrap; min-width: max-content; display: inline-flex; align-items: center; }
      .profile-action-btn.primary { background: #5865f2; border-color: #5865f2; color: #fff; }
      .profile-action-btn:hover { filter: brightness(1.05); }
      /* Banner header + overlapping avatar barrier */
      .user-profile-content { --banner-h: 120px; --avatar: 130px; --avatar-left: 32px; }
      .user-profile-content::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: var(--banner-h); border-radius: inherit; border-bottom-left-radius: 0; border-bottom-right-radius: 0; background: linear-gradient(135deg, var(--accent) 0%, var(--accent) 40%, rgba(0,0,0,0) 100%), radial-gradient(120% 120% at 100% 0, rgba(255,255,255,0.14), rgba(255,255,255,0) 60%); background-color: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.08); z-index: 0; }
      .profile-banner { display: none !important; }
      .avatar-wrap { position: absolute; left: var(--avatar-left); top: calc(var(--banner-h) - var(--avatar)/2); width: var(--avatar); height: var(--avatar); border-radius: 16px; padding: 4px; background: conic-gradient(from 0deg, var(--accent), rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.07) 60%, transparent 70%); box-shadow: 0 14px 30px rgba(0,0,0,0.48); z-index: 2; }
      .avatar-wrap .profile-avatar { width: 100%; height: 100%; border-radius: 12px; object-fit: cover; border: 1px solid rgba(255,255,255,0.18); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.25); }
    `;
    document.head.appendChild(style);
  }

  // Additional styling overlay (v2)
  if (!document.getElementById('user-profile-style-v2')) {
    const style2 = document.createElement('style');
    style2.id = 'user-profile-style-v2';
    style2.textContent = `
      :root { --accent: #7289da; }
      .user-profile-content { --accent: var(--accent); }
      .identity { position: absolute; top: calc(var(--banner-h) + 4px); left: calc(var(--avatar-left) + var(--avatar) + 16px); right: 16px; margin: 0; padding: 0; display: grid; gap: 0; text-align: left; z-index: 2; }
      .identity .profile-username { position: static !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; line-height: 1.0; margin: 0; }
      .identity .username-row { justify-content: flex-start; margin-bottom: -2px; }
      .profile-main, .profile-actions { max-width: none; width: auto; margin: 0; }
      /* Bio-focused main section */
      .profile-main { padding: 4px 0 12px; display: grid; grid-template-columns: 1fr; gap: 14px; margin: 0; }
      .profile-actions { margin: 0 16px; padding: 0; }
      .about-header { display:flex; align-items:center; justify-content:space-between; margin: 24px 0 2px; }
      .about-title { font-weight: 700; font-size: 16px; color: #e5eaff; letter-spacing: .3px; }
      .char-counter { font-size: 12px; color: #9fb3ff; }
      .profile-bio-save { display: block; margin: 10px auto 0; background: #5865f2; color: #fff; border: 1px solid #5865f2; border-radius: 10px; padding: 8px 14px; cursor: pointer; }
      .profile-bio-save:hover { filter: brightness(1.05); }
      /* Header dropdown */
      .profile-menu-wrap { position: relative; justify-self: end; }
      .profile-menu-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #e5eaff; cursor: pointer; }
      .profile-menu-btn:hover { filter: brightness(1.08); }
      .profile-menu { position: absolute; top: 36px; right: 0; min-width: 180px; padding: 6px; border-radius: 10px; background: rgba(27,30,43,0.98); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 10px 30px rgba(0,0,0,0.45); z-index: 10; display: none; }
      .profile-menu-item { width: 100%; text-align: left; background: transparent; border: none; color: #e5eaff; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
      .profile-menu-item:hover { background: rgba(255,255,255,0.06); }
      .profile-menu-item.danger { color: #ffb3b3; }
      /* Meta row under username */
      .meta-row { display: flex; align-items: center; gap: 3px; min-height: 18px; margin-top: -2px; }
      .handle { font-size: 14px; color: #aeb6d4; opacity: .98; display: inline-block; transform: translateY(-2px); }
      .profile-uname-badge.display-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.25); position: relative; }
      .profile-uname-badge.display-badge:hover::after { content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.9); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; white-space: nowrap; z-index: 20; pointer-events: none; opacity: 0; animation: fadeIn 0.2s ease forwards; }
      .profile-uname-badge.display-badge .perm-icon { width: 16px; height: 16px; }
      .profile-actions.under-avatar { position: relative; left: -140px; width: auto; justify-content: flex-start !important; margin-top: 12px; padding-left: 24px; z-index: 3; }
      .meta-sep { opacity: .45; color: #aeb6d4; }
      /* Minimal role badges in meta row */
      .meta-row .role-badge { background: transparent !important; border: none !important; padding: 4px; font-size: 10px; display: inline-flex; align-items: center; gap: 2px; border-radius: 8px; }
      .meta-row .role-badge::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; }
      .meta-row .role-badge.cosmic.mod::before { background: #7289da; }
      .meta-row .role-badge.cosmic.tester::before { background: #7cf; }
      .meta-row .role-badge.cosmic.owner::before { background: #f04747; }
      .meta-row .role-badge.cosmic.bot::before { background: #ad72da; }
      /* SVG permission icons */
      .badge-row .perm-icon { width: 20px; height: 20px; display: inline-block; margin-left: 2px; }
      .perm-icon.mod { fill: #7289da; }
      .perm-icon.tester { fill: #7cf; }
      .perm-icon.owner { fill: #f04747; }
      .perm-icon.bot { fill: #ad72da; }
      @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(5px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    `;
    document.head.appendChild(style2);
  }

  // Map permissions to SVG icon HTML (color keyed by class)
  const badgeMap = {
    // Shield (MOD)
    MOD: '<svg class="perm-icon mod" viewBox="0 0 16 16" aria-label="Moderator"><path d="M8 1l5 2v4c0 3.7-2.7 6.3-5 7.6C5.7 13.3 3 10.7 3 7V3l5-2z"/></svg>',
    // Beaker (TESTER)
    TESTER: '<svg class="perm-icon tester" viewBox="0 0 16 16" aria-label="Tester"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    // Robot head (BOT)
    BOT: '<svg class="perm-icon bot" viewBox="0 0 16 16" aria-label="Bot"><rect x="3" y="5" width="10" height="7" rx="2"/><circle cx="7" cy="8.5" r="1.2"/><circle cx="11" cy="8.5" r="1.2"/></svg>',
    // Crown (OWNER)
    OWNER: '<svg class="perm-icon owner" viewBox="0 0 16 16" aria-label="Owner"><path d="M8 1l2.5 5 5.5.5-4 4 1 5.5L8 13l-5 2.5 1-5.5-4-4 5.5-.5z"/></svg>'
  };

  // Fetch user permission from GAS
  async function fetchUserPermission(username) {
    try {
      const url = new URL(permissionCheck);
      url.searchParams.append('username', username);
      console.log('Fetching permission from:', url.toString());
      
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        console.error('Permission fetch failed:', response.status, await response.text());
        return 'DEFAULT';
      }
      
      const data = await response.json();
      console.log('Permission fetch response:', data);
      return data.status === 'success' ? (data.permission || 'DEFAULT') : 'DEFAULT';
    } catch (error) {
      console.error('Error fetching permission:', error);
      showAlert("Error fetching permission. Error: " + error, "error");
      return 'DEFAULT';
    }
  }

  // Fetch user bio from GAS
  async function fetchUserBio(username) {
    console.log('fetchUserBio called with username:', username);
    try {
      const url = new URL(bioHandler);
      url.searchParams.append('action', 'getBio');
      url.searchParams.append('username', username);
      console.log('Fetching bio from:', url.toString());
      
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        console.error('Bio fetch failed:', response.status, await response.text());
        return '';
      }
      
      const data = await response.json();
      console.log('Bio fetch response:', data);
      return data.status === 'success' ? (data.bio || '') : '';
    } catch (error) {
      console.error('Error fetching bio:', error);
      return '';
    }
  }

  // Fetch user emails from GAS (returns array of emails)
  async function fetchUserEmails(username, userUUID) {
    console.log('fetchUserEmails called with username:', username, 'UUID:', userUUID);
    try {
      if (!userEmails || userEmails.includes('REPLACE_WITH_DEPLOYED_USER_EMAILS_URL')) {
        throw new Error('User emails endpoint URL is not configured');
      }

      const url = new URL(userEmails);
      url.searchParams.append('action', 'getUserEmails');
      url.searchParams.append('username', username);
      url.searchParams.append('uuid', userUUID);
      console.log('Fetching emails from:', url.toString());

      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        console.error('Emails fetch failed:', response.status, await response.text());
        return [];
      }

      const data = await response.json();
      console.log('Emails fetch response:', data);
      return data.status === 'success' ? (data.emails || []) : [];
    } catch (error) {
      console.error('Error fetching emails:', error);
      return [];
    }
  }

  // Save user bio to GAS
  async function saveUserBio(uuid, bio) {
    try {
      if (!bioHandler || bioHandler.includes('YOUR_BIO_ENDPOINT_URL_HERE')) {
        throw new Error('Bio endpoint URL is not configured in gas.js');
      }
      if (!uuid) {
        throw new Error('UUID is missing or undefined');
      }
      const formData = new URLSearchParams();
      formData.append('action', 'setBio');
      formData.append('uuid', uuid);
      formData.append('bio', bio);
      
      console.log('Saving bio to:', bioHandler, 'with UUID:', uuid, 'bio:', bio);
      const response = await fetch(bioHandler, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        console.error('Bio save failed:', response.status, await response.text());
        return false;
      }
      
      const data = await response.json();
      console.log('Bio save response:', data);
      return data.status === 'success';
    } catch (error) {
      console.error('Error saving bio:', error.message);
    }
  }

  // Show the user profile modal with badge beside username
  window.showUserProfile = function({ username, avatarUrl, badge, email, bio }) {
    console.log('showUserProfile called with:', { username, avatarUrl, badge, email, bio });

    if (!window.profileOpenTriggered) {
      console.log('profileOpenTriggered is false, returning early');
      return;
    }
    console.log('profileOpenTriggered is true, proceeding...');
    window.profileOpenTriggered = false;

    if (document.getElementById('userProfileModal')) {
      console.log('userProfileModal already exists, returning early');
      return;
    }
    removeUserProfile();

    const isOwnProfile = window.currentUserData && window.currentUserData.username === username;

    const modal = document.createElement('div');
    modal.id = 'userProfileModal';
    modal.className = 'user-profile-modal';
    modal.tabIndex = -1;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const content = document.createElement('div');
    content.className = 'user-profile-content';
    

    const avatarSection = document.createElement('div');
    avatarSection.className = 'profile-avatar-section';
    const avatarImg = document.createElement('img');
    avatarImg.className = 'profile-avatar';
    avatarImg.src = avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username || 'user')}`;
    avatarImg.alt = username ? `${username}'s avatar` : 'User avatar';
    // No status ring/glow for simplified header
    avatarSection.appendChild(avatarImg);

    const info = document.createElement('div');
    info.className = 'profile-info';

    const unameRow = document.createElement('div');
    unameRow.className = 'username-row';
    const uname = document.createElement('span');
    uname.className = 'profile-username';
    uname.textContent = username || 'User';
    unameRow.appendChild(uname);
    const unameBadge = document.createElement('span');
    unameBadge.className = 'profile-uname-badge';
    unameBadge.innerHTML = '<span class="badge-spinner"></span>';
    unameRow.appendChild(unameBadge);
    info.appendChild(unameRow);
    // Store references to elements that need updating
    const profileElements = {};
    let bioDiv = null;
    let bioInput = null;

    const bioSection = document.createElement('div');
    bioSection.className = 'profile-bio';
    bioSection.textContent = 'Loading bio...';
    bioDiv = bioSection;
    info.appendChild(bioSection);

    // Actions row: message, copy username, close
    const actionsRow = document.createElement('div');
    actionsRow.className = 'profile-actions';
    const messageBtn = document.createElement('button');
    messageBtn.className = 'profile-action-btn primary';
    messageBtn.textContent = 'Message';
    messageBtn.onclick = () => {
      try {
        if (typeof openConversation === 'function') {
          // Fallback avatar index derived from username for deterministic value
          const idx = Math.abs((username || '').split('').reduce((a,c)=>a + c.charCodeAt(0), 0)) % 10;
          openConversation(username, idx);
          removeUserProfile();
        } else {
          showAlert('Messaging is not available here.', 'warning');
        }
      } catch (e) {
        showAlert('Could not open conversation.', 'error');
      }
    };
    if (isOwnProfile) messageBtn.style.display = 'none';
    actionsRow.appendChild(messageBtn);
    info.appendChild(actionsRow);

    // BANNER + AVATAR + IDENTITY BLOCK
    const banner = document.createElement('div');
    banner.className = 'profile-banner';
    content.appendChild(banner);
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'avatar-wrap';
    avatarWrap.appendChild(avatarImg);
    content.appendChild(avatarWrap);
    const nameBox = document.createElement('div');
    nameBox.className = 'identity';
    nameBox.appendChild(unameRow);
    // Meta row: handle + badges inline
    const metaRow = document.createElement('div');
    metaRow.className = 'meta-row';
    const handleSpan = document.createElement('span');
    handleSpan.className = 'handle';
    handleSpan.textContent = `@${username || 'user'}`;
    const badgeRow = document.createElement('div');
    badgeRow.className = 'badge-row';
    metaRow.appendChild(handleSpan);
    metaRow.appendChild(badgeRow);
    nameBox.appendChild(metaRow);
    content.appendChild(nameBox);

    // MAIN CONTENT (Bio-focused)
    const main = document.createElement('div');
    main.className = 'profile-main';
    const aboutHeader = document.createElement('div');
    aboutHeader.className = 'about-header';
    const aboutTitle = document.createElement('div');
    aboutTitle.className = 'about-title';
    aboutTitle.textContent = 'About Me';
    aboutHeader.appendChild(aboutTitle);
    main.appendChild(aboutHeader);
    // Move bio into main; place actions under avatar
    try { if (bioSection.parentNode) bioSection.parentNode.removeChild(bioSection); } catch(_){ }
    main.appendChild(bioSection);
    try { if (actionsRow.parentNode) actionsRow.parentNode.removeChild(actionsRow); } catch(_){ }
    actionsRow.classList.add('under-avatar');
    try { content.insertBefore(actionsRow, main); } catch(_) { content.appendChild(actionsRow); }
    // Actions row additions: Edit Profile for self, dropdown menu for both
    if (isOwnProfile) {
      const editBtn = document.createElement('button');
      editBtn.className = 'profile-action-btn';
      editBtn.textContent = 'Edit Profile';
      editBtn.onclick = () => {
        try {
          if (typeof openSettings === 'function') openSettings('profile');
          else if (typeof openSettingsModal === 'function') openSettingsModal('profile');
          else if (typeof openUserSettings === 'function') openUserSettings('profile');
          else if (typeof showSettings === 'function') showSettings('profile');
          else if (typeof navigateTo === 'function') navigateTo('settings/profile');
          else window.location.hash = '#settings/profile';
        } finally {
          removeUserProfile();
        }
      };
      actionsRow.prepend(editBtn);
    }
    // Dropdown menu in actions row
    const menuWrap = document.createElement('div');
    menuWrap.className = 'profile-menu-wrap';
    const menuBtn = document.createElement('button');
    menuBtn.className = 'profile-menu-btn';
    menuBtn.setAttribute('aria-label', 'Open profile menu');
    menuBtn.textContent = '⋯';
    const menu = document.createElement('div');
    menu.className = 'profile-menu';
    const copyItem = document.createElement('button');
    copyItem.className = 'profile-menu-item';
    copyItem.textContent = 'Copy Username';
    copyItem.onclick = async () => {
      try { await navigator.clipboard.writeText(username || ''); showAlert('Username copied', 'success'); }
      catch { showAlert('Failed to copy username', 'error'); }
      menu.style.display = 'none';
    };
    menu.appendChild(copyItem);
    if (!isOwnProfile) {
      const removeItem = document.createElement('button');
      removeItem.className = 'profile-menu-item';
      removeItem.textContent = 'Remove Friend';
      removeItem.onclick = async () => {
        try {
          if (typeof removeFriend === 'function') { await removeFriend(username); showAlert('Friend removed', 'success'); }
          else { showAlert('Remove friend unavailable', 'warning'); }
        } catch { showAlert('Failed to remove friend', 'error'); }
        menu.style.display = 'none';
      };
      menu.appendChild(removeItem);
      const blockItem = document.createElement('button');
      blockItem.className = 'profile-menu-item danger';
      blockItem.textContent = 'Block';
      blockItem.onclick = async () => {
        try {
          if (typeof blockUser === 'function') { await blockUser(username); showAlert('User blocked', 'success'); }
          else { showAlert('Block unavailable', 'warning'); }
        } catch { showAlert('Failed to block user', 'error'); }
        menu.style.display = 'none';
      };
      menu.appendChild(blockItem);
    }
    menuWrap.appendChild(menuBtn);
    menuWrap.appendChild(menu);
    actionsRow.appendChild(menuWrap);
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    });
    content.addEventListener('click', (e) => {
      if (!menuWrap.contains(e.target)) menu.style.display = 'none';
    });
    content.appendChild(main);

    // Compose modal content and attach to body
    modal.appendChild(content);
    console.log('About to append modal to document.body');
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    console.log('Modal appended to DOM, modal element:', modal);
    async function updateProfileData() {
      console.log('updateProfileData called');
      const userPermission = badge || await fetchUserPermission(username);
      // Allow multiple permissions: array JSON or pipe/comma/space-separated
      let perms = [];
      if (Array.isArray(userPermission)) perms = userPermission;
      else if (typeof userPermission === 'string') {
        try {
          const parsed = JSON.parse(userPermission);
          if (Array.isArray(parsed)) perms = parsed; else perms = userPermission.split(/[|,\s]+/);
        } catch { perms = userPermission.split(/[|,\s]+/); }
      }
      perms = perms.map(p => String(p || '').toUpperCase()).filter(Boolean);
      const primary = perms[0];
      const rest = perms.slice(1);
      const primaryIcon = primary ? badgeMap[primary] : '';
      if (primaryIcon) {
        unameBadge.classList.add('display-badge');
        unameBadge.innerHTML = primaryIcon;
        const tooltipMap = { MOD: 'Moderator', TESTER: 'Tester', BOT: 'Bot', OWNER: 'Owner' };
        unameBadge.setAttribute('data-tooltip', tooltipMap[primary] || primary);
        unameBadge.style.display = 'inline-flex';
      } else {
        unameBadge.classList.remove('display-badge');
        unameBadge.innerHTML = '';
        unameBadge.style.display = 'none';
      }
      const iconsHTML = rest.map(p => badgeMap[p]).filter(Boolean).join('');
      badgeRow.innerHTML = iconsHTML;
      badgeRow.style.display = iconsHTML ? 'inline-flex' : 'none';
      // Accent color by permission
      try {
        const accentMap = { MOD: '#7289da', TESTER: '#7cf', OWNER: '#f04747', BOT: '#ad72da', DEFAULT: '#7289da' };
        const accent = accentMap[perms[0]] || accentMap.DEFAULT;
        content.style.setProperty('--accent', accent);
      } catch (_) {}
      // Bio
      const fetchedBio = await fetchUserBio(username);
      bioDiv.textContent = fetchedBio || 'No bio set';
      console.log('updateProfileData finished');
    }
    // Kick off async data fetching to hydrate UI
    updateProfileData();

    // Allow external updates to badge without reopening
    window.refreshUserProfileBadge = function(targetUsername, permission) {
      if (targetUsername === username) {
        let perms = [];
        if (Array.isArray(permission)) perms = permission;
        else if (typeof permission === 'string') perms = permission.split(/[|,\s]+/);
        perms = perms.map(p => String(p).toUpperCase());
        const iconsHTML2 = perms.map(p => badgeMap[p]).filter(Boolean).join('');
        badgeRow.innerHTML = iconsHTML2;
        badgeRow.style.display = iconsHTML2 ? 'inline-flex' : 'none';
      }
    };

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') removeUserProfile();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) removeUserProfile();
    });
  };

  if (!document.getElementById('profile-badge-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'profile-badge-spinner-style';
    style.textContent = `
      .badge-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #eee;
        border-top: 2px solid #5865f2;
        border-radius: 50%;
        animation: badgeSpin 0.8s linear infinite;
      }
      @keyframes badgeSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
})();