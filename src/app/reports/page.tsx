'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  BarChart3,
  FileDown,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
  Users,
  Award,
  Sparkles
} from 'lucide-react';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const reportData = await res.json();
        setData(reportData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const simulateExport = (type: 'pdf' | 'excel') => {
    setExporting(type);
    setTimeout(() => {
      setExporting(null);
      // Simulate file download trigger
      const dummyContent = type === 'pdf' ? '%PDF-1.4 ... Saraban CRM Report ...' : 'Name,Company,Service,Budget\n';
      const blob = new Blob([dummyContent], { type: type === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `saraban_crm_report_${Date.now()}.${type === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1500);
  };

  if (loading || !mounted) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-100 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-100 animate-pulse rounded-xl col-span-3" />
          </div>
          <div className="h-96 bg-gray-100 animate-pulse rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  const stats = data?.stats || {
    totalLeads: 0,
    convertedClients: 0,
    conversionRate: 0,
  };

  const COLORS = ['#7c3aed', '#0891b2', '#a855f7', '#f59e0b', '#10b981', '#6b7280'];

  // Calculate simulated pipeline values:
  // WON leads budget = Won Opportunities value
  // Active leads budget sum = Estimated Pipeline value
  const wonValue = 62000 + 45000; // Simulated won values
  const activePipelineValue = 45000 + 28000 + 15000 + 8500 + 22000;

  return (
    <AppLayout>
      <div className="space-y-8 text-gray-900 text-xs pb-10">
        
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900 tracking-tight flex items-center gap-2">
              Reports & Analytics Hub
              <BarChart3 size={20} className="text-teal-600" />
            </h1>
            <p className="text-xs text-gray-500">Perform deep-dive analysis on conversion targets and team actions.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={exporting !== null}
              onClick={() => simulateExport('excel')}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50 transition-colors border border-gray-200 px-3.5 py-2 rounded-lg text-xs font-semibold"
            >
              <FileDown size={14} />
              {exporting === 'excel' ? 'Compiling Excel...' : 'Export Excel'}
            </button>
            <button
              disabled={exporting !== null}
              onClick={() => simulateExport('pdf')}
              className="flex items-center gap-1.5 bg-primary hover:opacity-90 px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm"
            >
              <FileDown size={14} />
              {exporting === 'pdf' ? 'Rendering PDF...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Revenue Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Won Contract Revenue</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold font-display text-gray-900">${wonValue.toLocaleString()}</span>
              <span className="block text-[10px] text-gray-500 font-semibold mt-1">Closed-Won opportunities budget</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Pipeline Value</span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary border border-blue-200">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold font-display text-gray-900">${activePipelineValue.toLocaleString()}</span>
              <span className="block text-[10px] text-gray-500 font-semibold mt-1">Total active budget in pipeline</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lead Conversion Rate</span>
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-200">
                <Percent size={16} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold font-display text-gray-900">{stats.conversionRate}%</span>
              <span className="block text-[10px] text-gray-500 font-semibold mt-1">Won leads vs Lost leads ratio</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie chart (Service Distribution) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="font-display font-semibold text-base">Leads by Service interested</h3>
              <p className="text-xs text-gray-500">Saraban CRM service distribution segmentation</p>
            </div>
            <div className="h-64 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.serviceDistribution.filter((d: any) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.charts.serviceDistribution.map((entry: any, index: number) => (
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
            </div>
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 pt-4 justify-center">
              {data.charts.serviceDistribution.map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span>{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart (Leads by Source) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="font-display font-semibold text-base">Leads by Acquisition Source</h3>
              <p className="text-xs text-gray-500">Overview of primary contact acquisition channels</p>
            </div>
            <div className="h-64 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.sourceDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#111827',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" name="Leads Count" fill="#0891b2" radius={[4, 4, 0, 0]}>
                    {data.charts.sourceDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Team Performance Table */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Award size={18} className="text-primary" />
            <h3 className="font-display font-semibold text-base">Team Performance Summary</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                  <th className="p-3">Team Member</th>
                  <th className="p-3 text-center">Assigned Leads</th>
                  <th className="p-3 text-center">Completed Follow-Ups</th>
                  <th className="p-3 text-center">Conversions (WON)</th>
                  <th className="p-3 text-right">Contribution Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.teamPerformance?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">No team members active.</td>
                  </tr>
                ) : (
                  data.teamPerformance?.map((member: any) => {
                    const contributionRate = stats.convertedClients > 0
                      ? ((member.wonLeads / stats.convertedClients) * 100).toFixed(0)
                      : '0';

                    return (
                      <tr key={member.name} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-semibold text-gray-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-bold font-display">
                            {member.name.charAt(0)}
                          </div>
                          {member.name}
                        </td>
                        <td className="p-3 text-center font-medium text-gray-600">{member.assignedLeads}</td>
                        <td className="p-3 text-center text-teal-600 font-semibold">{member.completedReminders}</td>
                        <td className="p-3 text-center text-emerald-600 font-semibold">{member.wonLeads}</td>
                        <td className="p-3 text-right font-mono font-semibold text-gray-600">
                          {contributionRate}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
