import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import Card from '../ui/Card';

const DealsAnalyticsChart = ({ deals, t }) => {
  const [range, setRange] = useState('hourly'); // 'hourly' | 'daily' | 'weekly'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const chartData = useMemo(() => {
    const now = new Date();
    const data = [];

    if (range === 'hourly') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const label = `${String(d.getHours()).padStart(2, '0')}:00`;
        const count = deals.filter(deal => {
          const timestamp = deal.sentAt || deal.createdAt;
          if (!timestamp) return false;
          const tDate = new Date(timestamp);
          return tDate <= d;
        }).length;
        data.push({ label, count });
      }
    } else if (range === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const dateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const cutoff = i === 0
          ? now
          : new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
        const label = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
        const count = deals.filter(deal => {
          const timestamp = deal.sentAt || deal.createdAt;
          if (!timestamp) return false;
          const tDate = new Date(timestamp);
          return tDate <= cutoff;
        }).length;
        data.push({ label, count });
      }
    } else if (range === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const endD = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const label = `W${4 - i}`;
        const count = deals.filter(deal => {
          const timestamp = deal.sentAt || deal.createdAt;
          if (!timestamp) return false;
          const tDate = new Date(timestamp);
          return tDate <= endD;
        }).length;
        data.push({ label, count });
      }
    }

    return data;
  }, [deals, range]);

  const width = 650;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  const maxCount = Math.max(...chartData.map(d => d.count), 5);

  const points = chartData.map((d, index) => {
    const x = paddingX + (index / (chartData.length - 1 || 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.count / maxCount) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="text-primary" size={20} />
          <h2 className="text-lg font-semibold">{t('dealsChart')}</h2>
        </div>
        <div className="flex items-center border rounded-lg overflow-hidden bg-muted/30 p-1">
          {['hourly', 'daily', 'weekly'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${range === r ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t(r)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
            const val = Math.round(ratio * maxCount);
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="hsl(var(--border))" strokeDasharray="4 4" opacity="0.6" />
                <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">{val}</text>
              </g>
            );
          })}

          {areaD && <path d={areaD} fill="url(#chartGradient)" />}
          {pathD && <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {points.map((p, i) => (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)}>
              <circle cx={p.x} cy={p.y} r="4" className="fill-primary stroke-background stroke-2 hover:r-6 transition-all" />
              {(i % Math.ceil(points.length / 7) === 0 || i === points.length - 1) && (
                <text x={p.x} y={height - 8} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>

        {hoveredPoint && (
          <div
            className="absolute z-10 bg-popover text-popover-foreground border shadow-md rounded px-2.5 py-1.5 text-xs font-medium pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`
            }}
          >
            <div>{hoveredPoint.label}</div>
            <div className="text-primary font-semibold">{hoveredPoint.count} {t('dealsCount')}</div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default DealsAnalyticsChart;
