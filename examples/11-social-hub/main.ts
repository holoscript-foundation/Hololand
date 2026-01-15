/**
 * Hololand Example 11 - Social Hub
 *
 * Demonstrates the complete @hololand/social v2.0 feature set:
 * - Friend system (requests, blocking, favorites)
 * - Party system (creation, invites, voice integration)
 * - Emote system (built-in emotes, gestures)
 * - Notification system (preferences, status, activity)
 *
 * This example creates a social dashboard showing all social features
 * integrated together in a cohesive UI.
 */

import {
  FriendSystem,
  PartySystem,
  EmoteSystem,
  NotificationSystem,
  createFriendSystem,
  createPartySystem,
  createEmoteSystem,
  createNotificationSystem,
  HOLOLAND_SOCIAL_VERSION,
  type Friend,
  type FriendRequest,
  type BlockedUser,
  type Party,
  type PartyInvite,
  type Emote,
  type Notification,
  type PresenceStatus,
} from '@hololand/social';

// ============================================================================
// Types
// ============================================================================

type FriendTab = 'all' | 'online' | 'requests' | 'blocked';

// ============================================================================
// State
// ============================================================================

const state = {
  userId: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  userName: `Player${Math.floor(Math.random() * 10000)}`,
  userColor: getRandomColor(),
  currentTab: 'all' as FriendTab,
  searchQuery: '',
};

// ============================================================================
// Initialize Social Systems
// ============================================================================

console.log(`Hololand Social v${HOLOLAND_SOCIAL_VERSION}`);

const friendSystem = createFriendSystem(state.userId, state.userName);
const partySystem = createPartySystem(state.userId, state.userName);
const emoteSystem = createEmoteSystem(state.userId, state.userName);
const notifications = createNotificationSystem(state.userId);

// ============================================================================
// UI Elements
// ============================================================================

const elements = {
  userName: document.getElementById('user-name')!,
  userAvatar: document.getElementById('user-avatar')!,
  userStatusText: document.getElementById('user-status-text')!,
  friendCount: document.getElementById('friend-count')!,
  friendSearch: document.getElementById('friend-search') as HTMLInputElement,
  friendList: document.getElementById('friend-list')!,
  myParty: document.getElementById('my-party')!,
  noPartyCard: document.getElementById('no-party-card')!,
  invitesSection: document.getElementById('invites-section')!,
  inviteCount: document.getElementById('invite-count')!,
  partyInvites: document.getElementById('party-invites')!,
  emoteGrid: document.getElementById('emote-grid')!,
  notifCount: document.getElementById('notif-count')!,
  notificationList: document.getElementById('notification-list')!,
  statusMessage: document.getElementById('status-message') as HTMLInputElement,
  createPartyModal: document.getElementById('create-party-modal')!,
  partyNameInput: document.getElementById('party-name-input') as HTMLInputElement,
  partyPrivacySelect: document.getElementById('party-privacy-select') as HTMLSelectElement,
  partySizeSelect: document.getElementById('party-size-select') as HTMLSelectElement,
};

// ============================================================================
// Demo Data
// ============================================================================

