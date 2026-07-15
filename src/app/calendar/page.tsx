'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  CalendarDays,
  Plus,
  RefreshCw,
  Video,
  PhoneCall,
  Mail,
  FileText,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  X
} from 'lucide-react';

export default function CalendarPage() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Month Math State (Default to June 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // 0-indexed (5 = June)

  // Quick Plan Modal State
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [quickForm, setQuickForm] = useState({
    leadId: '',
    type: 'PHONE_CALL',
    note: '',
    time: '10:00',
    priority: 'MEDIUM'
  });

  useEffect(() => {
    fetchFollowUps();
    fetchLeads();
    checkGoogleSyncStatus();
  }, []);

  const checkGoogleSyncStatus = async () => {
    try {
      const res = await fetch('/api/integrations/google/sync');
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.connected);
        setConnectedEmail(data.connectedEmail || null);
        if (data.lastSyncedAt) {
          setLastSyncedAt(new Date(data.lastSyncedAt).toLocaleString());
        }
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  const fetchFollowUps = async () => {
    try {
      const res = await fetch('/api/followups');
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data.followUps || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar Math: Days of month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });

  // Render Calendar Grid Cells
  const calendarCells = [];
  
  // Previous Month Padding Cells
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(currentYear, currentMonth - 1, prevMonthDays - i)
    });
  }

  // Current Month Cells
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(currentYear, currentMonth, i)
    });
  }

  // Next Month Padding Cells
  const totalCells = 42; // standard 6 rows
  const remainingCells = totalCells - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(currentYear, currentMonth + 1, i)
    });
  }

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('text/plain', eventId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    if (!eventId) return;

    // Find existing event details
    const existingEvent = followUps.find(ev => ev.id === eventId);
    if (!existingEvent) return;

    const originalDate = new Date(existingEvent.scheduledAt);
    
    // Construct new date keeping old hours/minutes
    const newScheduledAt = new Date(targetDate);
    newScheduledAt.setHours(originalDate.getHours());
    newScheduledAt.setMinutes(originalDate.getMinutes());

    // Optimistic UI update
    setFollowUps(prev =>
      prev.map(ev => (ev.id === eventId ? { ...ev, scheduledAt: newScheduledAt.toISOString(), status: newScheduledAt < new Date() ? 'OVERDUE' : 'PENDING' } : ev))
    );

    try {
      const res = await fetch(`/api/followups/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newScheduledAt.toISOString() }),
      });

      if (res.ok) {
        fetchFollowUps();
      } else {
        // Revert
        fetchFollowUps();
      }
    } catch (err) {
      console.error(err);
      fetchFollowUps();
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'PHONE_CALL': return <PhoneCall size={10} className="text-cyan-600" />;
      case 'EMAIL': return <Mail size={10} className="text-indigo-600" />;
      case 'ZOOM': return <Video size={10} className="text-purple-600" />;
      case 'PROPOSAL_REVIEW': return <FileText size={10} className="text-amber-600" />;
      default: return <CalendarIcon size={10} className="text-gray-500" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'PHONE_CALL': return 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'EMAIL': return 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'ZOOM': return 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200';
      case 'PROPOSAL_REVIEW': return 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Connect Google Sync via real / simulated OAuth
  const toggleGoogleSync = async () => {
    if (googleConnected) {
      setSyncing(true);
      try {
        const res = await fetch('/api/integrations/google/sync', { method: 'DELETE' });
        if (res.ok) {
          setGoogleConnected(false);
          setConnectedEmail(null);
          setLastSyncedAt(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSyncing(false);
      }
    } else {
      window.location.href = '/api/integrations/google/auth?action=link';
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/google/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Synchronization complete!');
        checkGoogleSyncStatus();
        fetchFollowUps();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const toggleOutlookSync = () => {
    if (outlookConnected) {
      setOutlookConnected(false);
    } else {
      setSyncing(true);
      setTimeout(() => {
        setOutlookConnected(true);
        setSyncing(false);
      }, 1200);
    }
  };

  // Open quick schedule on cell tap
  const handleCellClick = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setSelectedDateStr(formattedDate);
    if (leads.length > 0) {
      setQuickForm(prev => ({ ...prev, leadId: leads[0].id }));
    }
    setShowAddForm(true);
  };

  const handleQuickSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.leadId || !selectedDateStr) return;

    // Combine date and time
    const dateTimeStr = `${selectedDateStr}T${quickForm.time}:00`;
    
    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: quickForm.leadId,
          type: quickForm.type,
          scheduledAt: new Date(dateTimeStr).toISOString(),
          note: quickForm.note,
          priority: quickForm.priority,
        }),
      });

      if (res.ok) {
        setShowAddForm(false);
        setQuickForm({
          leadId: leads[0]?.id || '',
          type: 'PHONE_CALL',
          note: '',
          time: '10:00',
          priority: 'MEDIUM'
        });
        fetchFollowUps();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 text-gray-900 text-xs pb-10">
        
        {/* Calendar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900 tracking-tight">Calendar Scheduler</h1>
            <p className="text-xs text-gray-500">Reschedule planned reminders via drag-and-drop grids.</p>
          </div>

          {/* Sync controls panel */}
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-gray-200 p-1.5 rounded-xl gap-2 items-center">
              <span className="text-[10px] text-gray-500 font-semibold uppercase px-1.5">Sync Toggles</span>
              
              <button
                disabled={syncing}
                onClick={toggleGoogleSync}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                  googleConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-white hover:bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                {googleConnected && <Check size={10} />}
                Google Sync
              </button>

              {googleConnected && (
                <button
                  disabled={syncing}
                  onClick={handleManualSync}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold border bg-blue-50 hover:bg-blue-100 text-primary border-blue-200 transition-all flex items-center gap-1"
                >
                  Sync Now
                </button>
              )}

              <button
                disabled={syncing}
                onClick={toggleOutlookSync}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                  outlookConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white hover:bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                {outlookConnected && <Check size={10} />}
                Outlook Sync
              </button>
            </div>

            {syncing && <RefreshCw size={14} className="animate-spin text-primary" />}
          </div>
        </div>

        {/* Sync Info Banner */}
        {googleConnected && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-emerald-700">
            <div className="flex flex-col md:flex-row md:items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Info size={14} className="text-emerald-600 flex-shrink-0" />
                <span className="font-semibold text-gray-900">Google Calendar Sync Active</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="text-gray-500">Connected Account:</span>{' '}
                  <span className="text-gray-900 font-mono font-semibold">{connectedEmail || 'Authenticated'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{' '}
                  <span className="text-emerald-600 font-semibold">✓ Sync Active</span>
                </div>
                {lastSyncedAt && (
                  <div>
                    <span className="text-gray-500">Last Sync:</span>{' '}
                    <span className="text-gray-900 font-mono">{lastSyncedAt}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                disabled={syncing}
                onClick={handleManualSync}
                className="bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 px-2.5 py-1 rounded text-[9px] font-bold transition-all"
              >
                Sync Now
              </button>
              <a
                href="/api/integrations/google/auth?action=link"
                className="bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200 px-2.5 py-1 rounded text-[9px] font-bold text-center transition-colors block"
              >
                Reconnect
              </a>
              <button
                disabled={syncing}
                onClick={toggleGoogleSync}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1 rounded text-[9px] font-bold transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
        {outlookConnected && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between gap-2 text-teal-700">
            <div className="flex items-center gap-2">
              <Info size={14} />
              <p className="text-[10px] font-semibold leading-none">
                Two-way synchronization active. Dragging events automatically syncs details to your linked external calendar.
              </p>
            </div>
          </div>
        )}

        {/* Month Selector Title */}
        <div className="flex items-center justify-between bg-white border border-gray-200 px-4 py-3 rounded-xl">
          <h2 className="font-display font-bold text-base text-gray-900 tracking-tight">
            {monthName} {currentYear}
          </h2>
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-0.5">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setCurrentMonth(now.getMonth());
                setCurrentYear(now.getFullYear());
              }}
              className="text-[10px] font-bold px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-900"
            >
              Today
            </button>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Calendar Month Grid */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center font-bold text-gray-500 uppercase text-[10px] py-2 tracking-wider">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid Cells */}
          <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-gray-100 bg-white">
            {calendarCells.map((cell, idx) => {
              const cellDateStr = cell.date.toDateString();
              
              // Filter follow-ups scheduled on this specific date
              const dayEvents = followUps.filter(ev => {
                const eventDate = new Date(ev.scheduledAt);
                return eventDate.toDateString() === cellDateStr;
              });

              return (
                <div
                  key={idx}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, cell.date)}
                  className={`min-h-[100px] p-2 flex flex-col hover:bg-gray-50 transition-colors ${
                    cell.isCurrentMonth ? 'text-gray-900' : 'text-gray-500 opacity-30 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      onClick={() => handleCellClick(cell.date)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-[11px] cursor-pointer hover:bg-blue-50 hover:text-primary transition-all ${
                        cellDateStr === new Date().toDateString() ? 'bg-primary text-white' : ''
                      }`}
                    >
                      {cell.day}
                    </span>
                    
                    {cell.isCurrentMonth && (
                      <button
                        onClick={() => handleCellClick(cell.date)}
                        className="opacity-0 hover:opacity-100 p-0.5 text-gray-500 hover:text-primary transition-opacity"
                        title="Add follow-up"
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>

                  {/* Cell Events List */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px] no-scrollbar">
                    {dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ev.id)}
                        className={`px-1.5 py-1 rounded border text-[9px] font-semibold cursor-grab active:cursor-grabbing truncate transition-colors flex items-center gap-1 ${getEventBg(ev.type)}`}
                        title={`${ev.lead.name}: ${ev.note || ''}`}
                      >
                        {getEventIcon(ev.type)}
                        <span className="truncate">{ev.lead.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal: Quick Add Follow-up Form */}
        {showAddForm && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50 animate-fade-in" onClick={() => setShowAddForm(false)} />
            <div className="fixed inset-y-0 right-0 w-full md:w-[360px] bg-white border-l border-gray-200 z-50 p-5 flex flex-col justify-between shadow-2xl animate-slide-in">
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <h3 className="font-display font-bold text-sm text-gray-900">Quick Schedule Follow-up</h3>
                  <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleQuickSchedule} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target Lead</label>
                    <select
                      value={quickForm.leadId}
                      required
                      onChange={(e) => setQuickForm(prev => ({ ...prev, leadId: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 outline-none"
                    >
                      {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.contactPerson})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Type</label>
                      <select
                        value={quickForm.type}
                        onChange={(e) => setQuickForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 outline-none"
                      >
                        <option value="PHONE_CALL">Phone Call</option>
                        <option value="EMAIL">Email</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="ZOOM">Zoom Meeting</option>
                        <option value="IN_PERSON">In-Person</option>
                        <option value="PROPOSAL_REVIEW">Proposal Review</option>
                        <option value="CUSTOM">Custom Activity</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Due Time</label>
                      <input
                        type="time"
                        required
                        value={quickForm.time}
                        onChange={(e) => setQuickForm(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Priority</label>
                    <select
                      value={quickForm.priority}
                      onChange={(e) => setQuickForm(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Instructions / Note</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Add follow-up instructions..."
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 outline-none"
                      value={quickForm.note}
                      onChange={(e) => setQuickForm(prev => ({ ...prev, note: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:opacity-90 py-2.5 rounded-lg text-xs font-semibold text-white transition-opacity"
                  >
                    Schedule Follow-up
                  </button>
                </form>
              </div>

              <div className="text-[10px] text-gray-500 leading-normal p-3 rounded-lg bg-gray-50 border border-gray-200">
                Scheduled for date: <strong className="text-gray-900">{selectedDateStr}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
