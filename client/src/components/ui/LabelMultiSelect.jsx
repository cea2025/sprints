import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

function normalizeColor(color) {
  if (!color) return null;
  return color.startsWith('#') ? color : `#${color}`;
}

export default function LabelMultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'בחר תוויות...',
  searchPlaceholder = 'חיפוש תוויות...',
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedSet = useMemo(() => new Set(Array.isArray(value) ? value : []), [value]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => (o.name || '').toLowerCase().includes(q));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const toggle = (id) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm('');
  };

  const selectedLabels = options.filter((o) => selectedSet.has(o.id));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 text-right transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            : 'bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <div className="flex-1 min-w-0">
          {selectedLabels.length === 0 ? (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedLabels.slice(0, 3).map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-gray-200 dark:border-gray-700"
                    style={{ backgroundColor: normalizeColor(l.color) || '#CBD5E1' }}
                  />
                  <span className="truncate max-w-24 text-gray-700 dark:text-gray-200">{l.name}</span>
                </span>
              ))}
              {selectedLabels.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">+{selectedLabels.length - 3}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedLabels.length > 0 && !disabled && (
            <button
              type="button"
              onClick={clear}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              title="נקה"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-9 pl-3 py-2 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm dark:text-white"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">לא נמצאו תוויות</div>
            ) : (
              filtered.map((l) => {
                const isSelected = selectedSet.has(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggle(l.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-right transition-colors ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-purple-600' : 'text-transparent'}`}>
                      <Check className="w-4 h-4" />
                    </div>
                    <span
                      className="w-3 h-3 rounded-full border border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: normalizeColor(l.color) || '#CBD5E1' }}
                    />
                    <span className="flex-1 text-sm">{l.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