function setupDemoData(): void {
  // Add some demo friends
  const demoFriends = [
    { id: 'friend_1', name: 'AlexBuilder', status: 'online' as PresenceStatus },
    { id: 'friend_2', name: 'SarahCreator', status: 'online' as PresenceStatus },
    { id: 'friend_3', name: 'MikeExplorer', status: 'away' as PresenceStatus },
    { id: 'friend_4', name: 'EmilyArtist', status: 'busy' as PresenceStatus },
    { id: 'friend_5', name: 'JohnGamer', status: 'offline' as PresenceStatus },
    { id: 'friend_6', name: 'LisaDancer', status: 'online' as PresenceStatus },
    { id: 'friend_7', name: 'TomArchitect', status: 'offline' as PresenceStatus },
    { id: 'friend_8', name: 'AnnaSocial', status: 'online' as PresenceStatus },
  ];

  demoFriends.forEach((f) => {
    // Simulate adding friends directly to friend system
    (friendSystem as any).friends.set(f.id, {
      odId: f.id,
      displayName: f.name,
      status: f.status,
      addedAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      isFavorite: Math.random() > 0.7,
      lastSeen: f.status === 'offline' ? Date.now() - Math.random() * 48 * 60 * 60 * 1000 : Date.now(),
      statusMessage: getRandomStatusMessage(),
    });
  });

  // Add some pending friend requests
  const requests = [
    { id: 'req_1', name: 'NewFriend123', message: 'Hey! Met you in the plaza!' },
    { id: 'req_2', name: 'CoolBuilder99', message: 'Love your creations!' },
  ];

  requests.forEach((r) => {
    (friendSystem as any).pendingRequests.set(r.id, {
      id: `req_${r.id}`,
      fromUserId: r.id,
      fromDisplayName: r.name,
      toUserId: state.userId,
      toDisplayName: state.userName,
      message: r.message,
      status: 'pending',
      createdAt: Date.now() - Math.random() * 60 * 60 * 1000,
    });
  });

  // Add a blocked user
  (friendSystem as any).blockedUsers.set('blocked_1', {
    userId: 'blocked_1',
    displayName: 'TrollUser',
    blockedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    reason: 'Spam',
  });

  // Add some party invites
  const invites = [
    { id: 'inv_1', partyName: 'Building Crew', from: 'AlexBuilder', members: 3 },
    { id: 'inv_2', partyName: 'Dance Party', from: 'LisaDancer', members: 5 },
  ];

  invites.forEach((inv) => {
    (partySystem as any).pendingInvites.set(inv.id, {
      id: inv.id,
      partyId: `party_${inv.id}`,
      partyName: inv.partyName,
      fromUserId: `user_${inv.from}`,
      fromDisplayName: inv.from,
      toUserId: state.userId,
      toDisplayName: state.userName,
      createdAt: Date.now() - Math.random() * 30 * 60 * 1000,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  });

  // Add some notifications
  notifications.notifyFriendRequest('NewFriend123', 'req_1');
  notifications.notifyPartyInvite('AlexBuilder', 'Building Crew', 'inv_1');
  notifications.notifyAchievement('First Party!', 'Created your first party');
  notifications.notifyFriendOnline('SarahCreator', 'friend_2');
  notifications.notifySystem('Welcome!', 'Welcome to the Social Hub demo');
}

// ============================================================================
// Event Handlers
// ============================================================================

// Friend System Events
friendSystem.on('friendAdded', (data) => {
  notifications.push({
    type: 'friend_accepted',
    title: 'Friend Added',
    message: `You are now friends with ${data.friend.displayName}`,
    priority: 'normal',
  });
  renderFriendList();
  renderNotifications();
});

friendSystem.on('friendRemoved', (data) => {
  renderFriendList();
});

friendSystem.on('friendRequestReceived', (data) => {
  notifications.notifyFriendRequest(data.request.fromDisplayName, data.request.id);
  renderFriendList();
  renderNotifications();
});

// Party System Events
partySystem.on('partyCreated', (data) => {
  notifications.push({
    type: 'system',
    title: 'Party Created',
    message: `Party "${data.party.name}" is ready!`,
    priority: 'normal',
  });
  renderPartySection();
  renderNotifications();
});

partySystem.on('partyJoined', (data) => {
  renderPartySection();
});

partySystem.on('partyLeft', () => {
  renderPartySection();
});

partySystem.on('partyInviteReceived', (data) => {
  notifications.notifyPartyInvite(
    data.invite.fromDisplayName,
    data.invite.partyName,
    data.invite.id
  );
  renderPartySection();
  renderNotifications();
});

// Emote System Events
emoteSystem.on('emotePerformed', (data) => {
  console.log('Emote performed:', data.emote);
  showEmoteAnimation(data.emote.emoteId);
});

// Notification System Events
notifications.on('notificationReceived', () => {
  renderNotifications();
});

notifications.on('notificationRead', () => {
  renderNotifications();
});

// ============================================================================
// Rendering Functions
// ============================================================================

function renderUserProfile(): void {
  elements.userName.textContent = state.userName;
  elements.userAvatar.textContent = state.userName[0].toUpperCase();
  elements.userAvatar.style.background = `linear-gradient(135deg, ${state.userColor}, ${adjustColor(state.userColor, -20)})`;
}

function renderFriendList(): void {
  const friends = friendSystem.getFriends();
  const requests = friendSystem.getPendingRequests().filter((r) => r.toUserId === state.userId);
  const blocked = friendSystem.getBlockedUsers();

  // Update count
  elements.friendCount.textContent = String(friends.length);

  // Clear list
  elements.friendList.innerHTML = '';

  let itemsToRender: Array<{ type: 'friend' | 'request' | 'blocked'; data: Friend | FriendRequest | BlockedUser }> = [];

  switch (state.currentTab) {
    case 'all':
      itemsToRender = friends.map((f) => ({ type: 'friend' as const, data: f }));
      break;
    case 'online':
      itemsToRender = friendSystem.getOnlineFriends().map((f) => ({ type: 'friend' as const, data: f }));
      break;
    case 'requests':
      itemsToRender = requests.map((r) => ({ type: 'request' as const, data: r }));
      break;
    case 'blocked':
      itemsToRender = blocked.map((b) => ({ type: 'blocked' as const, data: b }));
      break;
  }

  // Filter by search
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    itemsToRender = itemsToRender.filter((item) => {
      const name = item.type === 'friend'
        ? (item.data as Friend).displayName
        : item.type === 'request'
          ? (item.data as FriendRequest).fromDisplayName
          : (item.data as BlockedUser).displayName;
      return name.toLowerCase().includes(query);
    });
  }

  if (itemsToRender.length === 0) {
    elements.friendList.innerHTML = `
      <div style="text-align: center; color: #666; padding: 30px;">
        ${state.currentTab === 'requests' ? 'No pending requests' :
          state.currentTab === 'blocked' ? 'No blocked users' :
          state.currentTab === 'online' ? 'No friends online' :
          'No friends yet'}
      </div>
    `;
    return;
  }

  itemsToRender.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'friend-card';

    if (item.type === 'friend') {
      const friend = item.data as Friend;
      el.innerHTML = `
        <div class="friend-avatar" style="background: ${getColorFromName(friend.displayName)}">
          ${friend.displayName[0].toUpperCase()}
          <span class="status-dot ${friend.status}"></span>
        </div>
        <div class="friend-info">
          <div class="friend-name">${friend.displayName}${friend.isFavorite ? ' ⭐' : ''}</div>
          <div class="friend-status-text">${friend.statusMessage || getStatusText(friend.status)}</div>
        </div>
        <div class="friend-actions">
          <button class="friend-action-btn" data-action="message" data-id="${friend.odId}" title="Message">💬</button>
          <button class="friend-action-btn" data-action="invite" data-id="${friend.odId}" title="Invite to Party">🎉</button>
          <button class="friend-action-btn" data-action="favorite" data-id="${friend.odId}" title="Toggle Favorite">${friend.isFavorite ? '⭐' : '☆'}</button>
        </div>
      `;
    } else if (item.type === 'request') {
      const request = item.data as FriendRequest;
      el.innerHTML = `
        <div class="friend-avatar" style="background: ${getColorFromName(request.fromDisplayName)}">
          ${request.fromDisplayName[0].toUpperCase()}
        </div>
        <div class="friend-info">
          <div class="friend-name">${request.fromDisplayName}</div>
          <div class="friend-status-text">${request.message || 'Wants to be your friend'}</div>
        </div>
        <div class="friend-actions">
          <button class="friend-action-btn" data-action="accept" data-id="${request.id}" title="Accept" style="background: rgba(74, 222, 128, 0.2); color: #4ade80;">✓</button>
          <button class="friend-action-btn" data-action="reject" data-id="${request.id}" title="Reject" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">✕</button>
        </div>
      `;
    } else {
      const blocked = item.data as BlockedUser;
      el.innerHTML = `
        <div class="friend-avatar" style="background: #666">
          ${blocked.displayName[0].toUpperCase()}
        </div>
        <div class="friend-info">
          <div class="friend-name">${blocked.displayName}</div>
          <div class="friend-status-text">Blocked${blocked.reason ? `: ${blocked.reason}` : ''}</div>
        </div>
        <div class="friend-actions">
          <button class="friend-action-btn" data-action="unblock" data-id="${blocked.userId}" title="Unblock">🔓</button>
        </div>
      `;
    }

    elements.friendList.appendChild(el);
  });

  // Add event listeners for actions
  elements.friendList.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      handleFriendAction(action!, id!);
    });
  });
}

