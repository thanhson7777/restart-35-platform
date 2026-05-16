import { Progress } from '@/components/ui';

const getColorClass = (percentage) => {
  if (percentage < 30) return 'bg-red-500';
  if (percentage < 70) return 'bg-amber-500';
  return 'bg-green-500';
};

export const ProgressBar = ({ percentage = 0, showLabel = false, size = 'md' }) => {
  const clamped = Math.min(100, Math.max(0, percentage));
  const colorClass = getColorClass(clamped);

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${colorClass} ${heightClass} rounded-full transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {clamped}%
        </p>
      )}
    </div>
  );
};
