import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { KpiMetricItem } from '@shared/types';
import AmountDisplay from '../ui/AmountDisplay';
import { triggerHaptic } from '../../utils/hapticHelper';

interface KpiCardXXLProps {
  title: string;
  metric: KpiMetricItem;
  formatter?: (val: number) => string;
  isPercentage?: boolean;
  colorScheme: 'income' | 'expense' | 'net' | 'analytics';
  icon: React.ReactNode;
}

export const KpiCardXXL: React.FC<KpiCardXXLProps> = ({
  title,
  metric,
  formatter = (val: number) => `${val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
  isPercentage = false,
  colorScheme,
  icon,
}) => {
  const { currentValue, changePercentage, sparkline } = metric;
  const isPositiveChange = changePercentage !== null && changePercentage > 0;
  const isNegativeChange = changePercentage !== null && changePercentage < 0;

  // Calcul du min / max pour le traçage du sparkline SVG
  const values = sparkline.map(s => s.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const width = 140;
  const height = 40;
  const pointsString = sparkline
    .map((s, idx) => {
      const x = (idx / (sparkline.length - 1)) * width;
      const y = height - ((s.value - minVal) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  // Standard de couleur selon la charte sémantique & variables CSS de Bankyboard
  const themeStyles = {
    income: {
      text: 'text-accent',
      bgIcon: 'bg-accent/10 border-accent/20 text-accent',
      bgBadge: 'bg-accent/10 text-accent border-accent/20',
      stroke: 'var(--accent)',
      gradientId: 'gradient-income-banky',
      fillColor: 'var(--accent)',
    },
    expense: {
      text: 'text-danger',
      bgIcon: 'bg-danger/10 border-danger/20 text-danger',
      bgBadge: 'bg-danger/10 text-danger border-danger/20',
      stroke: 'var(--danger)',
      gradientId: 'gradient-expense-banky',
      fillColor: 'var(--danger)',
    },
    net: {
      text: currentValue >= 0 ? 'text-accent' : 'text-danger',
      bgIcon: currentValue >= 0 ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-danger/10 border-danger/20 text-danger',
      bgBadge: currentValue >= 0 ? 'bg-accent/10 text-accent border-accent/20' : 'bg-danger/10 text-danger border-danger/20',
      stroke: currentValue >= 0 ? 'var(--accent)' : 'var(--danger)',
      gradientId: currentValue >= 0 ? 'gradient-income-banky' : 'gradient-expense-banky',
      fillColor: currentValue >= 0 ? 'var(--accent)' : 'var(--danger)',
    },
    analytics: {
      text: 'text-purple',
      bgIcon: 'bg-purple/10 border-purple/20 text-purple',
      bgBadge: 'bg-purple/10 text-purple border-purple/20',
      stroke: 'var(--purple)',
      gradientId: 'gradient-analytics-banky',
      fillColor: 'var(--purple)',
    },
  }[colorScheme];

  const [scrubIndex, setScrubIndex] = React.useState<number | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sparkline || sparkline.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const index = Math.round(ratio * (sparkline.length - 1));
    if (index !== scrubIndex) {
      setScrubIndex(index);
      triggerHaptic('light');
    }
  };

  const handlePointerLeave = () => {
    setScrubIndex(null);
  };

  const activeValue = scrubIndex !== null ? sparkline[scrubIndex]?.value : currentValue;
  const activeLabel = scrubIndex !== null ? (sparkline[scrubIndex]?.date || sparkline[scrubIndex]?.label || `Mois ${scrubIndex + 1}`) : 'vs mois précédent';

  const formattedScrubValue = isPercentage ? `${activeValue >= 0 ? '+' : ''}${activeValue.toFixed(1)} %` : formatter(activeValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="banky-card relative overflow-hidden p-5 border border-border/40 hover:border-border/80 transition-all duration-200 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2.5">
          <div className={`p-2 rounded-xl border ${themeStyles.bgIcon}`}>
            {icon}
          </div>
          <span className="premium-label tracking-wider">{title}</span>
        </div>

        {/* Badge Variation vs M-1 */}
        {changePercentage !== null && (
          <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${themeStyles.bgBadge}`}>
            {isPositiveChange && <ArrowUpRight className="w-3.5 h-3.5" />}
            {isNegativeChange && <ArrowDownRight className="w-3.5 h-3.5" />}
            {changePercentage === 0 && <Minus className="w-3.5 h-3.5" />}
            <span>{isPercentage ? `${changePercentage > 0 ? '+' : ''}${changePercentage} pt` : `${changePercentage > 0 ? '+' : ''}${changePercentage} %`}</span>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between mt-3">
        <div>
          <div className="text-2xl lg:text-3xl font-condensed-tight font-extrabold tracking-tight group-hover:scale-[1.01] transition-transform">
            {isPercentage ? (
              <span className="text-primary">{formattedScrubValue}</span>
            ) : (
              <AmountDisplay
                amount={activeValue}
                type={colorScheme === 'income' ? 'income' : colorScheme === 'expense' ? 'expense' : 'neutral'}
                size="2xl"
              />
            )}
          </div>
          <p className="text-[11px] text-muted font-medium mt-1 transition-colors">
            {scrubIndex !== null ? (
              <span className="text-copper font-bold uppercase tracking-wider">{activeLabel}</span>
            ) : (
              <span>vs mois précédent</span>
            )}
          </p>
        </div>

        {/* Sparkline Vectoriel avec Scrubbing Tactile */}
        <div
          className="w-[110px] h-[38px] relative cursor-crosshair touch-none select-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <defs>
              <linearGradient id={themeStyles.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={themeStyles.fillColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={themeStyles.fillColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area Fill */}
            <polygon
              points={`0,${height} ${pointsString} ${width},${height}`}
              fill={`url(#${themeStyles.gradientId})`}
            />

            {/* Line */}
            <polyline
              fill="none"
              stroke={themeStyles.stroke}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />

            {/* Scrubbing indicator cursor */}
            {scrubIndex !== null ? (
              <g>
                <line
                  x1={(scrubIndex / (sparkline.length - 1)) * width}
                  y1={0}
                  x2={(scrubIndex / (sparkline.length - 1)) * width}
                  y2={height}
                  stroke={themeStyles.stroke}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.8"
                />
                <circle
                  cx={(scrubIndex / (sparkline.length - 1)) * width}
                  cy={height - ((values[scrubIndex] - minVal) / range) * (height - 8) - 4}
                  r="4"
                  fill="#ffffff"
                  stroke={themeStyles.stroke}
                  strokeWidth="2.5"
                />
              </g>
            ) : (
              sparkline.length > 0 && (
                <circle
                  cx={width}
                  cy={height - ((values[values.length - 1] - minVal) / range) * (height - 8) - 4}
                  r="3.5"
                  fill={themeStyles.stroke}
                  className="animate-pulse"
                />
              )
            )}
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