function handleFriendAction(action: string, id: string): void {
  switch (action) {
    case 'accept':
      friendSystem.acceptFriendRequest(id);
      break;
    case 'reject':
      friendSystem.rejectFriendRequest(id);
      break;
    case 'favorite':
      const friend = friendSystem.getFriends().find((f) => f.odId === id);
      if (friend) {
        friendSystem.setFavorite(id, !friend.isFavorite);
      }
      break;
    case 'invite':
      if (partySystem.getCurrentParty()) {
        const friend = friendSystem.getFriends().find((f) => f.odId === id);
        if (friend) {
          partySystem.sendInvite(friend.odId, friend.displayName);
          notifications.push({
            type: 'system',
            title: 'Invite Sent',
            message: `Invited ${friend.displayName} to your party`,
            priority: 'low',
          });
        }
      } else {
        notifications.push({
          type: 'system',
          title: 'No Party',
          message: 'Create a party first to invite friends',
          priority: 'normal',
        });
      }
      break;
    case 'unblock':
      friendSystem.unblockUser(id);
      break;
  }
  renderFriendList();
  renderNotifications();
}

function renderPartySection(): void {
  const currentParty = partySystem.getCurrentParty();
  const invites = partySystem.getPendingInvites();

  // Show/hide invites section
  if (invites.length > 0) {
    elements.invitesSection.style.display = 'block';
    elements.inviteCount.textContent = String(invites.length);
    renderPartyInvites(invites);
  } else {
    elements.invitesSection.style.display = 'none';
  }

  // Render current party
  if (currentParty) {
    elements.noPartyCard.style.display = 'none';
    elements.myParty.innerHTML = createPartyCardHtml(currentParty, true);

    // Add event listeners
    elements.myParty.querySelector('[data-action="leave"]')?.addEventListener('click', () => {
      partySystem.leaveParty();
    });

    elements.myParty.querySelector('[data-action="settings"]')?.addEventListener('click', () => {
      // Open party settings
    });
  } else {
    elements.noPartyCard.style.display = 'block';
  }
}

