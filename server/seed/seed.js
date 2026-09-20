/* Seed catalog + users. Usage: npm run seed
   Creates 1 ADMIN, 1 LIBRARIAN, 5 MEMBERS, 10 AUTHORS,
   10 CATEGORIES, 5 PUBLISHERS, 20 BOOKS + 3-5 copies each.
*/
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/User.model');
const Author = require('../models/Author.model');
const Category = require('../models/Category.model');
const Publisher = require('../models/Publisher.model');
const Book = require('../models/Book.model');
const BookCopy = require('../models/BookCopy.model');
const LibrarySettings = require('../models/LibrarySettings.model');

const CATEGORIES = [
  { name: 'Computer Science', description: 'Computing fundamentals' },
  { name: 'Cybersecurity', description: 'Security and cryptography' },
  { name: 'Networking', description: 'Networks and protocols' },
  { name: 'Programming', description: 'Software development' },
  { name: 'Database', description: 'Data storage and SQL' },
  { name: 'Artificial Intelligence', description: 'AI and ML' },
  { name: 'Machine Learning', description: 'ML systems' },
  { name: 'Fiction', description: 'Novels and stories' },
  { name: 'History', description: 'Historical works' },
  { name: 'Science', description: 'General science' },
];

const AUTHORS = [
  { firstName: 'Robert', lastName: 'Martin', nationality: 'American', biography: 'Clean Code author' },
  { firstName: 'Andrew', lastName: 'Tanenbaum', nationality: 'American', biography: 'OS and networks' },
  { firstName: 'Thomas', lastName: 'Cormen', nationality: 'American', biography: 'Algorithms' },
  { firstName: 'Abraham', lastName: 'Silberschatz', nationality: 'American', biography: 'Databases and OS' },
  { firstName: 'Stuart', lastName: 'Russell', nationality: 'British', biography: 'AI researcher' },
  { firstName: 'Ian', lastName: 'Goodfellow', nationality: 'American', biography: 'Deep learning' },
  { firstName: 'George', lastName: 'Orwell', nationality: 'British', biography: 'Dystopian fiction' },
  { firstName: 'Yuval', lastName: 'Harari', nationality: 'Israeli', biography: 'Historian' },
  { firstName: 'Bruce', lastName: 'Schneier', nationality: 'American', biography: 'Security expert' },
  { firstName: 'Martin', lastName: 'Fowler', nationality: 'British', biography: 'Refactoring' },
];

const PUBLISHERS = [
  { name: 'Prentice Hall', country: 'USA' },
  { name: 'MIT Press', country: 'USA' },
  { name: 'OReilly Media', country: 'USA' },
  { name: 'Penguin Books', country: 'UK' },
  { name: 'Springer', country: 'Germany' },
];

