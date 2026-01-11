import { useNotificationStore } from '../../store/notificationStore';

const typeStyles = {
  danger: {
    button: 'bg-red-600 hover:bg-red-700',
    icon: '⚠',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  warning: {
    button: 'bg-yellow-600 hover:bg-yellow-700',
    icon: '⚠',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  info: {
    button: 'bg-blue-600 hover:bg-blue-700',
    icon: 'ℹ',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
};

export default function ConfirmDialog() {
  const { confirmDialog, hideConfirm } = useNotificationStore();

  if (!confirmDialog) return null;

  const style = typeStyles[confirmDialog.type || 'info'];

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    hideConfirm();
  };

  const handleCancel = () => {
    confirmDialog.onCancel?.();
    hideConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        {/* Icon */}
        <div className={`w-12 h-12 ${style.iconBg} ${style.iconColor} rounded-xl flex items-center justify-center text-2xl font-bold mb-4`}>
          {style.icon}
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black text-gray-900 mb-3">
          {confirmDialog.title}
        </h3>

        {/* Message */}
        <p className="text-gray-600 text-base leading-relaxed mb-6 whitespace-pre-line">
          {confirmDialog.message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-xl transition-colors"
          >
            {confirmDialog.cancelText || 'Abbrechen'}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 ${style.button} text-white font-bold py-3 px-4 rounded-xl transition-colors`}
          >
            {confirmDialog.confirmText || 'Bestätigen'}
          </button>
        </div>
      </div>
    </div>
  );
}