function renderPartyInvites(invites: PartyInvite[]): void {
  elements.partyInvites.innerHTML = invites.map((invite) => `
    <div class="party-card">
      <div class="party-header">
        <span class="party-name">${invite.partyName}</span>
        <span class="party-badge invite">Invite</span>
      </div>
      <div class="party-activity">
        From ${invite.fromDisplayName}
      </div>
      <div class="party-actions">
        <button class="party-btn secondary" data-action="decline" data-id="${invite.id}">Decline</button>
        <button class="party-btn primary" data-action="join" data-id="${invite.id}">Join</button>
      </div>
    </div>
  `).join('');

  // Add event listeners
  elements.partyInvites.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (action === 'join') {
        partySystem.acceptInvite(id!);
      } else {
        partySystem.declineInvite(id!);
      }
      renderPartySection();
    });
  });
}

function createPartyCardHtml(party: Party, isCurrentParty: boolean): string {
  const memberAvatars = party.members.slice(0, 4).map((m) => `
    <div class="party-member-avatar" style="background: ${getColorFromName(m.displayName)}" title="${m.displayName}">
      ${m.displayName[0].toUpperCase()}
    </div>
  `).join('');

  const remainingCount = party.members.length > 4 ? party.members.length - 4 : 0;

  const privacyBadges: Record<string, string> = {
    public: 'public',
    friends: 'private',
    invite: 'invite',
  };

  return `
    <div class="party-card ${isCurrentParty ? 'active' : ''}">
      <div class="party-header">
        <span class="party-name">${party.name}</span>
        <span class="party-badge ${privacyBadges[party.privacy]}">${party.privacy}</span>
      </div>
      <div class="party-members">
        ${memberAvatars}
        ${remainingCount > 0 ? `<div class="party-member-count">+${remainingCount}</div>` : ''}
      </div>
      <div class="party-activity">
        ${party.members.length}/${party.maxSize} members ${party.voiceEnabled ? '• Voice enabled' : ''}
      </div>
      <div class="party-actions">
        ${isCurrentParty ? `
          <button class="party-btn secondary" data-action="settings">Settings</button>
          <button class="party-btn primary" data-action="leave">Leave Party</button>
        ` : `
          <button class="party-btn primary" data-action="join" data-id="${party.id}">Join</button>
        `}
      </div>
    </div>
  `;
}