const BOOKS = [
  { title: 'Clean Code', authors: [0], publisher: 2, categories: [3], isbn13: '978-0132350884', language: 'English', pages: 464, bookFormat: 'PAPERBACK' },
  { title: 'The Pragmatic Programmer', authors: [9], publisher: 2, categories: [3], isbn13: '978-0135957059', language: 'English', pages: 352, bookFormat: 'HARDCOVER' },
  { title: 'Introduction to Algorithms', authors: [2], publisher: 1, categories: [0], isbn13: '978-0262033848', language: 'English', pages: 1312, bookFormat: 'HARDCOVER' },
  { title: 'Computer Networks', authors: [1], publisher: 0, categories: [2], isbn13: '978-0132126953', language: 'English', pages: 960, bookFormat: 'PAPERBACK' },
  { title: 'Operating System Concepts', authors: [3], publisher: 0, categories: [0], isbn13: '978-1118063330', language: 'English', pages: 1120, bookFormat: 'HARDCOVER' },
  { title: 'Artificial Intelligence: A Modern Approach', authors: [4], publisher: 0, categories: [5], isbn13: '978-0134610993', language: 'English', pages: 1136, bookFormat: 'HARDCOVER' },
  { title: 'Deep Learning', authors: [5], publisher: 1, categories: [6], isbn13: '978-0262035613', language: 'English', pages: 800, bookFormat: 'HARDCOVER' },
  { title: '1984', authors: [6], publisher: 3, categories: [7], isbn13: '978-0451524935', language: 'English', pages: 328, bookFormat: 'PAPERBACK' },
  { title: 'Sapiens', authors: [7], publisher: 3, categories: [8], isbn13: '978-0062316097', language: 'English', pages: 464, bookFormat: 'PAPERBACK' },
  { title: 'Applied Cryptography', authors: [8], publisher: 0, categories: [1], isbn13: '978-0471117094', language: 'English', pages: 758, bookFormat: 'HARDCOVER' },
  { title: 'Refactoring', authors: [9], publisher: 2, categories: [3], isbn13: '978-0134757599', language: 'English', pages: 448, bookFormat: 'PAPERBACK' },
  { title: 'Database System Concepts', authors: [3], publisher: 4, categories: [4], isbn13: '978-0073523323', language: 'English', pages: 1376, bookFormat: 'HARDCOVER' },
  { title: 'Computer Networking: Top-Down', authors: [1], publisher: 0, categories: [2], isbn13: '978-0133594140', language: 'English', pages: 864, bookFormat: 'PAPERBACK' },
  { title: 'Pattern Recognition and ML', authors: [5], publisher: 4, categories: [6], isbn13: '978-0387310732', language: 'English', pages: 738, bookFormat: 'HARDCOVER' },
  { title: 'Animal Farm', authors: [6], publisher: 3, categories: [7], isbn13: '978-0451526342', language: 'English', pages: 140, bookFormat: 'PAPERBACK' },
  { title: 'Homo Deus', authors: [7], publisher: 3, categories: [8], isbn13: '978-0062464316', language: 'English', pages: 448, bookFormat: 'HARDCOVER' },
  { title: 'Secrets and Lies', authors: [8], publisher: 0, categories: [1], isbn13: '978-0471453808', language: 'English', pages: 432, bookFormat: 'PAPERBACK' },
  { title: 'Clean Architecture', authors: [0], publisher: 0, categories: [3], isbn13: '978-0134494166', language: 'English', pages: 432, bookFormat: 'PAPERBACK' },
  { title: 'A Brief History of Time', authors: [7], publisher: 4, categories: [9], isbn13: '978-0553380163', language: 'English', pages: 212, bookFormat: 'PAPERBACK' },
  { title: 'The Mythical Man-Month', authors: [9], publisher: 2, categories: [3], isbn13: '978-0201835953', language: 'English', pages: 332, bookFormat: 'PAPERBACK' },
];

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected, seeding...');

  await Promise.all([
    User.deleteMany({ email: /@library\.local$/ }),
    Author.deleteMany({}),
    Category.deleteMany({}),
    Publisher.deleteMany({}),
    Book.deleteMany({}),
    BookCopy.deleteMany({}),
  ]);
  await LibrarySettings.getSettings();

  const users = await User.create([
    { firstName: 'Admin', lastName: 'User', username: 'admin', email: 'admin@library.local', password: 'Admin1234', role: 'ADMIN', isEmailVerified: true },
    { firstName: 'Libby', lastName: 'Rarian', username: 'librarian', email: 'librarian@library.local', password: 'Librarian1234', role: 'LIBRARIAN', isEmailVerified: true },
    ...[1, 2, 3, 4, 5].map((i) => ({
      firstName: `Member${i}`, lastName: 'User', username: `member${i}`, email: `member${i}@library.local`,
      password: 'Member1234', role: 'MEMBER', isEmailVerified: true,
      membershipStartDate: new Date(), membershipExpiryDate: new Date(Date.now() + 365 * 864e5),
    })),
  ]);
  console.log(`Users: ${users.length}`);

  const cats = await Category.create(CATEGORIES);
  const auths = await Author.create(AUTHORS);
  const pubs = await Publisher.create(PUBLISHERS);

  const adminId = users[0]._id;
  const bookDocs = [];
  for (const b of BOOKS) {
    const doc = await Book.create({
      title: b.title,
      authors: b.authors.map((i) => auths[i]._id),
      publisher: pubs[b.publisher]._id,
      categories: b.categories.map((i) => cats[i]._id),
      isbn13: b.isbn13,
      language: b.language,
      pages: b.pages,
      bookFormat: b.bookFormat,
      shelfLocation: 'A-1',
      rackNumber: 'R-1',
      totalCopies: 0, availableCopies: 0, borrowedCopies: 0, reservedCopies: 0, damagedCopies: 0, lostCopies: 0,
      status: 'AVAILABLE',
      createdBy: adminId,
    });
    bookDocs.push(doc);
  }
  console.log(`Books: ${bookDocs.length}`);

  let copyTotal = 0;
  for (let bi = 0; bi < bookDocs.length; bi++) {
    const book = bookDocs[bi];
    const n = 3 + (bi % 3); // 3-5 copies
    const prefix = book.title.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.slice(0, 2)).join('').slice(0, 4) || 'BK';
    for (let c = 1; c <= n; c++) {
      const acc = `${prefix}-${String(c).padStart(3, '0')}-${String(bi + 1).padStart(2, '0')}`;
      await BookCopy.create({
        book: book._id, accessionNumber: acc, barcode: `${acc}-BC`, copyNumber: c,
        condition: 'GOOD', status: 'AVAILABLE', shelfLocation: 'A-1',
      });
      copyTotal++;
    }
    await Book.updateOne({ _id: book._id }, { $set: { totalCopies: n, availableCopies: n } });
  }
  console.log(`Copies: ${copyTotal}`);
  console.log('\nLogins: admin@library.local/Admin1234, librarian@library.local/Librarian1234, member1@library.local/Member1234');
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
