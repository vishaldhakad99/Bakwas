import { create } from 'zustand';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { sound } from '../services/sound';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  hasMoreMessages: false,
  isLoadingMessages: false,
  typingUsers: {}, // { [conversationId]: string[] }
  onlineUserIds: new Set(),
  replyingTo: null,
  searchFilter: '',

  setSearchFilter: (searchFilter) => set({ searchFilter }),
  setReplyingTo: (replyingTo) => set({ replyingTo }),

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (conversation) => {
    const currentActive = get().activeConversation;
    const socket = getSocket();

    if (currentActive && socket) {
      socket.emit('conversation:leave', currentActive._id);
    }

    if (conversation && socket) {
      socket.emit('conversation:join', conversation._id);
    }

    set({ activeConversation: conversation, messages: [], replyingTo: null });

    if (conversation) {
      get().fetchMessages(conversation._id);
    }
  },

  fetchConversations: async () => {
    try {
      const res = await api.get('/chat/conversations');
      const convs = res.data.data;
      set({ conversations: convs });

      // Check online presence for participants
      const socket = getSocket();
      if (socket) {
        const userIds = new Set();
        convs.forEach((c) => {
          c.participants?.forEach((p) => userIds.add(p._id));
        });
        socket.emit('presence:check', Array.from(userIds), (result) => {
          const onlineSet = new Set();
          Object.entries(result || {}).forEach(([id, isOnline]) => {
            if (isOnline) onlineSet.add(id);
          });
          set({ onlineUserIds: onlineSet });
        });
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isLoadingMessages: true });
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages`);
      const { messages, hasMore } = res.data.data;
      set({ messages, hasMoreMessages: hasMore, isLoadingMessages: false });

      // Mark messages as read via socket
      const socket = getSocket();
      if (socket && messages.length > 0) {
        const unreadIds = messages.map((m) => m._id);
        socket.emit('message:read', { conversationId, messageIds: unreadIds });
      }

      // Update local unread counter
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      }));
    } catch (err) {
      console.error('Failed to load messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message, isFromSocket = false) => {
    const { activeConversation, conversations, messages } = get();

    if (activeConversation && activeConversation._id === message.conversationId) {
      // Avoid duplicate temp messages
      const exists = messages.some((m) => m._id === message._id);
      if (!exists) {
        set({ messages: [...messages, message] });
      }
      if (isFromSocket) {
        sound.playReceived();
        const socket = getSocket();
        if (socket) {
          socket.emit('message:read', {
            conversationId: activeConversation._id,
            messageIds: [message._id]
          });
        }
      }
    } else if (isFromSocket) {
      sound.playReceived();
    }

    // Update conversation lastMessage & move to top
    set({
      conversations: conversations
        .map((c) => {
          if (c._id === message.conversationId) {
            return {
              ...c,
              lastMessage: message,
              updatedAt: new Date().toISOString(),
              unreadCount:
                activeConversation?._id === message.conversationId
                  ? 0
                  : (c.unreadCount || 0) + 1
            };
          }
          return c;
        })
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    });
  },

  updateMessageStatus: (messageId, status) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, status } : m
      )
    }));
  },

  updateMessageReactions: (messageId, reactions) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, reactions } : m
      )
    }));
  },

  setTyping: (conversationId, userName, isTyping) => {
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const updated = isTyping
        ? Array.from(new Set([...current, userName]))
        : current.filter((u) => u !== userName);

      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: updated
        }
      };
    });
  },

  setPresence: (userId, isOnline) => {
    set((state) => {
      const updated = new Set(state.onlineUserIds);
      if (isOnline) {
        updated.add(userId);
      } else {
        updated.delete(userId);
      }
      return { onlineUserIds: updated };
    });
  }
}));
