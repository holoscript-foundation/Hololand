import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  initSocialSystems,
  destroySocialSystems,
  getFriendSystem,
  getPartySystem,
  getEmoteSystem,
  getNotificationSystem,
  sendFriendRequest as sendRequest,
  acceptFriendRequest as acceptRequest,
  getOnlineFriends as getOnline,
  createParty as makeParty,
  inviteToParty as invite,
  playEmote as emote,
  getEmotes as allEmotes,
  setPresence as updatePresence,
  getUnreadNotifications,
  markNotificationRead,
} from '@/services/socialService';

/**
 * Hook for friend system
 */
export function useFriends() {
  const { user, isAuthenticated } = useAuthStore();
  const [friends, setFriends] = useState<unknown[]>([]);
  const [requests, setRequests] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setFriends([]);
      setRequests([]);
      return;
    }

    // Initialize social systems
    initSocialSystems(user.id, user.displayName);

    const friendSystem = getFriendSystem();
    if (friendSystem) {
      setFriends(friendSystem.getFriends());
      setRequests(friendSystem.getPendingRequests());
      setLoading(false);

      // Listen for updates
      friendSystem.on('friendAdded', () => {
        setFriends(friendSystem.getFriends());
      });

      friendSystem.on('friendRemoved', () => {
        setFriends(friendSystem.getFriends());
      });

      friendSystem.on('friendRequestReceived', () => {
        setRequests(friendSystem.getPendingRequests());
      });

      friendSystem.on('friendStatusChanged', () => {
        setFriends(friendSystem.getFriends());
      });
    }

    return () => {
      destroySocialSystems();
    };
  }, [isAuthenticated, user]);

  const sendFriendRequest = useCallback(
    (toUserId: string, toDisplayName: string, message?: string) => {
      return sendRequest(toUserId, toDisplayName, message);
    },
    []
  );

  const acceptFriendRequest = useCallback((requestId: string) => {
    acceptRequest(requestId);
    setRequests((r) => r.filter((req) => (req as { id: string }).id !== requestId));
  }, []);

  const getOnlineFriends = useCallback(() => {
    return getOnline();
  }, []);

  return {
    friends,
    requests,
    loading,
    onlineFriends: friends.filter((f) => (f as { status: string }).status !== 'offline'),
    sendFriendRequest,
    acceptFriendRequest,
    getOnlineFriends,
  };
}

/**
 * Hook for party system
 */
export function useParty() {
  const { user } = useAuthStore();
  const [party, setParty] = useState<unknown | null>(null);
  const [invites, setInvites] = useState<unknown[]>([]);

  useEffect(() => {
    const partySystem = getPartySystem();
    if (partySystem) {
      setParty(partySystem.getCurrentParty());
      setInvites(partySystem.getPendingInvites());

      partySystem.on('partyCreated', ({ party: p }) => setParty(p));
      partySystem.on('partyJoined', ({ party: p }) => setParty(p));
      partySystem.on('partyLeft', () => setParty(null));
      partySystem.on('partyDisbanded', () => setParty(null));
      partySystem.on('partyInviteReceived', () => {
        setInvites(partySystem.getPendingInvites());
      });
    }
  }, [user]);

  const createParty = useCallback(
    (options: {
      name: string;
      maxMembers?: number;
      privacy?: 'public' | 'friends_only' | 'invite_only';
    }) => {
      const newParty = makeParty(options);
      setParty(newParty);
      return newParty;
    },
    []
  );

  const inviteToParty = useCallback((userId: string, displayName: string) => {
    return invite(userId, displayName);
  }, []);

  const leaveParty = useCallback(() => {
    getPartySystem()?.leaveParty();
    setParty(null);
  }, []);

  return {
    party,
    invites,
    isInParty: !!party,
    createParty,
    inviteToParty,
    leaveParty,
  };
}

/**
 * Hook for emote system
 */
export function useEmotes() {
  const [emotes, setEmotes] = useState<unknown[]>([]);

  useEffect(() => {
    const emoteSystem = getEmoteSystem();
    if (emoteSystem) {
      setEmotes(emoteSystem.getUnlockedEmotes());
    }
  }, []);

  const playEmote = useCallback((emoteId: string) => {
    emote(emoteId);
  }, []);

  const getEmotesByCategory = useCallback((category: string) => {
    return emotes.filter((e) => (e as { category: string }).category === category);
  }, [emotes]);

  return {
    emotes,
    playEmote,
    getEmotesByCategory,
    // Quick actions
    wave: () => emote('wave'),
    clap: () => emote('clap'),
    dance: () => emote('dance'),
    thumbsUp: () => emote('thumbsUp'),
  };
}

/**
 * Hook for notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<unknown[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const notifSystem = getNotificationSystem();
    if (notifSystem) {
      const update = () => {
        const all = notifSystem.getNotifications();
        setNotifications(all);
        setUnreadCount(all.filter((n) => !n.read).length);
      };

      update();
      notifSystem.on('notificationReceived', update);
      notifSystem.on('notificationRead', update);
      notifSystem.on('notificationsCleared', update);
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    markNotificationRead(notificationId);
  }, []);

  const clearAll = useCallback(() => {
    getNotificationSystem()?.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };
}

/**
 * Hook for presence/status management
 */
export function usePresence() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<'online' | 'away' | 'busy' | 'dnd' | 'offline'>('online');
  const [statusMessage, setStatusMsg] = useState('');

  const setPresence = useCallback((newStatus: typeof status) => {
    updatePresence(newStatus);
    setStatus(newStatus);
  }, []);

  const setStatusMessage = useCallback((message: string) => {
    getNotificationSystem()?.setStatusMessage(message);
    setStatusMsg(message);
  }, []);

  return {
    status,
    statusMessage,
    setPresence,
    setStatusMessage,
  };
}