function renderEmoteGrid(): void {
  const emotes = emoteSystem.getEmotes();

  elements.emoteGrid.innerHTML = emotes.map((emote) => `
    <button class="emote-btn ${emote.unlocked ? '' : 'locked'}" data-emote="${emote.id}" ${emote.unlocked ? '' : 'disabled'}>
      <span class="emote-icon">${emote.icon}</span>
      <span class="emote-name">${emote.name}</span>
    </button>
  `).join('');

  // Add event listeners
  elements.emoteGrid.querySelectorAll('[data-emote]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const emoteId = btn.getAttribute('data-emote');
      try {
        emoteSystem.playEmote(emoteId!);
      } catch (e) {
        console.error('Emote error:', e);
      }
    });
  });
}

function showEmoteAnimation(emoteId: string): void {
  const emote = emoteSystem.getEmote(emoteId);
  if (!emote) return;

  // Create floating emote animation
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 5rem;
    z-index: 9999;
    animation: emoteFloat 1s ease-out forwards;
    pointer-events: none;
  `;
  el.textContent = emote.icon;

  // Add animation keyframes
  if (!document.getElementById('emote-animations')) {
    const style = document.createElement('style');
    style.id = 'emote-animations';
    style.textContent = `
      @keyframes emoteFloat {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        30% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        100% { transform: translate(-50%, -150%) scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function renderNotifications(): void {
  const notifs = notifications.getNotifications();
  const unreadCount = notifications.getUnreadCount();

  elements.notifCount.textContent = String(unreadCount);

  if (notifs.length === 0) {
    elements.notificationList.innerHTML = `
      <div style="text-align: center; color: #666; padding: 30px;">
        No notifications
      </div>
    `;
    return;
  }

  const iconMap: Record<string, string> = {
    friend_request: '👋',
    friend_accepted: '🤝',
    friend_online: '🟢',
    party_invite: '🎉',
    party_joined: '🎊',
    achievement: '🏆',
    system: '📢',
    message: '💬',
    mention: '@',
  };

  elements.notificationList.innerHTML = notifs.map((notif) => `
    <div class="notification-card ${notif.type} ${notif.read ? '' : 'unread'}" data-notif-id="${notif.id}">
      <div class="notification-icon ${notif.type}">
        ${iconMap[notif.type] || '📌'}
      </div>
      <div class="notification-content">
        <div class="notification-title">${notif.title}</div>
        <div class="notification-message">${notif.message}</div>
        <div class="notification-time">${formatTime(notif.createdAt)}</div>
        ${notif.actions ? `
          <div class="notification-actions">
            ${notif.actions.map((action) => `
              <button class="notif-action-btn ${action.primary ? 'accept' : 'decline'}"
                      data-action="${action.action}" data-notif="${notif.id}" data-data='${JSON.stringify(notif.data || {})}'>
                ${action.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Add event listeners
  elements.notificationList.querySelectorAll('.notification-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-notif-id');
      if (id) {
        notifications.markAsRead(id);
        renderNotifications();
      }
    });
  });

  elements.notificationList.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-action');
      const data = JSON.parse(btn.getAttribute('data-data') || '{}');
      handleNotificationAction(action!, data);
    });
  });
}

function handleNotificationAction(action: string, data: Record<string, unknown>): void {
  switch (action) {
    case 'accept_friend':
      if (data.requestId) {
        friendSystem.acceptFriendRequest(data.requestId as string);
      }
      break;
    case 'reject_friend':
      if (data.requestId) {
        friendSystem.rejectFriendRequest(data.requestId as string);
      }
      break;
    case 'join_party':
      if (data.inviteId) {
        partySystem.acceptInvite(data.inviteId as string);
      }
      break;
    case 'decline_party':
      if (data.inviteId) {
        partySystem.declineInvite(data.inviteId as string);
      }
      break;
  }
  renderFriendList();
  renderPartySection();
  renderNotifications();
}

// ============================================================================
// Event Bindings
// ============================================================================

function setupEventListeners(): void {
  // Friend tabs
  document.querySelectorAll('.friend-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.friend-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentTab = tab.getAttribute('data-tab') as FriendTab;
      renderFriendList();
    });
  });

  // Friend search
  elements.friendSearch.addEventListener('input', () => {
    state.searchQuery = elements.friendSearch.value;
    renderFriendList();
  });

  // Status options
  document.querySelectorAll('.status-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-option').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const status = btn.getAttribute('data-status') as PresenceStatus;
      notifications.setPresence(status);
      elements.userStatusText.textContent = getStatusText(status);
      elements.userStatusText.style.color = getStatusColor(status);
    });
  });

  // Status message
  elements.statusMessage.addEventListener('change', () => {
    notifications.setStatusMessage(elements.statusMessage.value || undefined);
  });

  // Create party buttons
  document.getElementById('create-party-btn')?.addEventListener('click', showCreatePartyModal);
  document.getElementById('create-party-btn-2')?.addEventListener('click', showCreatePartyModal);

  // Modal controls
  document.getElementById('close-modal')?.addEventListener('click', hideCreatePartyModal);
  document.getElementById('cancel-party')?.addEventListener('click', hideCreatePartyModal);
  document.getElementById('confirm-party')?.addEventListener('click', createParty);

  elements.createPartyModal.addEventListener('click', (e) => {
    if (e.target === elements.createPartyModal) {
      hideCreatePartyModal();
    }
  });
}

function showCreatePartyModal(): void {
  elements.createPartyModal.classList.add('show');
  elements.partyNameInput.value = `${state.userName}'s Party`;
  elements.partyNameInput.focus();
}

function hideCreatePartyModal(): void {
  elements.createPartyModal.classList.remove('show');
}

function createParty(): void {
  const name = elements.partyNameInput.value.trim();
  const privacy = elements.partyPrivacySelect.value as 'public' | 'friends' | 'invite';
  const maxSize = parseInt(elements.partySizeSelect.value);

  if (!name) {
    elements.partyNameInput.focus();
    return;
  }

  partySystem.createParty({
    name,
    privacy,
    maxSize,
    voiceEnabled: true,
  });

  hideCreatePartyModal();
}

// ============================================================================
// Utilities
// ============================================================================

function getRandomColor(): string {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#30cfd0', '#330867',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getColorFromName(name: string): string {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#30cfd0', '#6b21a8',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function adjustColor(color: string, amount: number): string {
  const num = parseInt(color.slice(1), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getStatusText(status: PresenceStatus): string {
  const texts: Record<PresenceStatus, string> = {
    online: 'Online',
    away: 'Away',
    busy: 'Do Not Disturb',
    offline: 'Offline',
    invisible: 'Invisible',
  };
  return texts[status] || 'Unknown';
}

function getStatusColor(status: PresenceStatus): string {
  const colors: Record<PresenceStatus, string> = {
    online: '#4ade80',
    away: '#fbbf24',
    busy: '#ef4444',
    offline: '#666',
    invisible: '#666',
  };
  return colors[status] || '#666';
}

function getRandomStatusMessage(): string | undefined {
  const messages = [
    'Building something cool!',
    'Exploring the metaverse',
    'In a meeting',
    'Available to chat',
    undefined,
    undefined,
    undefined,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ============================================================================
// Initialize
// ============================================================================

function init(): void {
  console.log('Social Hub - Initializing...');

  // Setup demo data first
  setupDemoData();

  // Render initial state
  renderUserProfile();
  renderFriendList();
  renderPartySection();
  renderEmoteGrid();
  renderNotifications();

  // Setup event listeners
  setupEventListeners();

  console.log('Social Hub - Ready!');
}

// Start
init();
