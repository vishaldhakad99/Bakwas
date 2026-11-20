import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Contact } from '../src/models/Contact.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { OTPVerification } from '../src/models/OTPVerification.js';

describe('BAKWAS - Contact Saving & Real-Time OTP Workflow Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Clean test records
    await User.deleteMany({ formattedPhone: { $in: ['+919876500001', '+919876500002'] } });
    await Contact.deleteMany({ phoneNumber: { $in: ['+919876500001', '+919876500002'] } });
    await OTPVerification.deleteMany({ formattedPhone: { $in: ['+919876500001', '+919876500002'] } });
    await disconnectDB();
  });

  let userAToken = '';
  let userAId = '';
  let userBToken = '';
  let userBId = '';

  it('1. User A requests OTP and authenticates', async () => {
    const resOtp = await request(app)
      .post('/api/auth/request-otp')
      .send({
        countryCode: '+91',
        mobileNumber: '9876500001',
        purpose: 'login'
      });

    expect(resOtp.status).toBe(200);
    expect(resOtp.body.success).toBe(true);

    const devOtp = resOtp.body.data.devOtp;
    expect(devOtp).toBeDefined();

    const resVerify = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        countryCode: '+91',
        mobileNumber: '9876500001',
        otp: devOtp,
        deviceId: 'device-test-user-a',
        fullName: 'User A Test'
      });

    expect(resVerify.status).toBe(200);
    expect(resVerify.body.success).toBe(true);
    userAToken = resVerify.body.data.accessToken;
    userAId = resVerify.body.data.user._id;
    expect(userAToken).toBeDefined();
  });

  it('2. User A saves User B number before User B is registered on BAKWAS', async () => {
    const resSave = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        customName: 'Best Friend Bob',
        phoneNumber: '+919876500002',
        notes: 'Childhood friend'
      });

    expect(resSave.status).toBe(201);
    expect(resSave.body.success).toBe(true);
    expect(resSave.body.data.customName).toBe('Best Friend Bob');
    expect(resSave.body.data.isRegistered).toBe(false);
  });

  it('3. User A retrieves saved contacts list (Bob appears as not yet registered)', async () => {
    const resList = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(resList.status).toBe(200);
    const bob = resList.body.data.find((c) => c.phoneNumber === '+919876500002');
    expect(bob).toBeDefined();
    expect(bob.customName).toBe('Best Friend Bob');
    expect(bob.isRegistered).toBe(false);
  });

  it('4. User B registers on BAKWAS', async () => {
    const resOtp = await request(app)
      .post('/api/auth/request-otp')
      .send({
        countryCode: '+91',
        mobileNumber: '9876500002',
        purpose: 'login'
      });

    const devOtp = resOtp.body.data.devOtp;

    const resVerify = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        countryCode: '+91',
        mobileNumber: '9876500002',
        otp: devOtp,
        deviceId: 'device-test-user-b',
        fullName: 'Bob Johnson'
      });

    expect(resVerify.status).toBe(200);
    userBToken = resVerify.body.data.accessToken;
    userBId = resVerify.body.data.user._id;
    expect(userBToken).toBeDefined();
  });

  it('5. User A contacts list automatically links Bob as registered with active BAKWAS account', async () => {
    const resList = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(resList.status).toBe(200);
    const bob = resList.body.data.find((c) => c.phoneNumber === '+919876500002');
    expect(bob).toBeDefined();
    expect(bob.isRegistered).toBe(true);
    expect(bob.contactUser).toBeDefined();
    expect(bob.contactUser.fullName).toBe('Bob Johnson');
  });

  it('6. User A starts a direct conversation with Bob', async () => {
    const resConv = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        recipientId: userBId
      });

    expect([200, 201]).toContain(resConv.status);
    expect(resConv.body.data.type).toBe('direct');
    const convId = resConv.body.data._id;

    // Send a message
    const resMsg = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        conversationId: convId,
        content: 'Hey Bob, welcome to BAKWAS!'
      });

    expect(resMsg.status).toBe(201);
    expect(resMsg.body.data.content).toBe('Hey Bob, welcome to BAKWAS!');
  });
});
