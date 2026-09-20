const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearAll, makeUsers, makeCatalog } = require('./setup');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearAll);

const login = async (email, password) => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: email, password });
  return agent;
};

describe('reservations + fines', () => {
  test('duplicate active reservation -> 409; cancel works', async () => {
    await makeUsers();
    const { book } = await makeCatalog();
    const memberAgent = await login('testmember@x.local', 'Member1234');
    expect((await memberAgent.post('/api/reservations').send({ bookId: book._id })).status).toBe(201);
    expect((await memberAgent.post('/api/reservations').send({ bookId: book._id })).status).toBe(409);
    const list = await memberAgent.get('/api/reservations');
    expect(list.body.data.length).toBe(1);
    expect((await memberAgent.delete(`/api/reservations/${list.body.data[0]._id}`)).status).toBe(200);
  });

  test('one-click issue from reservation (head only, needs available copy)', async () => {
    await makeUsers();
    const { book } = await makeCatalog();
    const lib = await login('testlib@x.local', 'Librarian1234');
    const memberAgent = await login('testmember@x.local', 'Member1234');

    expect((await memberAgent.post('/api/reservations').send({ bookId: book._id })).status).toBe(201);
    const list = await lib.get('/api/reservations');
    const resId = list.body.data[0]._id;

    // no copies yet -> button would be disabled, API refuses
    expect((await lib.post(`/api/reservations/${resId}/issue`).send({})).status).toBe(400);

    await lib.post('/api/book-copies').send({ book: book._id });
    const issued = await lib.post(`/api/reservations/${resId}/issue`).send({});
    expect(issued.status).toBe(201);

    const Reservation = require('../models/Reservation.model');
    const r = await Reservation.findById(resId);
    expect(r.status).toBe('FULFILLED');
    expect(r.fulfilledLoan).toBeTruthy();
    expect(r.bookCopy).toBeTruthy();

    // member endpoint forbidden for one-click issue
    expect((await memberAgent.post(`/api/reservations/${resId}/issue`).send({})).status).toBe(403);
  });

  test('fine pay (staff) and waive (admin-only)', async () => {
    await makeUsers();
    const { book } = await makeCatalog();
    const lib = await login('testlib@x.local', 'Librarian1234');
    const admin = await login('testadmin@x.local', 'Admin1234');
    const memberAgent = await login('testmember@x.local', 'Member1234');
    const User = require('../models/User.model');
    const member = await User.findOne({ email: 'testmember@x.local' });

    const created = await lib.post('/api/fines').send({ memberId: member._id, amount: 12.5, reason: 'DAMAGED_BOOK' });
    expect(created.status).toBe(201);
    const fineId = created.body.data.fine._id;

    expect((await memberAgent.patch(`/api/fines/${fineId}/pay`).send({})).status).toBe(403);
    expect((await lib.patch(`/api/fines/${fineId}/pay`).send({ paymentMethod: 'CASH' })).status).toBe(200);

    const f2 = await lib.post('/api/fines').send({ memberId: member._id, amount: 5, reason: 'OTHER' });
    expect((await lib.patch(`/api/fines/${f2.body.data.fine._id}/waive`).send({})).status).toBe(403);
    expect((await admin.patch(`/api/fines/${f2.body.data.fine._id}/waive`).send({})).status).toBe(200);
    expect(book).toBeDefined();
  });
});

describe('platform: users, settings, dashboards, notifications, audit, reports', () => {
  test('user admin flow + member self-view only', async () => {
    await makeUsers();
    const admin = await login('testadmin@x.local', 'Admin1234');
    const memberAgent = await login('testmember@x.local', 'Member1234');

    const created = await admin.post('/api/users').send({ firstName: 'N', lastName: 'U', username: 'newu', email: 'newu@x.local', password: 'Passw0rdA', role: 'MEMBER' });
    expect(created.status).toBe(201);
    const uid = created.body.data.user._id;

    // member cannot list users
    expect((await memberAgent.get('/api/users')).status).toBe(403);
    // member cannot view another user
    expect((await memberAgent.get(`/api/users/${uid}`)).status).toBe(403);

    expect((await admin.patch(`/api/users/${uid}/status`).send({ status: 'SUSPENDED' })).status).toBe(200);
    const loginSuspended = await request(app).post('/api/auth/login').send({ identifier: 'newu@x.local', password: 'Passw0rdA' });
    expect(loginSuspended.status).toBe(403);
  });

  test('settings + dashboards + notifications + audit + reports smoke', async () => {
    await makeUsers();
    await makeCatalog();
    const admin = await login('testadmin@x.local', 'Admin1234');
    const lib = await login('testlib@x.local', 'Librarian1234');
    const memberAgent = await login('testmember@x.local', 'Member1234');

    expect((await request(app).get('/api/settings')).status).toBe(200);
    expect((await admin.put('/api/settings').send({ loanDurationDays: 21 })).status).toBe(200);
    expect((await memberAgent.put('/api/settings').send({ loanDurationDays: 21 })).status).toBe(403);

    expect((await admin.get('/api/dashboard/admin')).status).toBe(200);
    expect((await lib.get('/api/dashboard/librarian')).status).toBe(200);
    expect((await memberAgent.get('/api/dashboard/member')).status).toBe(200);
    expect((await memberAgent.get('/api/dashboard/admin')).status).toBe(403);

    expect((await memberAgent.get('/api/notifications')).status).toBe(200);
    expect((await memberAgent.get('/api/notifications/unread-count')).status).toBe(200);
    expect((await admin.get('/api/audit-logs')).status).toBe(200);
    expect((await memberAgent.get('/api/audit-logs')).status).toBe(403);
    expect((await admin.get('/api/reports/most-borrowed')).status).toBe(200);
    expect((await admin.get('/api/reports/fines')).status).toBe(200);
    expect((await memberAgent.get('/api/reports/most-borrowed')).status).toBe(403);
  });

  test('clear notifications (own only) + manual overdue run + settings blank guard', async () => {
    await makeUsers();
    const admin = await login('testadmin@x.local', 'Admin1234');
    const memberAgent = await login('testmember@x.local', 'Member1234');
    const Notification = require('../models/Notification.model');
    const User = require('../models/User.model');
    const member = await User.findOne({ email: 'testmember@x.local' });
    await Notification.create({ user: member._id, type: 'SYSTEM', title: 'T1', message: 'm' });
    await Notification.create({ user: member._id, type: 'SYSTEM', title: 'T2', message: 'm' });

    const cleared = await memberAgent.delete('/api/notifications');
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.cleared).toBe(2);
    expect(await Notification.countDocuments({ user: member._id })).toBe(0);

    const run = await admin.post('/api/reports/run-overdue').send({});
    expect(run.status).toBe(200);
    expect(run.body.data).toMatchObject({ marked: 0 });
    expect((await memberAgent.post('/api/reports/run-overdue').send({})).status).toBe(403);

    // blank numeric fields must not zero out finePerDay/maximumFine
    const before = (await admin.get('/api/settings')).body.data.settings;
    expect((await admin.put('/api/settings').send({ finePerDay: '', maximumFine: '' })).status).toBe(200);
    const after = (await admin.get('/api/settings')).body.data.settings;
    expect(after.finePerDay).toBe(before.finePerDay);
    expect(after.maximumFine).toBe(before.maximumFine);
  });
});
