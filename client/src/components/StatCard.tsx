import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  color?: 'green' | 'blue' | 'yellow' | 'red';
  delay?: number;
}

const colorClasses = {
  green: {
    bg: 'bg-primary-500/10',
    icon: 'text-primary-400',
    glow: 'shadow-primary-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    icon: 'text-yellow-400',
    glow: 'shadow-yellow-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    icon: 'text-red-400',
    glow: 'shadow-red-500/20',
  },
};

export default function StatCard({ title, value, change, icon: Icon, color = 'green', delay = 0 }: StatCardProps) {
  const colors = colorClasses[color];
  
  return (
    <div 
      className={clsx(
        "card card-hover p-6 animate-fade-in",
        `stagger-${delay}`
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={clsx(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          colors.bg
        )}>
          <Icon className={clsx("w-6 h-6", colors.icon)} />
        </div>
        {change !== undefined && (
          <div className={clsx(
            "flex items-center gap-1 text-sm font-medium",
            change >= 0 ? "text-primary-400" : "text-red-400"
          )}>
            <span>{change >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="text-dark-400 text-sm mb-1">{title}</div>
      <div className="text-2xl font-bold text-dark-100 stat-number">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
