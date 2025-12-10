/**
 * Reusable form modal component
 * Reduces code duplication across pages that have similar modal patterns
 */
import { X } from 'lucide-react';

export function FormModal({ 
  isOpen, 
  onClose, 
  title, 
  icon: Icon,
  iconGradient = 'from-blue-500 to-purple-600',
  onSubmit, 
  submitLabel = 'שמור',
  isEditing = false,
  children 
}) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`p-2 rounded-xl bg-gradient-to-br ${iconGradient} shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? `עריכת ${title}` : `${title} חדש/ה`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {children}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              ביטול
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2.5 bg-gradient-to-r ${iconGradient} text-white rounded-xl hover:opacity-90 transition-all shadow-lg font-medium`}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Reusable form input component
 */
export function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder = '',
  className = ''
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
      />
    </div>
  );
}

/**
 * Reusable form textarea component
 */
export function FormTextarea({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder = '',
  rows = 3,
  className = ''
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all resize-none"
      />
    </div>
  );
}

/**
 * Reusable form select component
 */
export function FormSelect({
  label,
  name,
  value,
  onChange,
  required = false,
  options = [],
  placeholder = 'בחר...',
  className = ''
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default FormModal;

