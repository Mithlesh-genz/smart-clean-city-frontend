import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'primary', subtitle, trend }) => {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
    red: 'text-red-500 bg-red-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  };
  const iconColor = colorMap[color] || colorMap.primary;

  return (
    <div className="glass-card p-5 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && <span className={`text-xs font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'} ml-2`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>}
        </div>
        <div className={`p-3 rounded-full ${iconColor}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
    </div>
  );
};

export default StatCard;