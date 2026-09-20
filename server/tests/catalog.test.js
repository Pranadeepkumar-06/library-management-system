const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearAll, makeUsers, makeCatalog } = require('./setup');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clearAll);

const staffLogin = async (email, password) => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: email, password });
  return agent;
};

describe('catalog', () => {
  test('member cannot create author/book; staff can; delete guards work', async () => {
    const { member } = await makeUsers();
    const { author, category, publisher } = await makeCatalog();
    const memberAgent = await staffLogin('testmember@x.local', 'Member1234');
    expect((await memberAgent.post('/api/authors').send({ firstName: 'N', lastName: 'O' })).status).toBe(403);

    const lib = await staffLogin('testlib@x.local', 'Librarian1234');
    const bookRes = await lib.post('/api/books').send({ title: 'Guard Book', authors: [author._id], categories: [category._id], publisher: publisher._id });
    expect(bookRes.status).toBe(201);
    const bookId = bookRes.body.data.book._id;

    // author in use cannot be deleted
    expect((await lib.delete(`/api/authors/${author._id}`)).status).toBe(400);
    // book with no copies can be deleted (admin only)
    const admin = await staffLogin('testadmin@x.local', 'Admin1234');
    expect((await admin.delete(`/api/books/${bookId}`)).status).toBe(200);
    expect(member).toBeDefined();
  });

  test('copies keep book counters consistent; search + pagination meta', async () => {
    await makeUsers();
    const { book } = await makeCatalog();
    const lib = await staffLogin('testlib@x.local', 'Librarian1234');
    const c1 = await lib.post('/api/book-copies').send({ book: book._id });
    const c2 = await lib.post('/api/book-copies').send({ book: book._id });
    expect(c1.status).toBe(201);
    expect(c2.status).toBe(201);

    const Book = require('../models/Book.model');
    const updated = await Book.findById(book._id);
    expect(updated.totalCopies).toBe(2);
    expect(updated.availableCopies).toBe(2);

    const search = await request(app).get('/api/books').query({ search: 'Test', limit: 1, page: 1 });
    expect(search.status).toBe(200);
    expect(search.body.meta).toMatchObject({ page: 1, limit: 1 });
    expect(search.body.meta.total).toBeGreaterThanOrEqual(1);

    const avail = await request(app).get('/api/books').query({ available: 'true' });
    expect(avail.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
