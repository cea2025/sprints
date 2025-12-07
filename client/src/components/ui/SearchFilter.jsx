/**
 * SearchFilter Component
 * רכיב חיפוש וסינון אוניברסלי
 */

import { useState, useMemo } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';

export function SearchFilter({ 
  value, 
  onChange, 
  placeholder = 'חיפוש...', 
  className = '',
  filters = [], // [{ key, label, options: [{ value, label }] }]
  activeFilters = {},
  onFilterChange
}) {
  const [showFilters, setShowFilters] = useState(false);
  
  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== 'all');

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pr-10 pl-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      {filters.length > 0 && (
        <>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              hasActiveFilters
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Filter size={16} />
            <span>סינון</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 text-xs bg-indigo-500 text-white rounded-full">
                {Object.values(activeFilters).filter(v => v && v !== 'all').length}
              </span>
            )}
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Filters Panel */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              {filters.map((filter) => (
                <div key={filter.key} className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {filter.label}
                  </label>
                  <select
                    value={activeFilters[filter.key] || 'all'}
                    onChange={(e) => onFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">הכל</option>
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    filters.forEach(f => onFilterChange(f.key, 'all'));
                  }}
                  className="self-end px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  נקה הכל
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Hook לסינון פריטים לפי טקסט חיפוש
 */
export function useSearch(items, searchFields, searchTerm) {
  return useMemo(() => {
    if (!searchTerm || searchTerm.length < 2 || !Array.isArray(items)) {
      return items || [];
    }

    const term = searchTerm.toLowerCase();
    
    return items.filter(item => {
      return searchFields.some(field => {
        const value = getNestedValue(item, field);
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  }, [items, searchFields, searchTerm]);
}

/**
 * Hook לסינון פריטים לפי פילטרים
 */
export function useFilters(items, activeFilters) {
  return useMemo(() => {
    if (!Array.isArray(items)) return [];
    
    return items.filter(item => {
      return Object.entries(activeFilters).every(([key, value]) => {
        if (!value || value === 'all') return true;
        const itemValue = getNestedValue(item, key);
        return String(itemValue) === String(value);
      });
    });
  }, [items, activeFilters]);
}

/**
 * Helper to get nested object values (e.g., "owner.name")
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return null;
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

export default SearchFilter;

