const cron = require('node-cron');
const mongoose = require('mongoose');
const Loan = require('../models/Loan.model');
const Fine = require('../models/Fine.model');
const Reservation = require('../models/Reservation.model');
const BookCopy = require('../models/BookCopy.model');
const Notification = require('../models/Notification.model');
const LibrarySettings = require('../models/LibrarySettings.model');
const logger = require('../config/logger');

const DAY = 864e5;

// Mark BORROWED loans past due as OVERDUE + upsert pending late fines.
// Expire stale ACTIVE reservations.
const processOverdue = async () => {
  const settings = await LibrarySettings.getSettings();
  const now = new Date();

  const overdueLoans = await Loan.find({ status: 'BORROWED', dueDate: { $lt: now } }).limit(500);
  let marked = 0;
  let finesTouched = 0;

  for (const loan of overdueLoans) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        loan.status = 'OVERDUE';
        await loan.save({ session });
        const days = Math.max(1, Math.ceil((now - new Date(loan.dueDate)) / DAY));
        const amount = Math.min(days * settings.finePerDay, settings.maximumFine);
        if (amount > 0) {
          const existing = await Fine.findOne({ loan: loan._id, reason: 'LATE_RETURN', status: 'PENDING' }).session(session);
          if (existing) {
            if (existing.amount !== amount) {
              existing.amount = amount;
              existing.notes = `${days} day(s) overdue`;
              await existing.save({ session });
              finesTouched++;
            }
          } else {
            await Fine.create([{
              member: loan.member, loan: loan._id, amount, reason: 'LATE_RETURN',
              status: 'PENDING', dueDate: new Date(now.getTime() + 14 * DAY),
              notes: `${days} day(s) overdue`,
            }], { session });
            finesTouched++;
          }
        }
        await Notification.create([{
          user: loan.member, type: 'BOOK_OVERDUE', title: 'Book overdue',
          message: `Loan is ${Math.ceil((now - new Date(loan.dueDate)) / DAY)} day(s) overdue. Please return it.`,
        }], { session });
      });
      marked++;
    } catch (e) {
      logger.warn(`Overdue processing failed for ${loan._id}: ${e.message}`);
    } finally {
      await session.endSession();
    }
  }

  // Expire reservations, releasing any held copies
  const stale = await Reservation.find({ status: 'ACTIVE', expiryDate: { $lt: now } }).limit(200);
  let expiredCount = 0;
  for (const r of stale) {
    try {
      if (r.bookCopy) {
        const held = await BookCopy.findById(r.bookCopy);
        if (held && held.status === 'RESERVED') {
          held.status = 'AVAILABLE';
          await held.save();
          const Book = require('../models/Book.model');
          await Book.updateOne({ _id: r.book }, { $inc: { reservedCopies: -1, availableCopies: 1 } });
        }
        r.bookCopy = undefined;
      }
      r.status = 'EXPIRED';
      await r.save();
      expiredCount++;
    } catch (e) {
      logger.warn(`Reservation expiry failed for ${r._id}: ${e.message}`);
    }
  }

  // Top-up amounts on already-overdue loans (days keep growing, no duplicates)
  const stillOverdue = await Loan.find({ status: 'OVERDUE' }).limit(500);
  for (const loan of stillOverdue) {
    const days = Math.max(1, Math.ceil((now - new Date(loan.dueDate)) / DAY));
    const amount = Math.min(days * settings.finePerDay, settings.maximumFine);
    const existing = await Fine.findOne({ loan: loan._id, reason: 'LATE_RETURN', status: 'PENDING' });
    if (existing && existing.amount !== amount) {
      existing.amount = amount;
      existing.notes = `${days} day(s) overdue`;
      await existing.save();
      finesTouched++;
    }
  }

  logger.info(`Overdue job: marked=${marked} finesTouched=${finesTouched} reservationsExpired=${expiredCount}`);
  return { marked, finesTouched, reservationsExpired: expiredCount };
};

const startOverdueJob = () => {
  // Hourly at minute 0
  cron.schedule('0 * * * *', () => {
    processOverdue().catch((e) => logger.error(`Overdue job failed: ${e.message}`));
  });
  logger.info('Overdue cron scheduled (hourly)');
};

module.exports = { processOverdue, startOverdueJob };
