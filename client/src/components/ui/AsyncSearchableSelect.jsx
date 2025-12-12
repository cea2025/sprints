/**
 * AsyncSearchableSelect
 * Dropdown with search that loads options from server as you type (debounced).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, X, Check, Loader2 } from 'lucide-react';

export function AsyncSearchableSelect({
  value,
  onChange,
  placeholder = 'בחר...',
  searchPlaceholder = 'חיפוש...',
  emptyMessage = 'לא נמצאו תוצאות',
  loadingMessage = 'טוען...',
  disabled = false,
  allowClear = true,
  className = '',
  getLabel = (opt) => opt.label || opt.name || opt.title || opt,
  getValue = (opt) => opt.value || opt.id || opt,
  getSearchText = (opt) => `${getLabel(opt)}`,
  // async
  loadOptions, // async (searchTerm) => Array
  loadById, // async (id) => option (optional)
  debounceMs = 250,
  minSearchLength = 0,
  initialOptions = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState(Array.isArray(initialOptions) ? initialOptions : []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    const found = options.find((opt) => getValue(opt) === value);
    return found || selectedOverride;
  }, [options, selectedOverride, value, getValue]);

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

  // resolve selected option when value is set but not in loaded options
  useEffect(() => {
    let cancelled = false;
    const needsResolve = value && !options.some((opt) => getValue(opt) === value);
    if (!needsResolve || !loadById) return;
    (async () => {
      try {
        const resolved = await loadById(value);
        if (!cancelled && resolved) setSelectedOverride(resolved);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, options, loadById, getValue]);

  const runSearch = async (term) => {
    if (!loadOptions) return;
    if (term.length < minSearchLength) {
      setOptions(Array.isArray(initialOptions) ? initialOptions : []);
      return;
    }
    setIsLoading(true);
    try {
      const result = await loadOptions(term);
      setOptions(Array.isArray(result) ? result : []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    // debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(searchTerm);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, isOpen]);

  // initial load when opening
  useEffect(() => {
    if (!isOpen) return;
    if (minSearchLength === 0) {
      runSearch('');
    } else {
      setOptions(Array.isArray(initialOptions) ? initialOptions : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSelect = (opt) => {
    onChange(getValue(opt));
    setSelectedOverride(null);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSelectedOverride(null);
    setSearchTerm('');
  };

  const filteredOptions = useMemo(() => {
    // allow local filtering too (for initialOptions, and when server returns broader)
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => getSearchText(opt).toLowerCase().includes(term));
  }, [options, searchTerm, getSearchText]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 text-right transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            : 'bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
          {selectedOption ? getLabel(selectedOption) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
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
                className="w-full pr-9 pl-3 py-2 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm dark:text-white"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingMessage}</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">{emptyMessage}</div>
            ) : (
              filteredOptions.map((opt, index) => {
                const optValue = getValue(opt);
                const isSelected = optValue === value;
                return (
                  <button
                    key={optValue || index}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-right transition-colors ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-orange-600' : 'text-transparent'}`}>
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-sm">{getLabel(opt)}</span>
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

export default AsyncSearchableSelect;


