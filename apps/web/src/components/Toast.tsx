import { useWorkflowStore } from '../store/useWorkflowStore';

export default function Toast() {
  const toasts = useWorkflowStore((state) => state.toasts);
  const removeToast = useWorkflowStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  const getToastColors = (type: 'success' | 'error' | 'warning') => {
    switch (type) {
      case 'error':
        return 'bg-red-950/90 border-error text-error';
      case 'success':
        return 'bg-emerald-950/90 border-success text-success';
      default:
        return 'bg-amber-950/90 border-warning text-warning';
    }
  };

  const getToastIcon = (type: 'success' | 'error' | 'warning') => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 border rounded-xl shadow-2xl backdrop-blur-md animate-slide-in-right ${getToastColors(
            toast.type
          )}`}
        >
          {getToastIcon(toast.type)}
          <div className="flex-1">
            <h4 className="text-xs font-mono uppercase tracking-wider font-bold mb-0.5">
              {toast.type === 'error' ? 'Connection Error' : toast.type === 'success' ? 'Success' : 'Warning'}
            </h4>
            <p className="text-xs leading-relaxed font-sans">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
