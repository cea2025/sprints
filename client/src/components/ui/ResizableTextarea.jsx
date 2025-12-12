import { useRef, useEffect } from 'react';

/**
 * ResizableTextarea - A textarea that can be vertically resized
 * with a nice drag handle and auto-grow option
 */
export default function ResizableTextarea({
  value,
  onChange,
  placeholder = '',
  minRows = 2,
  maxRows = 10,
  autoGrow = false,
  className = '',
  ...props
}) {
  const textareaRef = useRef(null);

  // Auto-grow functionality
  useEffect(() => {
    if (autoGrow && textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Calculate line height
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      // Set new height
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, autoGrow, minRows, maxRows]);

  const baseClasses = `
    w-full px-3 py-2.5 
    border dark:border-gray-600 rounded-xl 
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
    dark:bg-gray-700 dark:text-white
    resize-y
    transition-all duration-200
    min-h-[60px]
  `;

  // Custom resize handle styles via CSS
  const style = {
    minHeight: `${minRows * 1.5}rem`,
    maxHeight: maxRows ? `${maxRows * 1.5}rem` : 'none',
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={minRows}
        style={style}
        className={`${baseClasses} ${className}`}
        {...props}
      />
      {/* Visual resize indicator */}
      <div className="absolute bottom-1 left-1 pointer-events-none opacity-30">
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400 dark:text-gray-500">
          <path
            d="M9 1L1 9M9 5L5 9M9 9L9 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

