// Shared test bootstrap: in-memory replica set (transactions work),
// env secrets, and fixture factories.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-long-xxxx';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-min-32-chars-xx';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.CLIENT_URL = 'http://localhost:5173';

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replset;

const connect = async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = replset.getUri('library_test');
  await mongoose.connect(uri);
};

const disconnect = async () => {
  await mongoose.disconnect();
  if (replset) await replset.stop();
};

const clearAll = async () => {
  const cols = mongoose.connection.collections;
  for (const c of Object.values(cols)) await c.deleteMany({});
  const LibrarySettings = require('../models/LibrarySettings.model');
  LibrarySettings.invalidateCache();
};

const makeUsers = async () => {
  const User = require('../models/User.model');
  const admin = await User.create({ firstName: 'A', lastName: 'Admin', username: 'testadmin', email: 'testadmin@x.local', password: 'Admin1234', role: 'ADMIN', isEmailVerified: true });
  const lib = await User.create({ firstName: 'L', lastName: 'Lib', username: 'testlib', email: 'testlib@x.local', password: 'Librarian1234', role: 'LIBRARIAN', isEmailVerified: true });
  const member = await User.create({ firstName: 'M', lastName: 'Mem', username: 'testmember', email: 'testmember@x.local', password: 'Member1234', role: 'MEMBER', isEmailVerified: true, membershipStartDate: new Date(), membershipExpiryDate: new Date(Date.now() + 365 * 864e5) });
  return { admin, lib, member };
};

const makeCatalog = async () => {
  const Author = require('../models/Author.model');
  const Category = require('../models/Category.model');
  const Publisher = require('../models/Publisher.model');
  const Book = require('../models/Book.model');
  const author = await Author.create({ firstName: 'Test', lastName: 'Author' });
  const category = await Category.create({ name: 'TestCat' });
  const publisher = await Publisher.create({ name: 'TestPub' });
  const book = await Book.create({
    title: 'Test Book', authors: [author._id], publisher: publisher._id, categories: [category._id],
    isbn13: '978-0000000000', language: 'English', totalCopies: 0, availableCopies: 0,
  });
  return { author, category, publisher, book };
};

module.exports = { connect, disconnect, clearAll, makeUsers, makeCatalog };
