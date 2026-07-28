import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis } from 'recharts';

export type ChartColorTheme = 'emerald' | 'rose' | 'cyan' | 'purple' | 'amber';

interface DataPoint {
  label: string;
  value: number;
  [key: string]: any;
}

interface GradientAreaChartProps {
  data: DataPoint[];
  color?: ChartColorTheme;
  height?: number | string;
  showAxes?: boolean;
  showTooltip?: boolean;
  strokeWidth?: number;
  dataKey?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
}

const themeMap: Record<ChartColorTheme, { stroke: string; stop0: string; stop100: string }> = {
  emerald: {
    stroke: '#10B981',
    stop0: 'rgba(16, 185, 129, 0.4)',
    stop100: 'rgba(16, 185, 129, 0.0)',
  },
  rose: {
    stroke: '#F43F5E',
    stop0: 'rgba(244, 63, 94, 0.4)',
    stop100: 'rgba(244, 63, 94, 0.0)',
  },
  cyan: {
    stroke: '#06B6D4',
    stop0: 'rgba(6, 182, 212, 0.4)',
    stop100: 'rgba(6, 182, 212, 0.0)',
  },
  purple: {
    stroke: '#6366F1',
    stop0: 'rgba(99, 102, 241, 0.4)',
    stop100: 'rgba(99, 102, 241, 0.0)',
  },
  amber: {
    stroke: '#F59E0B',
    stop0: 'rgba(245, 158, 11, 0.4)',
    stop100: 'rgba(245, 158, 11, 0.0)',
  },
};

const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = ' €' }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const formatted = typeof val === 'number' 
      ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
      : val;

    return (
      <div className="px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl text-xs">
        {label && <p className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</p>}
        <p className="font-bold text-slate-100 font-mono">
          {valuePrefix}{formatted}{valueSuffix}
        </p>
      </div>
    );
  }
  return null;
};

export const GradientAreaChart: React.FC<GradientAreaChartProps> = ({
  data,
  color = 'cyan',
  height = '100%',
  showAxes = false,
  showTooltip = true,
  strokeWidth = 2.5,
  dataKey = 'value',
  valuePrefix = '',
  valueSuffix = ' €',
  className = '',
}) => {
  const theme = themeMap[color] || themeMap.cyan;
  const gradientId = `gradient-${color}-${Math.random().toString(36).substr(2, 9)}`;

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.stroke} stopOpacity={0.4} />
              <stop offset="100%" stopColor={theme.stroke} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {showAxes && (
            <>
              <XAxis dataKey="label" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} hide />
            </>
          )}

          {showTooltip && (
            <Tooltip
              content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
              cursor={{ stroke: theme.stroke, strokeWidth: 1, strokeDasharray: '3 3' }}
            />
          )}

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={theme.stroke}
            strokeWidth={strokeWidth}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GradientAreaChart;
