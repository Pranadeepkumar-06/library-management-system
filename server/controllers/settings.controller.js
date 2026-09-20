const LibrarySettings = require('../models/LibrarySettings.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logAudit = require('../middleware/audit');

const getSettings = asyncHandler(async (req, res) => {
  const s = await LibrarySettings.getSettings();
  return ApiResponse.success(res, { message: 'Settings fetched', data: { settings: s } });
});

const updateSettings = asyncHandler(async (req, res) => {
  let s = await LibrarySettings.findOne();
  if (!s) s = new LibrarySettings();
  // Ignore empty-string numbers (e.g. cleared finePerDay) so fines/limits can't be zeroed by accident
  const numeric = ['maxBooksPerMember', 'loanDurationDays', 'maximumRenewals', 'finePerDay', 'maximumFine', 'reservationDurationDays', 'membershipDurationDays'];
  const payload = { ...req.body };
  for (const k of numeric) {
    if (payload[k] === '' || payload[k] === undefined || payload[k] === null) delete payload[k];
  }
  Object.assign(s, payload);
  await s.save();
  LibrarySettings.invalidateCache();
  await logAudit({ req, action: 'SETTINGS_UPDATED', entityType: 'LibrarySettings', entityId: s._id, description: 'Library settings updated' });
  return ApiResponse.success(res, { message: 'Settings updated', data: { settings: s } });
});

module.exports = { getSettings, updateSettings };
