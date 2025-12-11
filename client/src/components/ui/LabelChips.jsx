function normalizeColor(color) {
  if (!color) return null;
  return color.startsWith('#') ? color : `#${color}`;
}

export default function LabelChips({ labels = [], max = 3 }) {
  if (!Array.isArray(labels) || labels.length === 0) return null;
  const shown = labels.slice(0, max);
  const extra = labels.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {shown.map((l) => (
        <span
          key={l.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
          title={l.name}
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-gray-200 dark:border-gray-700"
            style={{ backgroundColor: normalizeColor(l.color) || '#CBD5E1' }}
          />
          <span className="text-gray-700 dark:text-gray-200">{l.name}</span>
        </span>
      ))}
      {extra > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400" title={labels.map(l => l.name).join(', ')}>
          +{extra}
        </span>
      )}
    </div>
  );
}


