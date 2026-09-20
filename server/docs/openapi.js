// OpenAPI 3.0 spec for the Library Management System API.
// Served at /api/docs (Swagger UI) and /api/docs.json (raw).
// Cookie auth: accessToken + refreshToken (httpOnly). Bearer fallback accepted.

const S = (type, extra = {}) => ({ type, ...extra });
const REF = (name) => ({ $ref: `#/components/schemas/${name}` });
const ERR = { type: 'object', properties: { success: { type: 'boolean', example: false }, message: S('string'), error: S('string') } };
const PAGEMETA = { type: 'object', properties: { page: S('integer'), limit: S('integer'), total: S('integer'), totalPages: S('integer'), hasNext: S('boolean'), hasPrev: S('boolean') } };
const OID = { type: 'string', pattern: '^[a-f\\d]{24}$' };

const schemas = {
  User: { type: 'object', properties: { _id: OID, firstName: S('string'), lastName: S('string'), username: S('string'), email: S('string'), role: { type: 'string', enum: ['ADMIN', 'LIBRARIAN', 'MEMBER'] }, status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] }, membershipId: S('string'), isEmailVerified: S('boolean') } },
  Author: { type: 'object', properties: { _id: OID, firstName: S('string'), lastName: S('string'), fullName: S('string'), nationality: S('string') } },
  Category: { type: 'object', properties: { _id: OID, name: S('string'), description: S('string'), status: S('string') } },
  Publisher: { type: 'object', properties: { _id: OID, name: S('string'), country: S('string') } },
  Book: { type: 'object', properties: { _id: OID, title: S('string'), isbn13: S('string'), language: S('string'), bookFormat: S('string'), totalCopies: S('integer'), availableCopies: S('integer'), borrowedCopies: S('integer'), status: S('string') } },
  BookCopy: { type: 'object', properties: { _id: OID, book: OID, accessionNumber: S('string'), barcode: S('string'), copyNumber: S('integer'), status: { type: 'string', enum: ['AVAILABLE', 'BORROWED', 'RESERVED', 'LOST', 'DAMAGED', 'MAINTENANCE'] } } },
  Loan: { type: 'object', properties: { _id: OID, member: OID, book: OID, bookCopy: OID, dueDate: S('string', { format: 'date-time' }), status: { type: 'string', enum: ['BORROWED', 'RETURNED', 'OVERDUE', 'LOST'] }, renewalCount: S('integer') } },
  Reservation: { type: 'object', properties: { _id: OID, member: OID, book: OID, status: { type: 'string', enum: ['ACTIVE', 'FULFILLED', 'CANCELLED', 'EXPIRED'] }, queuePosition: S('integer') } },
  Fine: { type: 'object', properties: { _id: OID, member: OID, loan: OID, amount: S('number'), reason: S('string'), status: { type: 'string', enum: ['PENDING', 'PAID', 'WAIVED'] } } },
  Notification: { type: 'object', properties: { _id: OID, type: S('string'), title: S('string'), message: S('string'), isRead: S('boolean') } },
  Settings: { type: 'object', properties: { maxBooksPerMember: S('integer'), loanDurationDays: S('integer'), maximumRenewals: S('integer'), finePerDay: S('number'), maximumFine: S('number'), reservationDurationDays: S('integer'), allowReservations: S('boolean'), allowRenewals: S('boolean') } },
};

const sec = (roles) => ({ security: [{ cookieAuth: [] }], 'x-roles': roles });
const ok = (schema, meta) => ({ description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: S('string'), data: schema || S('object'), ...(meta ? { meta: PAGEMETA } : {}) } } } } });
const paged = (item) => ok({ type: 'array', items: REF(item) }, true);
const errRes = { 400: { description: 'Bad request', content: { 'application/json': { schema: ERR } } }, 401: { description: 'Unauthorized', content: { 'application/json': { schema: ERR } } }, 403: { description: 'Forbidden', content: { 'application/json': { schema: ERR } } }, 404: { description: 'Not found', content: { 'application/json': { schema: ERR } } }, 409: { description: 'Conflict', content: { 'application/json': { schema: ERR } } } };
const qp = (name, extra = {}) => ({ name, in: 'query', schema: S('string', extra) });
const pageParams = [qp('page'), qp('limit'), qp('sort'), qp('search')];
const idParam = { name: 'id', in: 'path', required: true, schema: OID };
const body = (schema, required = true) => ({ required, content: { 'application/json': { schema } } });

