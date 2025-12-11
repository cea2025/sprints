/**
 * LinkedItemsSection - קומפוננטה גנרית להצגת פריטים מקושרים
 * משמשת להצגת ילדים היררכיים (סלעים בפרויקט, אבני דרך בסלע וכו')
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

/**
 * @param {Object} props
 * @param {string} props.title - כותרת הסקציה (לדוגמה: "סלעים מקושרים")
 * @param {Array} props.items - רשימת הפריטים המקושרים
 * @param {Array} props.availableItems - רשימת כל הפריטים הזמינים לקישור
 * @param {string} props.parentId - מזהה ההורה
 * @param {string} props.linkField - שם השדה לקישור (לדוגמה: "objectiveId")
 * @param {Function} props.onLink - פונקציה לקישור פריט
 * @param {Function} props.onUnlink - פונקציה לניתוק פריט
 * @param {string} props.basePath - נתיב בסיס לקישורים
 * @param {string} props.itemPath - נתיב לדף הפריט (לדוגמה: "rocks")
 * @param {string} props.emptyMessage - הודעה כשאין פריטים
 * @param {boolean} props.showCode - האם להציג קוד
 * @param {boolean} props.showProgress - האם להציג התקדמות
 * @param {boolean} props.readOnly - מצב קריאה בלבד
 */
export default function LinkedItemsSection({
  title,
  items = [],
  availableItems = [],
  parentId,
  linkField,
  onLink,
  onUnlink,
  basePath = '',
  itemPath = '',
  emptyMessage = 'אין פריטים מקושרים',
  showCode = true,
  showProgress = false,
  readOnly = false,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // פריטים שעוד לא מקושרים
  const unlinkedItems = useMemo(() => {
    const linkedIds = new Set(items.map(item => item.id));
    return availableItems.filter(item => !linkedIds.has(item.id));
  }, [items, availableItems]);

  // סינון לפי חיפוש
  const filteredUnlinked = useMemo(() => {
    if (!searchTerm) return unlinkedItems;
    const term = searchTerm.toLowerCase();
    return unlinkedItems.filter(item => 
      item.name?.toLowerCase().includes(term) ||
      item.title?.toLowerCase().includes(term) ||
      item.code?.toLowerCase().includes(term)
    );
  }, [unlinkedItems, searchTerm]);

  const handleLink = async (itemId) => {
    if (onLink) {
      await onLink(itemId, parentId);
      setSearchTerm('');
      setShowSearch(false);
    }
  };

  const handleUnlink = async (itemId) => {
    if (onUnlink && window.confirm('האם לנתק את הפריט?')) {
      await onUnlink(itemId);
    }
  };

  const getItemName = (item) => item.name || item.title || 'ללא שם';
  const getItemCode = (item) => item.code || '';

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      {/* כותרת */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {title} ({items.length})
        </button>
        
        {!readOnly && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="הוסף קישור"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* חיפוש והוספה */}
      {showSearch && !readOnly && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <input
            type="text"
            placeholder="חפש לפי שם או קוד..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          
          {filteredUnlinked.length > 0 ? (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {filteredUnlinked.slice(0, 10).map(item => (
                <button
                  key={item.id}
                  onClick={() => handleLink(item.id)}
                  className="w-full text-right px-3 py-2 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 
                           rounded flex items-center justify-between gap-2 text-gray-700 dark:text-gray-300"
                >
                  <span className="flex items-center gap-2">
                    {showCode && item.code && (
                      <span className="text-xs font-mono bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                        {item.code}
                      </span>
                    )}
                    <span>{getItemName(item)}</span>
                  </span>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ))}
              {filteredUnlinked.length > 10 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  מציג 10 מתוך {filteredUnlinked.length} תוצאות
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              {searchTerm ? 'לא נמצאו פריטים' : 'אין פריטים זמינים לקישור'}
            </p>
          )}
        </div>
      )}

      {/* רשימת פריטים מקושרים */}
      {isExpanded && (
        <div className="space-y-1">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
              {emptyMessage}
            </p>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 
                         rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <Link
                  to={`${basePath}/${itemPath}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  {showCode && item.code && (
                    <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded shrink-0">
                      {item.code}
                    </span>
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {getItemName(item)}
                  </span>
                  {showProgress && typeof item.progress === 'number' && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.progress >= 100 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                    }`}>
                      {item.progress}%
                    </span>
                  )}
                </Link>
                
                {!readOnly && (
                  <button
                    onClick={() => handleUnlink(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 
                             opacity-0 group-hover:opacity-100 transition-opacity"
                    title="נתק"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

