import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ChatPanel } from './components/layout/ChatPanel';
import { EmptyChat } from './components/layout/EmptyChat';
import { AuthModal } from './components/auth/AuthModal';
import { IncomingCallModal } from './components/call/IncomingCallModal';
import { ActiveCallModal } from './components/call/ActiveCallModal';
import { NewChatModal } from './components/modals/NewChatModal';
import { NewGroupModal } from './components/modals/NewGroupModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { ForwardModal } from './components/modals/ForwardModal';
import { SaveContactModal } from './components/modals/SaveContactModal';
import { ContactsModal } from './components/modals/ContactsModal';
import { InstallPwaPrompt } from './components/common/InstallPwaPrompt';

import { useAuthStore } from './store/useAuthStore';
import { useChatStore } from './store/useChatStore';
import { useCallStore } from './store/useCallStore';
import { useThemeStore } from './store/useThemeStore';

import { initSocket, getSocket } from './services/socket';
import { api } from './services/api';
import { webrtc } from './services/webrtc';
import { sound } from './services/sound';

export function App() {
  const { isAuthenticated, accessToken, deviceId, user, logout } = useAuthStore();
  const {
    activeConversation,
    setActiveConversation,
    fetchConversations,
    addMessage,
    updateMessageStatus,
    markMessagesAsRead,
    updateUserAvatar,
    updateMessageReactions,
    setTyping,
    setPresence
  } = useChatStore();
  const { setIncomingCall } = useCallStore();
  const { initTheme } = useThemeStore();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaveContactOpen, setIsSaveContactOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);

  // Initialize theme on mount
  useEffect(() => {
    initTheme();
  }, []);

  // Listen for logout events dispatched by Axios interceptor
  useEffect(() => {
    const handleForceLogout = () => {
      logout();
    };
    window.addEventListener('auth_logout', handleForceLogout);
    return () => window.removeEventListener('auth_logout', handleForceLogout);
  }, []);

  // Socket setup & real-time events
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = initSocket(accessToken, deviceId);
    fetchConversations();

    // Register Web Push Notifications if supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(async (registration) => {
        try {
          const res = await api.get('/notifications/vapid-key');
          const publicKey = res.data?.data?.publicKey;
          if (publicKey) {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: publicKey
            });
            await api.post('/notifications/subscribe', { subscription });
          }
        } catch {
          // Push notifications permission not yet granted or denied
        }
      });
    }

    // Real-time Socket Event Listeners
    socket.on('message:receive', ({ message, tempId }) => {
      addMessage(message, true, tempId);

      // WhatsApp Delivery Receipt: Auto-acknowledge delivery to the sender
      const currentUser = JSON.parse(localStorage.getItem('bakwas_user') || 'null');
      const isSelf = message.sender?._id === currentUser?._id || message.sender === currentUser?._id;
      if (!isSelf && socket) {
        socket.emit('message:delivered', {
          messageId: message._id,
          conversationId: message.conversationId,
          senderId: message.sender?._id || message.sender
        });
      }
    });

    socket.on('conversation:updated', () => {
      fetchConversations();
    });

    socket.on('message:status_updated', ({ messageId, status }) => {
      updateMessageStatus(messageId, status);
    });

    socket.on('message:read_receipt', ({ messageIds }) => {
      if (Array.isArray(messageIds)) {
        markMessagesAsRead(messageIds);
      }
    });

    socket.on('user:avatar_updated', ({ userId, avatar }) => {
      updateUserAvatar(userId, avatar);
    });

    socket.on('message:reaction_updated', ({ messageId, reactions }) => {
      updateMessageReactions(messageId, reactions);
    });

    socket.on('typing:status', ({ conversationId, userName, isTyping }) => {
      setTyping(conversationId, userName, isTyping);
    });

    socket.on('user:presence', ({ userId, isOnline }) => {
      setPresence(userId, isOnline);
    });

    // Centralized WebRTC Call Signaling Listeners (prevents race conditions and dropped calls)
    socket.on('call:incoming', ({ callId, callType, caller }) => {
      setIncomingCall({ callId, callType, caller });
    });

    socket.on('call:accepted', async () => {
      sound.stopRinging();
      useCallStore.setState({ callState: 'connected' });
      useCallStore.getState().startCallTimer();

      try {
        const { callId, peer } = useCallStore.getState();
        if (peer && callId) {
          webrtc.onRemoteStreamCallback = (stream) => {
            useCallStore.setState({ remoteStream: stream });
          };
          const offer = await webrtc.createOffer(callId, peer._id);
          socket.emit('call:offer', { to: peer._id, offer, callId });
        }
      } catch (err) {
        console.error('Failed to create WebRTC offer:', err);
      }
    });

    socket.on('call:offer', async ({ offer, from, callId }) => {
      try {
        const { peer } = useCallStore.getState();
        const peerId = peer?._id || from;
        webrtc.onRemoteStreamCallback = (stream) => {
          useCallStore.setState({ remoteStream: stream });
        };
        const answer = await webrtc.handleOfferAndCreateAnswer(offer, callId, peerId);
        socket.emit('call:answer', { to: peerId, answer, callId });
      } catch (err) {
        console.error('Failed to handle call offer:', err);
      }
    });

    socket.on('call:answer', async ({ answer }) => {
      try {
        await webrtc.handleAnswer(answer);
      } catch (err) {
        console.error('Failed to handle call answer:', err);
      }
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      await webrtc.addIceCandidate(candidate);
    });

    socket.on('call:rejected', () => {
      sound.stopRinging();
      alert('Call was declined');
      useCallStore.getState().endCall('declined');
    });

    socket.on('call:ended', ({ reason }) => {
      sound.stopRinging();
      useCallStore.getState().endCall(reason || 'completed');
    });

    socket.on('call:busy', () => {
      sound.stopRinging();
      const { peer } = useCallStore.getState();
      alert(`${peer?.fullName || 'User'} is currently on another call`);
      useCallStore.getState().endCall('busy');
    });

    return () => {
      socket.off('message:receive');
      socket.off('conversation:updated');
      socket.off('message:status_updated');
      socket.off('message:read_receipt');
      socket.off('user:avatar_updated');
      socket.off('message:reaction_updated');
      socket.off('typing:status');
      socket.off('user:presence');
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:offer');
      socket.off('call:answer');
      socket.off('call:ice-candidate');
      socket.off('call:rejected');
      socket.off('call:ended');
      socket.off('call:busy');
    };
  }, [isAuthenticated, accessToken]);

  return (
    <div className="w-screen h-[100dvh] flex overflow-hidden bg-bakwas-dark font-sans select-none antialiased">
      {/* Mobile & Desktop View Layout */}
      {/* On desktop: show sidebar + chat panel side-by-side.
          On mobile: show sidebar if no activeConversation, or chat panel if activeConversation selected */}

      <div
        className={`${
          activeConversation ? 'hidden md:flex' : 'flex'
        } w-full md:w-auto h-full flex-shrink-0`}
      >
        <Sidebar
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenNewGroup={() => setIsNewGroupOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenContacts={() => setIsContactsOpen(true)}
          onOpenSaveContact={() => setIsSaveContactOpen(true)}
        />
      </div>

      <div
        className={`${
          activeConversation ? 'flex' : 'hidden md:flex'
        } flex-1 h-full min-w-0`}
      >
        {activeConversation ? (
          <ChatPanel
            onBack={() => setActiveConversation(null)}
            onOpenContactInfo={() => setIsProfileOpen(true)}
            onForwardMessage={(m) => setForwardMessage(m)}
          />
        ) : (
          <EmptyChat
            onOpenNewChat={() => setIsNewChatOpen(true)}
            onOpenSaveContact={() => setIsSaveContactOpen(true)}
          />
        )}
      </div>

      {/* Authentication Modal if not logged in */}
      {!isAuthenticated && <AuthModal />}

      {/* WebRTC Call Modals */}
      <IncomingCallModal />
      <ActiveCallModal />

      {/* Utility Modals */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onOpenSaveContact={() => {
          setIsNewChatOpen(false);
          setIsSaveContactOpen(true);
        }}
      />

      <SaveContactModal
        isOpen={isSaveContactOpen}
        onClose={() => setIsSaveContactOpen(false)}
        onContactSaved={() => {
          fetchConversations();
        }}
      />

      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        onOpenSaveContact={() => {
          setIsContactsOpen(false);
          setIsSaveContactOpen(true);
        }}
      />

      <NewGroupModal
        isOpen={isNewGroupOpen}
        onClose={() => setIsNewGroupOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {forwardMessage && (
        <ForwardModal
          message={forwardMessage}
          onClose={() => setForwardMessage(null)}
        />
      )}

      {/* Floating PWA Install Prompt */}
      <InstallPwaPrompt />
    </div>
  );
}
