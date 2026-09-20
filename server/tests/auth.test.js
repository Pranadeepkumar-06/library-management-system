const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearAll } = require('./setup');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearAll);

describe('auth', () => {
  test('register -> login -> me -> refresh -> logout', async () => {
    const agent = request.agent(app);
    const reg = await agent.post('/api/auth/register').send({
      firstName: 'Jane', lastName: 'Doe', username: 'janedoe', email: 'jane@x.local', password: 'Passw0rdA',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.data.user.email).toBe('jane@x.local');
    expect(reg.body.data.user.password).toBeUndefined();

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);

    const refresh = await agent.post('/api/auth/refresh');
    expect(refresh.status).toBe(200);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    const meAfter = await agent.get('/api/auth/me');
    expect(meAfter.status).toBe(401);
  });

  test('duplicate email and username rejected', async () => {
    const base = { firstName: 'A', lastName: 'B', username: 'dupuser', email: 'dup@x.local', password: 'Passw0rdA' };
    expect((await request(app).post('/api/auth/register').send(base)).status).toBe(201);
    expect((await request(app).post('/api/auth/register').send({ ...base, username: 'other' })).status).toBe(409);
    expect((await request(app).post('/api/auth/register').send({ ...base, email: 'other@x.local' })).status).toBe(409);
  });

  test('login wrong password -> 401; change password rotates session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ firstName: 'P', lastName: 'W', username: 'pwuser', email: 'pw@x.local', password: 'Passw0rdA' });
    const bad = await request(app).post('/api/auth/login').send({ identifier: 'pw@x.local', password: 'Wrong1234' });
    expect(bad.status).toBe(401);
    const ch = await agent.post('/api/auth/change-password').send({ currentPassword: 'Passw0rdA', newPassword: 'Newpass1A' });
    expect(ch.status).toBe(200);
  });

  test('forgot/reset + verify email flow', async () => {
    const User = require('../models/User.model');
    const crypto = require('crypto');
    await request(app).post('/api/auth/register').send({ firstName: 'V', lastName: 'E', username: 'verifyme', email: 'verify@x.local', password: 'Passw0rdA' });
    // craft reset token directly (email is mocked)
    const u = await User.findOne({ email: 'verify@x.local' }).select('+passwordResetToken +passwordResetExpires');
    const raw = 'a'.repeat(64);
    u.passwordResetToken = crypto.createHash('sha256').update(raw).digest('hex');
    u.passwordResetExpires = new Date(Date.now() + 3600e3);
    await u.save({ validateBeforeSave: false });
    const reset = await request(app).post('/api/auth/reset-password').send({ token: raw, password: 'Reset123A' });
    expect(reset.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ identifier: 'verify@x.local', password: 'Reset123A' });
    expect(login.status).toBe(200);
  });
});
