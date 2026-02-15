import { create } from 'zustand';

export interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentWorld?: string;
  lastSeen?: Date;
}

export interface Party {
  id: string;
  name: string;
  leaderId: string;
  members: Friend[];
  maxSize: number;
  isOpen: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'emote';
}

export interface Notification {
  id: string;
  type: 'friend_request' | 'party_invite' | 'world_invite' | 'system';
  title: string;
  message: string;
  fromUserId?: string;
  fromUserName?: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

interface SocialState {
  // Friends
  friends: Friend[];
  friendRequests: { incoming: Friend[]; outgoing: Friend[] };
  blockedUsers: string[];

  // Party
  currentParty: Party | null;
  partyInvites: { partyId: string; from: Friend }[];

  // Chat
  messages: ChatMessage[];

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Actions
  fetchFriends: () => Promise<void>;
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptFriendRequest: (userId: string) => Promise<void>;
  declineFriendRequest: (userId: string) => void;
  removeFriend: (userId: string) => void;
  blockUser: (userId: string) => void;

  createParty: () => Promise<Party>;
  joinParty: (partyId: string) => Promise<void>;
  leaveParty: () => void;
  inviteToParty: (userId: string) => Promise<void>;

  sendMessage: (content: string) => void;

  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
}

// Mock friends
const mockFriends: Friend[] = [
  { id: '2', username: 'alice', displayName: 'Alice', status: 'online', currentWorld: 'central' },
  { id: '3', username: 'bob', displayName: 'Bob', status: 'away' },
  { id: '4', username: 'charlie', displayName: 'Charlie', status: 'offline', lastSeen: new Date(Date.now() - 3600000) },
];

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: mockFriends,
  friendRequests: { incoming: [], outgoing: [] },
  blockedUsers: [],
  currentParty: null,
  partyInvites: [],
  messages: [],
  notifications: [
    {
      id: '1',
      type: 'friend_request',
      title: 'Friend Request',
      message: 'Alice wants to be your friend',
      fromUserId: '2',
      fromUserName: 'Alice',
      read: false,
      createdAt: new Date(),
    },
  ],
  unreadCount: 1,

  fetchFriends: async () => {
    // TODO: Integrate with @hololand/social
    // const friends = await socialService.getFriends();
    set({ friends: mockFriends });
  },

  sendFriendRequest: async (userId) => {
    // TODO: await socialService.sendFriendRequest(userId);
    console.log('Sending friend request to:', userId);
  },

  acceptFriendRequest: async (userId) => {
    const { friendRequests, friends } = get();
    const request = friendRequests.incoming.find((r) => r.id === userId);
    if (request) {
      set({
        friends: [...friends, request],
        friendRequests: {
          ...friendRequests,
          incoming: friendRequests.incoming.filter((r) => r.id !== userId),
        },
      });
    }
  },

  declineFriendRequest: (userId) => {
    const { friendRequests } = get();
    set({
      friendRequests: {
        ...friendRequests,
        incoming: friendRequests.incoming.filter((r) => r.id !== userId),
      },
    });
  },

  removeFriend: (userId) => {
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== userId),
    }));
  },

  blockUser: (userId) => {
    set((state) => ({
      blockedUsers: [...state.blockedUsers, userId],
      friends: state.friends.filter((f) => f.id !== userId),
    }));
  },

  createParty: async () => {
    const party: Party = {
      id: `party-${Date.now()}`,
      name: 'My Party',
      leaderId: 'current-user',
      members: [],
      maxSize: 8,
      isOpen: false,
    };
    set({ currentParty: party });
    return party;
  },

  joinParty: async (partyId) => {
    // TODO: await socialService.joinParty(partyId);
    console.log('Joining party:', partyId);
  },

  leaveParty: () => {
    set({ currentParty: null });
  },

  inviteToParty: async (userId) => {
    // TODO: await socialService.inviteToParty(userId);
    console.log('Inviting to party:', userId);
  },

  sendMessage: (content) => {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'current-user',
      senderName: 'You',
      content,
      timestamp: new Date(),
      type: 'text',
    };
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  markNotificationRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: state.unreadCount - 1,
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));
