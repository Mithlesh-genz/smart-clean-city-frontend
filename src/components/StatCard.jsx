import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'primary', subtitle, trend }) => {
    const colorMap = {
        primary: 'text-orange-500 bg-orange-500/10',
        blue: 'text-blue-500 bg-blue-500/10',
        green: 'text-green-500 bg-green-500/10',
        yellow: 'text-yellow-500 bg-yellow-500/10',
        red: 'text-red-500 bg-red-500/10',
        purple: 'text-purple-500 bg-purple-500/10',
        gray: 'text-gray-400 bg-gray-500/10',
    };
    const iconColor = colorMap[color] || colorMap.primary;

    return (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800/50 p-5 hover:border-gray-700/50 transition-all">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-400 truncate">{title}</p>
                    <div className="flex items-center mt-1">
                        <p className="text-2xl font-bold text-white">{value}</p>
                        {trend && (
                            <span className={`text-xs font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'} ml-2`}>
                                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                    {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
                </div>
                <div className={`ml-4 p-3 rounded-full ${iconColor}`}>
                    {Icon && <Icon className="w-5 h-5" />}
                </div>
            </div>
        </div>
    );
};

export default StatCard;