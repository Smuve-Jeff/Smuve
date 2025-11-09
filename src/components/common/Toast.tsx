import React from 'react';
import { useToast } from '../../services/ToastContext';

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onDismiss: () => void }> = React.memo(({ message, type, onDismiss }) => {
  const typeClasses = {
    success: 'bg-green-600/80 border-green-500/50 text-green-200',
    error: 'bg-red-600/80 border-red-500/50 text-red-200',
    info: 'bg-blue-600/80 border-blue-500/50 text-blue-200',
  };

  const iconClasses = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    info: 'fas fa-info-circle',
  };

  return (
    <div className={`toast-item flex items-center gap-4 p-4 rounded-lg shadow-lg backdrop-blur-md ${typeClasses[type]}`}>
      <i className={`${iconClasses[type]} text-xl`}></i>
      <span className="flex-grow">{message}</span>
      <button onClick={onDismiss} className="ml-4 p-1 rounded-full hover:bg-black/20">
        <i className="fas fa-times text-sm"></i>
      </button>
      <style>{`
        @keyframes toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .toast-item {
          animation: toast-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
});
Toast.displayName = 'Toast';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[9999] w-full max-w-sm space-y-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default React.memo(ToastContainer);