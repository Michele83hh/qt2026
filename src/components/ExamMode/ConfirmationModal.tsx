interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'warning' | 'danger' | 'info';
}

export default function ConfirmationModal({
  title,
  message,
  confirmText = 'Ja',
  cancelText = 'Abbrechen',
  onConfirm,
  onCancel,
  variant = 'warning'
}: ConfirmationModalProps) {
  const variantStyles = {
    warning: {
      icon: '⚠️',
      gradient: 'from-yellow-500 to-orange-500',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/50',
      confirmBg: 'from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
    },
    danger: {
      icon: '❌',
      gradient: 'from-red-500 to-rose-500',
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      confirmBg: 'from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
    },
    info: {
      icon: 'ℹ️',
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      confirmBg: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
    }
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scale-in">
        {/* Header */}
        <div className={`bg-gradient-to-r ${style.gradient} p-6 rounded-t-3xl`}>
          <div className="flex items-center gap-3">
            <div className="text-4xl">{style.icon}</div>
            <h2 className="text-2xl font-black text-white">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className={`${style.bg} border-2 ${style.border} rounded-2xl p-4 mb-6`}>
            <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-6 py-4 bg-gradient-to-r ${style.confirmBg} text-white font-bold rounded-xl transition-all shadow-lg transform hover:scale-105`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
