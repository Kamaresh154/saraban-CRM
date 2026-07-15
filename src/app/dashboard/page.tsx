'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardCharts from '@/components/DashboardCharts';
import { useRouter } from 'next/navigation';
import {
  Users,
  Flame,
  Clock,
  CheckCircle2,
  TrendingUp,
  PhoneCall,
  Mail,
  Video,
  FileText,
  CalendarDays,
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dueFollowUps, setDueFollowUps] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
    fetchDueFollowUps();

    // Poll dashboard reports and follow-ups every 10 seconds for auto-sync
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchDueFollowUps();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const reportData = await res.json();
        setData(reportData);
      }
    } catch (err) {
      console.error('Failed to load dashboard report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDueFollowUps = async () => {
    try {
      const res = await fetch('/api/followups?status=PENDING&limit=5');
      if (res.ok) {
        const followUpsData = await res.json();
        // Overdue are already fetched in alerts, let's gather active pending items
        setDueFollowUps(followUpsData.followUps || []);
      }
    } catch (err) {
      console.error('Failed to load followups:', err);
    }
  };

  const completeFollowUp = async (id: string, noteText: string) => {
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', note: `${noteText} (Done via Dashboard)` }),
      });

      if (res.ok) {
        // Refresh dashboard statistics and timelines
        fetchDashboardData();
        fetchDueFollowUps();
      }
    } catch (err) {
      console.error('Failed to complete follow-up:', err);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-muted animate-pulse rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  const stats = data?.stats || {
    totalLeads: 0,
    newLeadsMonth: 0,
    hotLeads: 0,
    followUpsDueToday: 0,
    followUpsOverdue: 0,
    convertedClients: 0,
    conversionRate: 0,
  };

  const getFollowUpIcon = (type: string) => {
    switch (type) {
      case 'PHONE_CALL': return <PhoneCall size={14} className="text-secondary" />;
      case 'EMAIL': return <Mail size={14} className="text-cyan-400" />;
      case 'ZOOM': return <Video size={14} className="text-purple-400" />;
      case 'PROPOSAL_REVIEW': return <FileText size={14} className="text-amber-400" />;
      default: return <CalendarDays size={14} className="text-primary" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Dashboard Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-gray-900 tracking-tight flex items-center gap-2">
              Pipeline Workspace
              <Sparkles size={20} className="text-primary" />
            </h1>
            <p className="text-xs md:text-sm text-gray-500">
              Review agency performance, active conversions, and follow-ups.
            </p>
          </div>
        </div>

        {/* KPI Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Leads */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Leads</span>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold font-display text-gray-900">{stats.totalLeads}</span>
              <span className="flex items-center gap-1 text-[10px] text-teal-600 font-semibold mt-1">
                <TrendingUp size={12} />
                +{stats.newLeadsMonth} generated this month
              </span>
            </div>
          </div>

          {/* Card 2: Hot Leads */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hot Leads</span>
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                <Flame size={16} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold font-display text-gray-900">{stats.hotLeads}</span>
              <span className="block text-[10px] text-gray-500 font-semibold mt-1">
                Priority: Urgent or High
              </span>
            </div>
          </div>

          {/* Card 3: Follow-Ups Due */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reminders due</span>
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-display text-gray-900">{stats.followUpsDueToday}</span>
                {stats.followUpsOverdue > 0 && (
                  <span className="text-xs font-bold text-red-600 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded">
                    {stats.followUpsOverdue} Overdue
                  </span>
                )}
              </div>
              <span className="block text-[10px] text-gray-500 font-semibold mt-1">
                Tasks allocated for today
              </span>
            </div>
          </div>

          {/* Card 4: Converted Clients */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Conversion</span>
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-display text-gray-900">{stats.convertedClients}</span>
                <span className="text-xs text-teal-600 font-bold">
                  {stats.conversionRate}% Rate
                </span>
              </div>
              <span className="block text-[10px] text-gray-500 font-semibold mt-1">
                Total deals marked WON
              </span>
            </div>
          </div>
        </div>

        {/* Charts Node */}
        {data && (
          <DashboardCharts
            monthlyTrends={data.charts.monthlyTrends}
            statusDistribution={data.charts.statusDistribution}
            serviceDistribution={data.charts.serviceDistribution}
          />
        )}

        {/* Bottom Split Row: Reminders & Timelines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Due Follow-ups (Left) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display font-semibold text-base text-gray-900">Allocated Reminders</h3>
                <p className="text-xs text-gray-500">Actionable follow-up items scheduled for your leads</p>
              </div>
              <button
                onClick={() => router.push('/calendar')}
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-semibold"
              >
                Open Calendar
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-96 pr-1">
              {dueFollowUps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg border border-gray-200">
                  <UserCheck size={28} className="text-gray-400 mb-2" />
                  <p className="text-xs font-medium text-gray-500">All caught up! No due reminders.</p>
                </div>
              ) : (
                dueFollowUps.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-primary/30 hover:bg-gray-100 transition-all flex items-start gap-4"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      {getFollowUpIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4
                          onClick={() => router.push(`/leads?id=${item.leadId}`)}
                          className="text-xs font-semibold hover:text-primary hover:underline cursor-pointer truncate text-gray-900"
                        >
                          {item.lead.name}
                        </h4>
                        <span className="text-[10px] text-gray-500">
                          {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-normal mb-2">
                        {item.note || 'Scoping follow-up interaction.'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          item.priority === 'URGENT' ? 'bg-red-50 text-red-600 border border-red-200' :
                          item.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                          'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {item.priority}
                        </span>
                        <button
                          onClick={() => completeFollowUp(item.id, item.note || '')}
                          className="text-[10px] font-bold text-teal-600 hover:text-white bg-teal-50 hover:bg-teal-600 border border-teal-200 px-2.5 py-1 rounded transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 size={10} />
                          Mark Done
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Timeline (Right) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col shadow-sm">
            <div className="mb-6">
              <h3 className="font-display font-semibold text-base text-gray-900">Global Audit Timeline</h3>
              <p className="text-xs text-gray-500">Chronological log of CRM modifications</p>
            </div>

            <div className="relative border-l border-gray-200 pl-5 ml-2 space-y-5 flex-1 overflow-y-auto max-h-96 pr-1">
              {data?.recentActivities?.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-12">No recent logs recorded.</p>
              ) : (
                data?.recentActivities?.map((act: any) => (
                  <div key={act.id} className="relative group">
                    <span className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-gray-300 border-2 border-white group-hover:bg-primary transition-colors" />
                    
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-500 block font-semibold uppercase tracking-wider mb-0.5">
                        {new Date(act.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <p className="text-xs font-semibold text-gray-900 leading-normal">
                        {act.description}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <span>Logged by:</span>
                        <strong className="text-gray-700 font-medium">{act.user.name}</strong>
                        {act.lead && (
                          <>
                            <span>•</span>
                            <span>Lead:</span>
                            <strong
                              onClick={() => router.push(`/leads?id=${act.lead.id}`)}
                              className="text-primary hover:underline cursor-pointer"
                            >
                              {act.lead.name}
                            </strong>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
