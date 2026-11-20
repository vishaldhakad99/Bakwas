# BAKWAS — Enterprise Real-Time Messaging & Calling Platform

![BAKWAS Architecture](https://img.shields.io/badge/Security-TLS%201.3%20%7C%20Rate--Limited-00a884)
![Node Version](https://img.shields.io/badge/Node.js-v22+-00a884)
![Frontend](https://img.shields.io/badge/React%2018-Vite%20%2B%20Tailwind-06b6d4)
![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-green)
![Calling](https://img.shields.io/badge/WebRTC-P2P%20Voice%20%26%20Video-blue)
![PWA](https://img.shields.io/badge/PWA-Installable-purple)

**BAKWAS** is a full-stack, production-grade real-time messaging, voice, and video calling web application built on the modern MERN stack. Designed with a familiar WhatsApp-inspired layout, it features original branding, distinctive emerald-cyan cyber styling, and resilient 24/7 cloud infrastructure that operates independently of local machines.

---

## 🌟 Key Features

### 1. Mobile Number OTP Authentication
- **Secure SMS Verification**: Integrated provider adapters for Twilio and MSG91, backed by bcrypt-hashed OTP verification, rate-limiting (max 1 dispatch every 45s, max 3 verification attempts), and 5-minute cryptographic expiration.
- **Session Security & Refresh Token Rotation**: Dual-token architecture using short-lived JWT Access Tokens (15m) and rotating Refresh Tokens (30d) with token-theft reuse detection that automatically revokes compromised sessions.
- **Multi-Device & Session Management**: Tracks active device sessions (Browser, OS, IP, Last active timestamp) with the ability to remotely revoke specific sessions or log out from all devices simultaneously.
- **Account Lifecycle**: Change mobile number with verification, soft-delete account, and data wipe.

### 2. Real-Time Messaging Engine (Socket.IO)
- **1-on-1 & Group Chats**: Direct messaging and multi-participant groups with admin controls, group descriptions, and custom avatars.
- **Comprehensive Media Types**:
  - Text messages with auto-expanding textarea and emoji keyboard
  - High-resolution images with full-screen lightbox preview
  - HD video playback with inline controls
  - Voice notes with audio waveform visualization and live recording controls
  - Document attachments (PDF, DOCX, ZIP, TXT) with download integration
  - Interactive Call Log items
- **Message Lifecycle & State Delivery**:
  - **Sending**: Clock icon
  - **Sent**: Single grey tick
  - **Delivered**: Double grey tick (real-time presence delivery tracking)
  - **Read**: Double cyan/emerald tick (read receipts with timestamp)
- **Interactive Actions**: Reply with preview banner, forward to multiple conversations, edit message (within 15m), delete for me, delete for everyone, message star, emoji reactions (❤️, 👍, 😂, 😮, 😢, 🙏), and conversation pinning.
- **Live Typing & Presence**: Dynamic *"User is typing..."* status, online dot badges, and accurate *"last seen"* timestamps.

### 3. WebRTC Voice & Video Calling
- **True P2P Communication**: Real audio and video transmission powered by browser `RTCPeerConnection` with microphone and camera capture via `navigator.mediaDevices.getUserMedia`.
- **Global NAT Traversal**: Configured with Google STUN (`stun:stun.l.google.com:19302`) and pluggable TURN servers (Twilio, Metered, or Coturn) for symmetric NAT traversal.
- **Synthetic Web Audio Ringers**: Custom synthesizer for incoming ringtone and outgoing ringback tones — requires no external MP3 dependencies.
- **In-Call Controls**: Microphone mute/unmute, camera video toggle, Picture-in-Picture thumbnail, duration counter, call history logging, and missed call detection.

### 4. Zero Status Feature (By Design)
- The platform strictly focuses on high-performance messaging, calling, and privacy. WhatsApp-style ephemeral statuses, stories, or feeds are completely excluded.

### 5. Progressive Web App (PWA)
- Installable on Android, iPhone/iPad, Windows, macOS, and Linux.
- Offline service worker caching shell assets with Web Push notifications support.

---

## 🏗️ System Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────┐
   │                     CLIENT LAYER                        │
   │   React 18  •  Vite  •  Tailwind CSS  •  Zustand Store  │
   │     WebRTC PeerConnection  •  Socket.IO Client          │
   └───────────────┬─────────────────────────┬───────────────┘
                   │ HTTPS REST / API        │ WSS (WebSockets)
                   ▼                         ▼
   ┌─────────────────────────────────────────────────────────┐
   │                    BACKEND CLUSTER                      │
   │     Node.js 22  •  Express.js  •  Socket.IO Server      │
   │  Helmet  •  RateLimit  •  Zod  •  Multer  •  WebPush    │
   └───────────┬──────────────────────┬──────────────────────┘
               │                      │
       MongoDB │ Mongoose             │ Upload / Media
               ▼                      ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │  MongoDB Atlas       │   │ Cloudinary / S3 /    │
    │  (Permanent Cloud DB)│   │ Local Disk Storage   │
    └──────────────────────┘   └──────────────────────┘
```

---

## 🗄️ MongoDB Database Architecture (All 13 Models)

1. **User**: `countryCode`, `mobileNumber`, `formattedPhone`, `username`, `fullName`, `about`, `avatar { url, publicId }`, `isOnline`, `lastSeen`, `privacySettings`, `isVerified`, `isDeleted`.
2. **Conversation**: `type ('direct'|'group')`, `participants [User refs]`, `group [Group ref]`, `lastMessage [Message ref]`, `unreadCounts`, `pinnedBy`, `archivedBy`, `clearedHistory`.
3. **Message**: `conversationId`, `sender`, `messageType`, `content`, `media { url, fileName, fileSize, mimeType, duration }`, `replyTo`, `forwarded`, `isEdited`, `deletedForEveryone`, `deletedForUsers`, `status`, `deliveryStatus`, `reactions`, `starredBy`, `callLog`.
4. **Group**: `name`, `description`, `avatar`, `creator`, `admins`, `settings { onlyAdminsCanSend, onlyAdminsCanEditInfo }`.
5. **GroupMember**: `groupId`, `userId`, `role ('admin'|'member')`, `joinedAt`, `addedBy`.
6. **Contact**: `userId`, `contactUserId`, `customName`, `isSaved`.
7. **Call**: `caller`, `receiver`, `conversationId`, `callType ('voice'|'video')`, `status`, `startedAt`, `acceptedAt`, `endedAt`, `durationSeconds`, `endReason`.
8. **Notification**: `userId`, `type ('message'|'call'|'group')`, `title`, `body`, `data`, `isRead`.
9. **DeviceSession**: `userId`, `deviceId`, `deviceName`, `browser`, `os`, `ip`, `userAgent`, `lastActiveAt`, `isActive`.
10. **BlockedUser**: `blockerId`, `blockedUserId`, `reason`.
11. **RefreshToken**: `userId`, `deviceId`, `tokenHash`, `expiresAt`, `revoked`, `replacedByTokenHash`.
12. **PushSubscription**: `userId`, `endpoint`, `keys { p256dh, auth }`, `deviceId`.
13. **OTPVerification**: `formattedPhone`, `otpHash`, `attempts`, `maxAttempts`, `expiresAt`, `isVerified`, `purpose`.

---

## 🔐 Security & Privacy Architecture

- **Defense in Depth**: Express Helmet HTTP header protection (`nosniff`, `X-Frame-Options`, `X-DNS-Prefetch-Control`).
- **Input Validation**: Strict Zod schema validation across all authentication, messaging, and group routes.
- **Rate Limiting**:
  - General API: 120 req / minute
  - Authentication: 20 req / 15 minutes
  - OTP Requests: 6 req / 10 minutes (with 45s cooldown per phone)
  - Messaging: 60 messages / minute
- **File Upload Security**: Strict MIME filtering and size caps (50MB) blocking executables, shell scripts, and malicious binaries.
- **Cryptographic Transparency**: Zero-knowledge payload routing design with TLS 1.3 encryption in transit and AES-256 at rest in MongoDB Atlas.

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js v20+ or v22+
- npm v10+
- MongoDB Atlas cluster or local MongoDB instance

### Step 1: Clone & Install Dependencies
```bash
git clone <repository_url>
cd wtsp

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` in `backend/`:
```bash
cd ../backend
cp .env.example .env
```
Edit `.env` with your MongoDB URI (or keep default for local MongoDB) and provider keys. In development, `SMS_PROVIDER=mock` outputs verification OTP codes directly to the terminal for instant testing!

### Step 3: Run Backend and Frontend
In terminal 1 (Backend):
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

In terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

Open your browser at `http://localhost:5173` to start using BAKWAS!

---

## 🧪 Automated Testing

The backend includes a comprehensive Vitest automated test suite verifying health endpoints, security headers, cryptographic functions, Zod input validation, authentication token authorization, and file upload MIME filtering.

Run the test suite:
```bash
cd backend
npm test
```

Result:
```
 ✓ tests/system.test.js (19 tests)
 Test Files  1 passed (1)
      Tests  19 passed (19)
```

---

## ☁️ 24/7 Production Cloud Deployment Walkthrough

To ensure BAKWAS remains functional even when your local machine is switched off:

### 1. MongoDB Atlas (Cloud Database)
1. Sign up for [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Free M0 cluster (or dedicated M10+ cluster).
3. Under **Network Access**, add `0.0.0.0/0` (Allow access from anywhere for cloud hosts).
4. Under **Database Access**, create a user with read/write privileges.
5. Copy your connection string: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/bakwas?retryWrites=true&w=majority`.

### 2. Backend Deployment (Render / Railway)
> **Note on Free vs Paid Cloud Hosting**: Free tier instances (e.g. Render Free) spin down after 15 minutes of inactivity and take 30-50 seconds to wake up, disconnecting WebSockets when idle. For uninterrupted 24/7 real-time operation, use **Render Starter ($7/mo)** or **Railway ($5/mo)**, which run persistent background containers with guaranteed uptime.

#### Deploying on Render:
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint** and select your repository.
3. Render automatically picks up `render.yaml`.
4. Provide the environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas URI
   - `CLIENT_URL`: Your deployed frontend URL
   - `SMS_PROVIDER`: `twilio` or `msg91`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
   - `STORAGE_PROVIDER`: `cloudinary`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
5. Click **Apply**. Render will build and launch your backend with health checks enabled at `/api/health`.

### 3. Frontend Deployment (Vercel)
1. In [Vercel Dashboard](https://vercel.com), click **Add New** -> **Project**.
2. Select your repository, set the **Root Directory** to `frontend`.
3. Framework Preset: `Vite`.
4. Set Environment Variables:
   - `VITE_API_URL`: `https://your-backend-app.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://your-backend-app.onrender.com`
5. Click **Deploy**. Vercel will build and assign an SSL-enabled production domain (e.g. `https://bakwas.vercel.app`).

### 4. Real SMS Provider Setup (Twilio / MSG91)
- **Twilio**:
  1. Create a project at [twilio.com](https://www.twilio.com).
  2. Purchase an SMS-capable phone number.
  3. Copy `Account SID` and `Auth Token` to `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
- **MSG91**:
  1. Create an account at [msg91.com](https://msg91.com).
  2. Create an OTP template and copy `Auth Key` and `Template ID`.

### 5. Media Cloud Storage (Cloudinary)
1. Sign up at [cloudinary.com](https://cloudinary.com).
2. Copy `Cloud Name`, `API Key`, and `API Secret` to `CLOUDINARY_*` environment variables.
3. All profile pictures, voice notes, and media attachments will be permanently stored on Cloudinary's global CDN.

---

## 📋 External Services & Required API Keys Checklist

| Service | Purpose | Required Keys | Fallback in Development |
| :--- | :--- | :--- | :--- |
| **MongoDB Atlas** | Permanent Cloud Database | `MONGODB_URI` | Local MongoDB URI (`mongodb://127.0.0.1:27017/bakwas`) |
| **Twilio / MSG91** | Real SMS OTP Delivery | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | `SMS_PROVIDER=mock` (dispatches code to server log) |
| **Cloudinary** | Cloud Media & CDN Storage | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `STORAGE_PROVIDER=local` (stores in `backend/uploads`) |
| **WebPush** | Background Browser Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | In-App Socket notification banners |
| **STUN/TURN** | WebRTC Symmetric NAT Relay | `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` | Google STUN fallback |

---

## 📄 License
This project is proprietary and built for enterprise deployment under the **BAKWAS** trademark. All design assets and brand logos are original creations.
