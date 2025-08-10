import React from 'react';
import styles from './Progress.module.css';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = false,
  className = '',
  ...props
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const displayLabel = label || `${Math.round(percentage)}%`;

  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  const progressClasses = [styles.progress, styles[size], styles[variant]]
    .filter(Boolean)
    .join(' ');

  const barClasses = [styles.bar, animated && styles.animated]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} {...props}>
      {showLabel && (
        <div className={styles.labelContainer}>
          <span className={styles.label}>{displayLabel}</span>
        </div>
      )}
      <div
        className={progressClasses}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        <div className={barClasses} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default Progress;
