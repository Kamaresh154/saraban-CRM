'use client';

import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line
} from 'recharts';

interface ChartsProps {
  monthlyTrends: any[];
  statusDistribution: any[];
  serviceDistribution: any[];
}

export default function DashboardCharts({ monthlyTrends, statusDistribution, serviceDistribution }: ChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-80 w-full bg-gray-50 animate-pulse rounded-xl flex items-center justify-center">
        <span className="text-xs text-gray-500">Initializing analytics canvas...</span>
      </div>
    );
  }

  // Saraban CRM Color Palette
  const COLORS = [
    '#7c3aed',  // Violet
    '#0891b2',  // Cyan
    '#a855f7',  // Purple
    '#f43f5e',  // Red/Coral
    '#f59e0b',  // Amber
    '#10b981',  // Green
    '#6366f1',  // Indigo
    '#6b7280'   // Slate
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly Trends - Area Chart (2/3 width) */}
      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
        <div className="mb-4">
          <h3 className="font-display font-semibold text-base">Acquisition & Conversion Trends</h3>
          <p className="text-xs text-gray-500">Monthly leads generated compared with closed-won conversions</p>
        </div>
        <div className="h-80 w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#111827',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="leads"
                name="New Leads"
                stroke="#7c3aed"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLeads)"
              />
              <Area
                type="monotone"
                dataKey="conversions"
                name="Won Clients"
                stroke="#0891b2"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConversions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leads status distribution - Pie Chart (1/3 width) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
        <div className="mb-4">
          <h3 className="font-display font-semibold text-base">Pipeline Status distribution</h3>
          <p className="text-xs text-gray-500">Percentage representation of active leads</p>
        </div>
        <div className="h-64 w-full relative flex items-center justify-center mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusDistribution.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#111827',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Total center overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold font-display">
              {statusDistribution.reduce((acc, curr) => acc + curr.value, 0)}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
              Total Active
            </span>
          </div>
        </div>

        {/* Legend listing */}
        <div className="mt-4 grid grid-cols-2 gap-x-2 gap-y-1.5 border-t border-gray-100 pt-4">
          {statusDistribution.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-[11px] truncate text-gray-500 capitalize">
                {entry.name.toLowerCase()} ({entry.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
