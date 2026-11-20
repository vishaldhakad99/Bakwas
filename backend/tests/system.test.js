import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { DeviceSession } from '../src/models/DeviceSession.js';
import { getIceServers } from '../src/config/webrtc.js';
import { getE2EEStatus } from '../src/services/encryption.service.js';
import { hashToken, generateAccessToken, generateRefreshToken } from '../src/services/token.service.js';
import { generateSecureOTP } from '../src/services/otp.service.js';
import {
  requestOtpSchema,
  verifyOtpSchema,
  sendMessageSchema,
  createGroupSchema
} from '../src/utils/validators.js';

describe('BAKWAS Real-Time Messaging Platform - System Test Suite', () => {

  describe('1. Health Check & Security Headers', () => {
    it('GET /api/health should return status 200 with healthy state and E2EE specs', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('BAKWAS Messaging Backend');
      expect(res.body.encryption).toBeDefined();
      expect(res.body.encryption.transportSecurity).toContain('TLS 1.3');
    });

    it('Should include security headers (Helmet)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('GET unknown route should return standardized 404 ApiError', async () => {
      const res = await request(app).get('/api/non-existent-route-xyz');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot find GET /api/non-existent-route-xyz');
    });
  });

  describe('2. Cryptographic Security & E2EE Primitives', () => {
    it('Should generate secure 6-digit numeric OTPs', () => {
      for (let i = 0; i < 20; i++) {
        const otp = generateSecureOTP();
        expect(otp).toMatch(/^\d{6}$/);
        const num = parseInt(otp, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it('Should securely hash tokens using SHA-256', () => {
      const rawToken = 'test-token-12345';
      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });

    it('Should generate high-entropy random refresh tokens', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThanOrEqual(80);
    });

    it('Should sign valid JWT access tokens with deviceId and user claims', () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        formattedPhone: '+919876543210',
        username: 'test_user'
      };
      const token = generateAccessToken(mockUser, 'device_abc123');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('Should provide verified E2EE architecture specification', () => {
      const status = getE2EEStatus();
      expect(status.isArchitectureCompliant).toBe(true);
      expect(status.transportSecurity).toContain('TLS 1.3');
      expect(status.dataAtRest).toContain('AES-256');
    });
  });

  describe('3. WebRTC & STUN/TURN Configuration', () => {
    it('Should provide reliable Google STUN servers for NAT traversal', () => {
      const iceServers = getIceServers();
      expect(Array.isArray(iceServers)).toBe(true);
      expect(iceServers.length).toBeGreaterThanOrEqual(2);
      const urls = iceServers.map((s) => s.urls);
      expect(urls.some((u) => u.includes('stun.l.google.com'))).toBe(true);
    });
  });

  describe('4. Input Validation & Defense in Depth', () => {
    it('Should reject invalid country codes and non-digit phone numbers', () => {
      const invalidPayload = {
        body: {
          countryCode: 'invalid',
          mobileNumber: 'abcdef',
          purpose: 'login'
        }
      };
      const result = requestOtpSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('Should accept valid country code and mobile number format', () => {
      const validPayload = {
        body: {
          countryCode: '+91',
          mobileNumber: '9876543210',
          purpose: 'login'
        }
      };
      const result = requestOtpSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('Should reject OTP verification if OTP length is not 6 digits', () => {
      const invalidOtp = {
        body: {
          countryCode: '+91',
          mobileNumber: '9876543210',
          otp: '123',
          deviceId: 'dev_123'
        }
      };
      const result = verifyOtpSchema.safeParse(invalidOtp);
      expect(result.success).toBe(false);
    });

    it('Should validate message payload structure', () => {
      const validMessage = {
        body: {
          conversationId: '507f1f77bcf86cd799439011',
          messageType: 'text',
          content: 'Hello BAKWAS!'
        }
      };
      const result = sendMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('Should enforce group name and member constraints', () => {
      const invalidGroup = {
        body: {
          name: '',
          participantIds: []
        }
      };
      const result = createGroupSchema.safeParse(invalidGroup);
      expect(result.success).toBe(false);
    });
  });

  describe('5. Authentication & Authorization Security Middleware', () => {
    it('Protected routes should block requests without authorization header', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication token missing or invalid');
    });

    it('Protected routes should block requests with invalid JWT tokens', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid authentication token');
    });

    it('Protected conversations route should block unauthenticated users', async () => {
      const res = await request(app).get('/api/chat/conversations');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Protected calls route should block unauthenticated users', async () => {
      const res = await request(app).get('/api/calls/history');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('6. File Upload MIME & Security Restrictions', () => {
    it('Should reject unsupported file extensions/MIME types', async () => {
      // Mock user token, User.findById, and DeviceSession.findOne
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        formattedPhone: '+919876543210',
        isDeleted: false
      };
      vi.spyOn(User, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(DeviceSession, 'findOne').mockResolvedValue({
        userId: mockUser._id,
        deviceId: 'test_dev',
        isActive: true,
        save: vi.fn()
      });

      const token = generateAccessToken(mockUser, 'test_dev');

      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('malicious executable code'), 'exploit.exe');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Unsupported file type');
    });
  });
});
