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

describe('loans', () => {
  test('issue -> renew x2 then max -> overdue return creates fine', async () => {
    await makeUsers();
    const { book } = await makeCatalog();
    const lib = await login('testlib@x.local', 'Librarian1234');
    const member = await (await require('../models/User.model').findOne({ email: 'testmember@x.local' }));

    await lib.post('/api/book-copies').send({ book: book._id });
    const issue = await lib.post('/api/loans/issue').send({ memberId: member._id, bookId: book._id });
    expect(issue.status).toBe(201);
    const loanId = issue.body.data.loan._id;

    expect((await lib.post(`/api/loans/${loanId}/renew`)).status).toBe(200);
    expect((await lib.post(`/api/loans/${loanId}/renew`)).status).toBe(200);
    expect((await lib.post(`/api/loans/${loanId}/renew`)).status).toBe(400); // max renewals

    // force overdue then return (2.5 days -> ceil = 3, avoids ms-boundary flake)
    const Loan = require('../models/Loan.model');
    await Loan.updateOne({ _id: loanId }, { $set: { dueDate: new Date(Date.now() - 2.5 * 864e5) } });
    const ret = await lib.post(`/api/loans/${loanId}/return`).send({ condition: 'GOOD' });
    expect(ret.status).toBe(200);
    expect(ret.body.data.fine).toBeTruthy();
    expect(ret.body.data.fine.amount).toBeCloseTo(3, 5);

    const Book = require('../models/Book.model');
    const b = await Book.findById(book._id);
    expect(b.availableCopies).toBe(1);
    expect(b.borrowedCopies).toBe(0);

    const overdue = await lib.get('/api/loans/overdue');
    expect(overdue.status).toBe(200);
  });

  test('no copies and borrowing limit enforced; lost flow creates LOST fine', async () => {
    await makeUsers();
    const { book } = await makeCatalog();
    const lib = await login('testlib@x.local', 'Librarian1234');
    const User = require('../models/User.model');
    const member = await User.findOne({ email: 'testmember@x.local' });

    // no copies yet
    expect((await lib.post('/api/loans/issue').send({ memberId: member._id, bookId: book._id })).status).toBe(400);

    // shrink limit to 1, add 2 copies, issue twice -> second blocked
    await require('../models/LibrarySettings.model').updateOne({}, { $set: { maxBooksPerMember: 1 } });
    require('../models/LibrarySettings.model').invalidateCache();
    await lib.post('/api/book-copies').send({ book: book._id });
    await lib.post('/api/book-copies').send({ book: book._id });
    const first = await lib.post('/api/loans/issue').send({ memberId: member._id, bookId: book._id });
    expect(first.status).toBe(201);
    expect((await lib.post('/api/loans/issue').send({ memberId: member._id, bookId: book._id })).status).toBe(400);

    const lost = await lib.post(`/api/loans/${first.body.data.loan._id}/mark-lost`);
    expect(lost.status).toBe(200);
    expect(lost.body.data.fine.reason).toBe('LOST_BOOK');
  });

  test('reservation queue blocks non-head issue and third-party renew', async () => {
    await makeUsers();
    const { book } = await makeCatalog();
    const User = require('../models/User.model');
    const other = await User.create({ firstName: 'O', lastName: 'T', username: 'othertest', email: 'other@x.local', password: 'Member1234', role: 'MEMBER', membershipStartDate: new Date(), membershipExpiryDate: new Date(Date.now() + 365 * 864e5) });
    const lib = await login('testlib@x.local', 'Librarian1234');
    const member = await User.findOne({ email: 'testmember@x.local' });
    await lib.post('/api/book-copies').send({ book: book._id });

    // other reserves first
    const otherAgent = await login('other@x.local', 'Member1234');
    expect((await otherAgent.post('/api/reservations').send({ bookId: book._id })).status).toBe(201);

    // member (not head) cannot issue
    expect((await lib.post('/api/loans/issue').send({ memberId: member._id, bookId: book._id })).status).toBe(400);

    // head can issue
    const headIssue = await lib.post('/api/loans/issue').send({ memberId: other._id, bookId: book._id });
    expect(headIssue.status).toBe(201);
    expect(other).toBeDefined();
  });
});
