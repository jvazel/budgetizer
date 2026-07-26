import React from 'react';

export const getScoreColor = (score) => {
  if (score === null || score === undefined) return 'var(--border)';
  if (score >= 80) return 'var(--accent)';
  if (score >= 60) return 'var(--info)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--danger)';
};

const CircularScoreGauge = ({
  score,
  size = 64,
  strokeWidth = 6,
  className = '',
  showText = true,
}) => {
  const hasScore = score !== null && score !== undefined;
  const displayScore = hasScore ? Math.round(score) : 0;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (hasScore ? (displayScore / 100) * circumference : 0);
  const color = getScoreColor(score);

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 ${className}`} 
      style={{ width: size, height: size }}
    >
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Track (background circle) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-border/30 fill-none"
          strokeWidth={strokeWidth}
        />
        {/* Fill (foreground animated circle) */}
        {hasScore && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="fill-none transition-all duration-1000 ease-out"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-[15px] font-extrabold text-primary">
            {hasScore ? displayScore : '—'}
          </span>
          <span className="text-[8px] text-muted font-bold mt-0.5">/100</span>
        </div>
      )}
    </div>
  );
};

export default CircularScoreGauge;
