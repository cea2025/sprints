/**
 * DateTooltip Component
 * Wraps content with a tooltip showing creation and update dates
 */

/**
 * Format date in Hebrew
 * @param {string|Date} date 
 * @returns {string} Formatted date string
 */
export function formatDateHebrew(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format relative time in Hebrew
 * @param {string|Date} date 
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  if (diffDays < 365) return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  return `לפני ${Math.floor(diffDays / 365)} שנים`;
}

/**
 * Build tooltip text with creation and update dates
 * @param {string|Date} createdAt 
 * @param {string|Date} updatedAt 
 * @returns {string} Tooltip text
 */
export function buildDateTooltip(createdAt, updatedAt) {
  const parts = [];
  
  if (createdAt) {
    parts.push(`נוצר: ${formatDateHebrew(createdAt)}`);
  }
  
  if (updatedAt && createdAt) {
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    // Only show update if different from creation (more than 1 second apart)
    if (Math.abs(updated - created) > 1000) {
      parts.push(`עודכן: ${formatDateHebrew(updatedAt)} (${formatRelativeTime(updatedAt)})`);
    }
  }
  
  return parts.join('\n');
}

/**
 * DateTooltip Component
 * Wraps children with a tooltip showing dates
 */
export default function DateTooltip({ 
  createdAt, 
  updatedAt, 
  children, 
  className = '' 
}) {
  const tooltip = buildDateTooltip(createdAt, updatedAt);
  
  if (!tooltip) {
    return <>{children}</>;
  }
  
  return (
    <span 
      title={tooltip} 
      className={`cursor-help ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * DateBadge Component
 * Shows a small date indicator with tooltip
 */
export function DateBadge({ createdAt, updatedAt, showRelative = true }) {
  const tooltip = buildDateTooltip(createdAt, updatedAt);
  const displayText = showRelative ? formatRelativeTime(createdAt) : formatDateHebrew(createdAt);
  
  if (!createdAt) return null;
  
  return (
    <span 
      title={tooltip}
      className="text-xs text-gray-400 dark:text-gray-500 cursor-help"
    >
      {displayText}
    </span>
  );
}

