export const LoadingSpinner = ({ label = 'Loading...' }) => (
  <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
    <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
    <span className="text-sm">{label}</span>
  </div>
);

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="card border-red-200 bg-red-50 text-sm text-red-700">
    <p className="font-semibold">Error</p>
    <p>{message || 'Failed to load.'}</p>
    {onRetry && <button className="btn-secondary mt-3" onClick={onRetry}>Retry</button>}
  </div>
);

export const EmptyState = ({ title = 'Nothing here yet', hint = '' }) => (
  <div className="card py-10 text-center text-slate-500">
    <p className="text-lg font-semibold text-slate-700">{title}</p>
    {hint && <p className="mt-1 text-sm">{hint}</p>}
  </div>
);

export const Modal = ({ open, title, children, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="btn-secondary !px-3" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, busy }) => (
  <Modal open={open} title={title} onClose={onCancel}>
    <p className="text-sm text-slate-600">{message}</p>
    <div className="mt-5 flex justify-end gap-2">
      <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      <button className="btn-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Working...' : 'Confirm'}</button>
    </div>
  </Modal>
);
