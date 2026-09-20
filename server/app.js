const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiters');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./docs/openapi');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const authorRoutes = require('./routes/authors.routes');
const categoryRoutes = require('./routes/categories.routes');
const publisherRoutes = require('./routes/publishers.routes');
const bookRoutes = require('./routes/books.routes');
const bookCopyRoutes = require('./routes/bookCopies.routes');
const loanRoutes = require('./routes/loans.routes');
const reservationRoutes = require('./routes/reservations.routes');
const fineRoutes = require('./routes/fines.routes');
const settingsRoutes = require('./routes/settings.routes');
const notificationRoutes = require('./routes/notifications.routes');
const auditLogRoutes = require('./routes/auditLogs.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/reports.routes');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'OK', data: { time: new Date().toISOString() } }));
app.get('/api/docs.json', (req, res) => res.json(openapiSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/book-copies', bookCopyRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
