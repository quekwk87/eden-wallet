
import React, { useEffect } from 'react';

export interface ToastState {
  type: 'success' | 'error';
  message: string;
}

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed inset-x-0 top-20 z-[70] flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
          isSuccess
            ? 'bg-emerald-600 border-emerald-500 text-white'
            : 'bg-rose-600 border-rose-500 text-white'
        }`}
      >
        {isSuccess ? (
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        )}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

export default Toast;