const paths = {
  '/auth/register': { post: { tags: ['Auth'], summary: 'Register (always MEMBER)', requestBody: body({ type: 'object', properties: { firstName: S('string'), lastName: S('string'), username: S('string'), email: S('string'), password: S('string'), phone: S('string') } }), responses: { 201: ok(REF('User')), ...errRes } } },
  '/auth/login': { post: { tags: ['Auth'], summary: 'Login, sets access+refresh cookies', requestBody: body({ type: 'object', properties: { identifier: S('string'), password: S('string') } }), responses: { 200: ok(REF('User')), ...errRes } } },
  '/auth/logout': { post: { tags: ['Auth'], summary: 'Logout, clears cookies', responses: { 200: ok() } } },
  '/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotate tokens via refresh cookie', responses: { 200: ok(REF('User')), ...errRes } } },
  '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), responses: { 200: ok(REF('User')), ...errRes } } },
  '/auth/forgot-password': { post: { tags: ['Auth'], summary: 'Request reset link (always 200)', requestBody: body({ type: 'object', properties: { email: S('string') } }), responses: { 200: ok() } } },
  '/auth/reset-password': { post: { tags: ['Auth'], summary: 'Reset with token', requestBody: body({ type: 'object', properties: { token: S('string'), password: S('string') } }), responses: { 200: ok(), ...errRes } } },
  '/auth/verify-email': { post: { tags: ['Auth'], summary: 'Verify email', requestBody: body({ type: 'object', properties: { token: S('string'), email: S('string') } }), responses: { 200: ok(), ...errRes } } },
  '/auth/change-password': { post: { tags: ['Auth'], summary: 'Change password (rotates session)', ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), requestBody: body({ type: 'object', properties: { currentPassword: S('string'), newPassword: S('string') } }), responses: { 200: ok(), ...errRes } } },

  '/users': {
    get: { tags: ['Users'], summary: 'List users (?role=&status=&search=)', ...sec(['ADMIN', 'LIBRARIAN']), parameters: [...pageParams, qp('role'), qp('status')], responses: { 200: paged('User'), ...errRes } },
    post: { tags: ['Users'], summary: 'Create user (librarians: MEMBER only)', ...sec(['ADMIN', 'LIBRARIAN']), requestBody: body(REF('User')), responses: { 201: ok(REF('User')), ...errRes } },
  },
  '/users/{id}': {
    get: { tags: ['Users'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [idParam], responses: { 200: ok(REF('User')), ...errRes } },
    put: { tags: ['Users'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], requestBody: body(REF('User')), responses: { 200: ok(REF('User')), ...errRes } },
    delete: { tags: ['Users'], summary: 'Delete (blocked with loan history)', ...sec(['ADMIN']), parameters: [idParam], responses: { 200: ok(), ...errRes } },
  },
  '/users/{id}/status': { patch: { tags: ['Users'], ...sec(['ADMIN']), parameters: [idParam], requestBody: body({ type: 'object', properties: { status: S('string') } }), responses: { 200: ok(REF('User')), ...errRes } } },

  '/books': {
    get: { tags: ['Books'], summary: 'Search (?search=&author=&category=&publisher=&language=&year=&isbn=&format=&available=true&status=)', parameters: [...pageParams, qp('author'), qp('category'), qp('publisher'), qp('language'), qp('year'), qp('isbn'), qp('format'), qp('available'), qp('status')], responses: { 200: paged('Book') } },
    post: { tags: ['Books'], ...sec(['ADMIN', 'LIBRARIAN']), requestBody: body(REF('Book')), responses: { 201: ok(REF('Book')), ...errRes } },
  },
  '/books/{id}': {
    get: { tags: ['Books'], parameters: [idParam], responses: { 200: ok(REF('Book')), ...errRes } },
    put: { tags: ['Books'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], requestBody: body(REF('Book')), responses: { 200: ok(REF('Book')), ...errRes } },
    delete: { tags: ['Books'], summary: 'Delete (blocked with copies/history, archive instead)', ...sec(['ADMIN']), parameters: [idParam], responses: { 200: ok(), ...errRes } },
  },
  '/books/{id}/copies': { get: { tags: ['Books'], parameters: [idParam], responses: { 200: ok(), ...errRes } } },

  '/authors': { get: { tags: ['Catalog'], parameters: pageParams, responses: { 200: paged('Author') } }, post: { tags: ['Catalog'], ...sec(['ADMIN', 'LIBRARIAN']), requestBody: body(REF('Author')), responses: { 201: ok(REF('Author')), ...errRes } } },
  '/authors/{id}': { get: { tags: ['Catalog'], parameters: [idParam], responses: { 200: ok(REF('Author')), ...errRes } }, put: { tags: ['Catalog'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], requestBody: body(REF('Author')), responses: { 200: ok(REF('Author')), ...errRes } }, delete: { tags: ['Catalog'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], responses: { 200: ok(), ...errRes } } },
  '/categories': { get: { tags: ['Catalog'], parameters: pageParams, responses: { 200: paged('Category') } }, post: { tags: ['Catalog'], ...sec(['ADMIN', 'LIBRARIAN']), requestBody: body(REF('Category')), responses: { 201: ok(REF('Category')), ...errRes } } },
  '/categories/{id}': { get: { tags: ['Catalog'], parameters: [idParam], responses: { 200: ok(REF('Category')), ...errRes } }, put: { tags: ['Catalog'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], requestBody: body(REF('Category')), responses: { 200: ok(REF('Category')), ...errRes } }, delete: { tags: ['Catalog'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], responses: { 200: ok(), ...errRes } } },
  '/publishers': { get: { tags: ['Catalog'], parameters: pageParams, responses: { 200: paged('Publisher') } }, post: { tags: ['Catalog'], ...sec(['ADMIN', 'LIBRARIAN']), requestBody: body(REF('Publisher')), responses: { 201: ok(REF('Publisher')), ...errRes } } },
  '/publishers/{id}': { get: { tags: ['Catalog'], parameters: [idParam], responses: { 200: ok(REF('Publisher')), ...errRes } }, put: { tags: ['Catalog'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], requestBody: body(REF('Publisher')), responses: { 200: ok(REF('Publisher')), ...errRes } }, delete: { tags: ['Catalog'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], responses: { 200: ok(), ...errRes } } },

  '/book-copies': { get: { tags: ['Copies'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [...pageParams, qp('book'), qp('status')], responses: { 200: paged('BookCopy'), ...errRes } }, post: { tags: ['Copies'], summary: 'Create copy (transaction bumps book counters)', ...sec(['ADMIN', 'LIBRARIAN']), requestBody: body(REF('BookCopy')), responses: { 201: ok(REF('BookCopy')), ...errRes } } },
  '/book-copies/{id}': { get: { tags: ['Copies'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], responses: { 200: ok(REF('BookCopy')), ...errRes } }, put: { tags: ['Copies'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], requestBody: body(REF('BookCopy')), responses: { 200: ok(REF('BookCopy')), ...errRes } }, delete: { tags: ['Copies'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], responses: { 200: ok(), ...errRes } } },

  '/loans': { get: { tags: ['Loans'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [...pageParams, qp('member'), qp('status'), qp('book')], responses: { 200: paged('Loan'), ...errRes } } },
  '/loans/issue': { post: { tags: ['Loans'], summary: 'Issue (limit/fines/queue/availability checks, transaction)', ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), requestBody: body({ type: 'object', properties: { memberId: OID, bookId: OID, bookCopyId: OID, notes: S('string') } }), responses: { 201: ok(REF('Loan')), ...errRes } } },
  '/loans/overdue': { get: { tags: ['Loans'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: pageParams, responses: { 200: paged('Loan'), ...errRes } } },
  '/loans/member/{memberId}': { get: { tags: ['Loans'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [{ name: 'memberId', in: 'path', required: true, schema: OID }], responses: { 200: paged('Loan'), ...errRes } } },
  '/loans/{id}': { get: { tags: ['Loans'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [idParam], responses: { 200: ok(REF('Loan')), ...errRes } } },
  '/loans/{id}/return': { post: { tags: ['Loans'], summary: 'Return (?condition GOOD|DAMAGED|LOST), fine + queue hold', ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], requestBody: body({ type: 'object', properties: { condition: S('string'), notes: S('string') } }), responses: { 200: ok(), ...errRes } } },
  '/loans/{id}/renew': { post: { tags: ['Loans'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [idParam], responses: { 200: ok(REF('Loan')), ...errRes } } },
  '/loans/{id}/mark-lost': { post: { tags: ['Loans'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], responses: { 200: ok(), ...errRes } } },

  '/reservations': { get: { tags: ['Reservations'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [...pageParams, qp('book'), qp('status')], responses: { 200: paged('Reservation'), ...errRes } }, post: { tags: ['Reservations'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), requestBody: body({ type: 'object', properties: { bookId: OID, memberId: OID } }), responses: { 201: ok(REF('Reservation')), ...errRes } } },
  '/reservations/{id}': { delete: { tags: ['Reservations'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [idParam], responses: { 200: ok(), ...errRes } } },
  '/reservations/{id}/issue': {
    post: { tags: ['Reservations'], summary: 'One-click issue to this reservation member (queue-head enforced)', ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], responses: { 201: ok(REF('Loan')), ...errRes } },
  },

  '/fines': { get: { tags: ['Fines'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [...pageParams, qp('status'), qp('reason')], responses: { 200: paged('Fine'), ...errRes } }, post: { tags: ['Fines'], ...sec(['ADMIN', 'LIBRARIAN']), requestBody: body(REF('Fine')), responses: { 201: ok(REF('Fine')), ...errRes } } },
  '/fines/{id}': { get: { tags: ['Fines'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [idParam], responses: { 200: ok(REF('Fine')), ...errRes } } },
  '/fines/{id}/pay': { patch: { tags: ['Fines'], ...sec(['ADMIN', 'LIBRARIAN']), parameters: [idParam], responses: { 200: ok(REF('Fine')), ...errRes } } },
  '/fines/{id}/waive': { patch: { tags: ['Fines'], ...sec(['ADMIN']), parameters: [idParam], responses: { 200: ok(REF('Fine')), ...errRes } } },

  '/notifications': { get: { tags: ['Notifications'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: pageParams, responses: { 200: paged('Notification'), ...errRes } } },
  '/notifications/unread-count': { get: { tags: ['Notifications'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), responses: { 200: ok() } } },
  '/notifications/read-all': { patch: { tags: ['Notifications'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), responses: { 200: ok() } } },
  '/notifications/{id}/read': { patch: { tags: ['Notifications'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), parameters: [idParam], responses: { 200: ok(), ...errRes } } },
  '/notifications/broadcast': { post: { tags: ['Notifications'], ...sec(['ADMIN']), requestBody: body({ type: 'object', properties: { title: S('string'), message: S('string'), type: S('string'), role: S('string'), userId: OID } }), responses: { 201: ok(), ...errRes } } },

  '/audit-logs': { get: { tags: ['Audit'], ...sec(['ADMIN']), parameters: [...pageParams, qp('action'), qp('entityType')], responses: { 200: paged('Notification'), ...errRes } } },
  '/settings': { get: { tags: ['Settings'], responses: { 200: ok(REF('Settings')) } }, put: { tags: ['Settings'], ...sec(['ADMIN']), requestBody: body(REF('Settings')), responses: { 200: ok(REF('Settings')), ...errRes } } },
  '/dashboard/admin': { get: { tags: ['Dashboard'], ...sec(['ADMIN']), responses: { 200: ok(), ...errRes } } },
  '/dashboard/librarian': { get: { tags: ['Dashboard'], ...sec(['ADMIN', 'LIBRARIAN']), responses: { 200: ok(), ...errRes } } },
  '/dashboard/member': { get: { tags: ['Dashboard'], ...sec(['ADMIN', 'LIBRARIAN', 'MEMBER']), responses: { 200: ok(), ...errRes } } },
  '/reports/most-borrowed': { get: { tags: ['Reports'], ...sec(['ADMIN', 'LIBRARIAN']), responses: { 200: ok(), ...errRes } } },
  '/reports/run-overdue': { post: { tags: ['Reports'], summary: 'Manually trigger overdue marking + fine upsert', ...sec(['ADMIN']), responses: { 200: ok(), ...errRes } } },
};

module.exports = {
  openapi: '3.0.3',
  info: { title: 'Library Management System API', version: '1.0.0', description: 'Cookie JWT (accessToken/refreshToken) + Bearer fallback. Roles: ADMIN, LIBRARIAN, MEMBER.' },
  servers: [{ url: 'http://localhost:5000/api' }],
  tags: [{ name: 'Auth' }, { name: 'Users' }, { name: 'Books' }, { name: 'Catalog' }, { name: 'Copies' }, { name: 'Loans' }, { name: 'Reservations' }, { name: 'Fines' }, { name: 'Notifications' }, { name: 'Audit' }, { name: 'Settings' }, { name: 'Dashboard' }, { name: 'Reports' }],
  paths,
  components: { schemas, securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'accessToken' } } },
};
