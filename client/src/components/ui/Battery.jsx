/**
 * Battery Progress Component
 * מציג התקדמות בסגנון סוללה
 */

export function Battery({ 
  progress = 0, 
  size = 'md', 
  showLabel = true,
  label = '',
  isBlocked = false 
}) {
  // Clamp progress between 0-100
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  // Size configurations
  const sizes = {
    sm: { width: 'w-12', height: 'h-5', tip: 'w-1 h-2.5', text: 'text-[10px]' },
    md: { width: 'w-16', height: 'h-6', tip: 'w-1.5 h-3', text: 'text-xs' },
    lg: { width: 'w-20', height: 'h-8', tip: 'w-2 h-4', text: 'text-sm' }
  };
  
  const sizeConfig = sizes[size] || sizes.md;
  
  // Color based on progress
  const getColor = () => {
    if (isBlocked) return 'bg-red-500';
    if (clampedProgress >= 80) return 'bg-green-500';
    if (clampedProgress >= 50) return 'bg-blue-500';
    if (clampedProgress >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };
  
  const getBgColor = () => {
    if (isBlocked) return 'bg-red-100 dark:bg-red-900/20';
    return 'bg-gray-200 dark:bg-gray-700';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" title={`${clampedProgress}%${label ? ` - ${label}` : ''}`}>
        {/* Battery Body */}
        <div className={`${sizeConfig.width} ${sizeConfig.height} ${getBgColor()} rounded-sm border-2 border-gray-300 dark:border-gray-600 relative overflow-hidden`}>
          {/* Fill */}
          <div 
            className={`absolute inset-y-0 right-0 ${getColor()} transition-all duration-500 ease-out`}
            style={{ width: `${clampedProgress}%` }}
          />
          {/* Percentage text inside */}
          {showLabel && (
            <span className={`absolute inset-0 flex items-center justify-center ${sizeConfig.text} font-bold ${clampedProgress > 50 ? 'text-white' : 'text-gray-700 dark:text-gray-300'} z-10`}>
              {clampedProgress}%
            </span>
          )}
        </div>
        {/* Battery Tip */}
        <div className={`${sizeConfig.tip} bg-gray-300 dark:bg-gray-600 rounded-l-sm -mr-0.5`} />
      </div>
      
      {/* Label */}
      {label && (
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
          {label}
        </span>
      )}
      
      {/* Blocked indicator */}
      {isBlocked && (
        <span className="text-xs text-red-500 font-medium">חסום</span>
      )}
    </div>
  );
}

/**
 * Compact Battery for lists
 */
export function BatteryCompact({ progress = 0, isBlocked = false }) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const getColor = () => {
    if (isBlocked) return 'bg-red-500';
    if (clampedProgress >= 80) return 'bg-green-500';
    if (clampedProgress >= 50) return 'bg-blue-500';
    if (clampedProgress >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className="flex items-center gap-1.5" title={`${clampedProgress}%`}>
      <div className="w-10 h-4 bg-gray-200 dark:bg-gray-700 rounded-sm border border-gray-300 dark:border-gray-600 relative overflow-hidden">
        <div 
          className={`absolute inset-y-0 right-0 ${getColor()} transition-all duration-300`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      <div className="w-1 h-2 bg-gray-300 dark:bg-gray-600 rounded-l-sm" />
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8 text-left">
        {clampedProgress}%
      </span>
    </div>
  );
}

/**
 * Progress Input with Battery visualization
 */
export function ProgressInput({ 
  value = 0, 
  onChange, 
  disabled = false,
  isBlocked = false 
}) {
  const handleChange = (e) => {
    const newValue = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
    onChange?.(newValue);
  };

  return (
    <div className="flex items-center gap-3">
      <Battery progress={value} size="md" showLabel={false} isBlocked={isBlocked} />
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={handleChange}
          disabled={disabled || isBlocked}
          className="w-14 px-2 py-1.5 text-center border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
      </div>
    </div>
  );
}

export default Battery;

