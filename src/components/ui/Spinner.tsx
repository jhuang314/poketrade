// src/components/ui/Spinner.tsx
import clsx from 'clsx';

interface SpinnerProps {
  /**
  * Defines the size of the spinner.
  * @default 'md'
  */
  size?: 'sm' | 'md' | 'lg';
  /**
  * Optional additional class names for custom styling (e.g., margins).
  */
  className?: string;
}

/**
* A simple, accessible loading spinner component.
*/
export default function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      // The `role="status"` attribute makes this accessible to screen readers,
      // informing them that this part of the page is actively being updated.
      role="status"
      className={clsx(
        'animate-spin rounded-full border-solid',
        'border-gray-200', // This is the "track" color
        'border-t-blue-500', // This is the moving "head" color
        sizeClasses[size],
        className
      )}
    >
      {/* This span is visually hidden but read by screen readers */}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
