'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import confetti from 'canvas-confetti';
import { SERVICES } from '@/lib/services';
import * as XLSX from 'xlsx';
import { sendBrowserNotification, requestNotificationPermission } from '@/lib/notifications';
import {
  Kanban,
  List as ListIcon,
  Search,
  Plus,
  FileDown,
  FileUp,
  X,
  Phone,
  Mail,
  Building,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  FolderOpen,
  Send,
  MoreVertical,
  Paperclip,
  CheckCircle2,
  Trash2,
  Copy,
  Archive,
  RefreshCw,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Status Options
const STATUSES = [
  { id: 'NEW', label: 'New', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { id: 'FOLLOW_UP_SCHEDULED', label: 'Follow-Up Scheduled', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'PROPOSAL_SENT', label: 'Proposal Sent', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'WON', label: 'Won', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'LOST', label: 'Lost', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'ON_HOLD', label: 'On Hold', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

// SERVICES list is now imported from '@/lib/services'
const SOURCES = ['Website', 'Referral', 'Cold outreach', 'Inbound', 'Other'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function LeadsPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [leads, setLeads] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'followups' | 'notes' | 'attachments' | 'timeline'>('overview');
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Lead Import States
  const [importStep, setImportStep] = useState<'UPLOAD' | 'PREVIEW' | 'SUMMARY'>('UPLOAD');
  const [importData, setImportData] = useState<{
    fileName: string;
    contacts: any[];
    duplicates: any[];
    mapping: {
      nameMapped: string;
      phoneMapped: string;
      addressMapped: string;
      emailMapped: string;
      companyMapped: string;
    };
  } | null>(null);
  const [duplicateResolution, setDuplicateResolution] = useState<'skip' | 'update' | 'import_all'>('skip');
  const [importSummary, setImportSummary] = useState<string>('');

  // Forms
  const [newNote, setNewNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Lead Create/Edit Form States
  const [leadForm, setLeadForm] = useState({
    name: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    address: '',
    country: 'USA',
    industry: '',
    source: 'Website',
    service: 'Website',
    estimatedBudget: '',
    expectedStartDate: '',
    priority: 'MEDIUM',
    status: 'NEW',
    assignedToId: '',
    tags: '',
    internalNotes: '',
  });

  // Follow-up Form States
  const [followUpForm, setFollowUpForm] = useState({
    type: 'PHONE_CALL',
    scheduledAt: '',
    reminderTiming: 'AT_TIME',
    priority: 'MEDIUM',
    note: '',
  });

  const [schedulerDate, setSchedulerDate] = useState<Date>(new Date());
  const [schedulerMonth, setSchedulerMonth] = useState<number>(new Date().getMonth());
  const [schedulerYear, setSchedulerYear] = useState<number>(new Date().getFullYear());
  const [schedulerTime, setSchedulerTime] = useState<string>('09:00 AM');

  useEffect(() => {
    fetchLeads();
    fetchTeamMembers();
  }, [search, filterService, filterPriority, filterAssignee]);

  // Handle URL triggers (e.g. action=new or id=xyz)
  useEffect(() => {
    requestNotificationPermission();
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const id = params.get('id');
    if (action === 'new') {
      setShowAddModal(true);
    }
    if (id) {
      handleOpenLead(id);
    }
  }, []);

  const fetchLeads = async () => {
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (filterService) q.append('service', filterService);
      if (filterPriority) q.append('priority', filterPriority);
      if (filterAssignee) q.append('assignedToId', filterAssignee);
      
      const res = await fetch(`/api/leads?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.teamPerformance || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenLead = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data.lead);
        setDrawerTab('overview');
        setDrawerOpen(true);
      }
    } catch (err) {
      console.error('Failed to load lead details:', err);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchLeads();
        // Reset Form
        setLeadForm({
          name: '',
          companyName: '',
          contactPerson: '',
          email: '',
          phone: '',
          whatsapp: '',
          website: '',
          address: '',
          country: 'USA',
          industry: '',
          source: 'Website',
          service: 'Website',
          estimatedBudget: '',
          expectedStartDate: '',
          priority: 'MEDIUM',
          status: 'NEW',
          assignedToId: '',
          tags: '',
          internalNotes: '',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLeadField = async (fields: any) => {
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedLead((prev: any) => ({ ...prev, ...data.lead }));
        fetchLeads();
        
        // Fire Confetti if marked WON
        if (fields.status === 'WON') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#2563eb', '#0d9488', '#ec4899']
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    // Optimistic UI Update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus } : l))
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (res.ok) {
        fetchLeads();
        if (targetStatus === 'WON') {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#2563eb', '#0d9488', '#10b981']
          });
        }
      } else {
        // Revert on failure
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  // Duplicate / Archive / Delete Actions
  const handleDuplicateLead = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/${id}?action=duplicate`, { method: 'POST' });
      if (res.ok) {
        fetchLeads();
        setDrawerOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveLead = async (id: string, isArchived: boolean) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived }),
      });
      if (res.ok) {
        fetchLeads();
        setDrawerOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleHardDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this lead?')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLeads();
        setDrawerOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedLead) return;

    try {
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });

      if (res.ok) {
        setNewNote('');
        handleOpenLead(selectedLead.id); // Refresh detail
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar & Scheduling Helpers
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (schedulerMonth === 0) {
      setSchedulerMonth(11);
      setSchedulerYear(prev => prev - 1);
    } else {
      setSchedulerMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (schedulerMonth === 11) {
      setSchedulerMonth(0);
      setSchedulerYear(prev => prev + 1);
    } else {
      setSchedulerMonth(prev => prev + 1);
    }
  };

  const handleShortcutToday = () => {
    const today = new Date();
    setSchedulerDate(today);
    setSchedulerMonth(today.getMonth());
    setSchedulerYear(today.getFullYear());
  };

  const handleShortcutNextWeek = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setSchedulerDate(nextWeek);
    setSchedulerMonth(nextWeek.getMonth());
    setSchedulerYear(nextWeek.getFullYear());
  };

  const handleShortcutNextMonth = () => {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setSchedulerDate(nextMonth);
    setSchedulerMonth(nextMonth.getMonth());
    setSchedulerYear(nextMonth.getFullYear());
  };

  // Parse schedulerTime into components for custom time selects
  const [timeHour, timeMinute, timeAmpm] = React.useMemo(() => {
    const match = schedulerTime.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (match) {
      const hr = parseInt(match[1], 10);
      const min = match[2];
      const ap = match[3].toUpperCase();
      return [hr, min, ap];
    }
    return [9, '00', 'AM'];
  }, [schedulerTime]);

  const handleTimeChange = (newHour: number, newMinute: string, newAmpm: string) => {
    const formattedHour = String(newHour).padStart(2, '0');
    setSchedulerTime(`${formattedHour}:${newMinute} ${newAmpm}`);
  };

  // Add Follow-up
  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    // Parse 12-hour AM/PM schedulerTime string into hours and minutes
    const timeMatch = schedulerTime.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    let hours = 9;
    let minutes = 0;
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }

    const scheduledDate = new Date(schedulerDate);
    scheduledDate.setHours(hours, minutes, 0, 0);
    const scheduledAtISO = scheduledDate.toISOString();

    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...followUpForm,
          scheduledAt: scheduledAtISO,
          leadId: selectedLead.id,
          assignedToId: selectedLead.assignedToId,
        }),
      });

      if (res.ok) {
        // Trigger browser notification
        sendBrowserNotification('Follow-Up Scheduled Successfully', {
          body: `Follow-up (${followUpForm.type.replace(/_/g, ' ')}) scheduled with ${selectedLead.name} for ${scheduledDate.toLocaleString()}`,
          icon: '/logo.png'
        });

        setFollowUpForm({
          type: 'PHONE_CALL',
          scheduledAt: '',
          reminderTiming: 'AT_TIME',
          priority: 'MEDIUM',
          note: '',
        });
        setSchedulerDate(new Date());
        setSchedulerTime('09:00 AM');
        handleOpenLead(selectedLead.id); // Refresh details
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Leads as CSV
  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['Name', 'Company', 'Contact Person', 'Email', 'Phone', 'Service', 'Priority', 'Status', 'Budget', 'Source'];
    const rows = leads.map(l => [
      l.name,
      l.companyName || '',
      l.contactPerson,
      l.email,
      l.phone || '',
      l.service,
      l.priority,
      l.status,
      l.estimatedBudget || '',
      l.source
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `saraban_leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel / CSV File Import handlers
  const downloadCSVTemplate = () => {
    const content = "Name,Phone Number,Address,Email,Company,Lead Source,Service,Notes\n" +
      "John Doe,9876543210,Chennai,john@example.com,Example Co,Website,Website,Interested in website design\n" +
      "Priya S,9876543211,Coimbatore,priya@example.com,Digital Corp,Referral,UI/UX,Wants a redesign";
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "saraban_leads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcelTemplate = () => {
    const headers = ["Name", "Phone Number", "Address", "Email", "Company", "Lead Source", "Service", "Notes"];
    const rows = [
      ["John Doe", "9876543210", "Chennai", "john@example.com", "Example Co", "Website", "Website", "Interested in website design"],
      ["Priya S", "9876543211", "Coimbatore", "priya@example.com", "Digital Corp", "Referral", "UI/UX", "Wants a redesign"]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads Template");
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "saraban_leads_template.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length === 0) {
          alert('Spreadsheet is empty.');
          return;
        }

        const headers = (jsonData[0] || []).map(h => String(h || '').trim());
        const rows = jsonData.slice(1);

        let nameIdx = -1;
        let phoneIdx = -1;
        let addressIdx = -1;
        let emailIdx = -1;
        let companyIdx = -1;
        let sourceIdx = -1;
        let serviceIdx = -1;
        let notesIdx = -1;

        headers.forEach((header, idx) => {
          const h = header.toLowerCase();
          if (/name|full\s*name|contact\s*name/i.test(h) && nameIdx === -1) nameIdx = idx;
          else if (/mobile|phone|number|contact\s*number/i.test(h) && phoneIdx === -1) phoneIdx = idx;
          else if (/address|location/i.test(h) && addressIdx === -1) addressIdx = idx;
          else if (/email/i.test(h) && emailIdx === -1) emailIdx = idx;
          else if (/company/i.test(h) && companyIdx === -1) companyIdx = idx;
          else if (/source|lead\s*source/i.test(h) && sourceIdx === -1) sourceIdx = idx;
          else if (/service/i.test(h) && serviceIdx === -1) serviceIdx = idx;
          else if (/notes/i.test(h) && notesIdx === -1) notesIdx = idx;
        });

        if (nameIdx === -1 || phoneIdx === -1 || addressIdx === -1) {
          alert('Could not auto-detect required columns (Name, Phone Number, Address). Please verify spreadsheet headers.');
          return;
        }

        const parsedContacts = rows
          .map((row) => {
            const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
            const phone = phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : '';
            const address = addressIdx !== -1 ? String(row[addressIdx] || '').trim() : '';
            const email = emailIdx !== -1 ? String(row[emailIdx] || '').trim() : '';
            const companyName = companyIdx !== -1 ? String(row[companyIdx] || '').trim() : '';
            const source = sourceIdx !== -1 ? String(row[sourceIdx] || '').trim() : '';
            const service = serviceIdx !== -1 ? String(row[serviceIdx] || '').trim() : '';
            const internalNotes = notesIdx !== -1 ? String(row[notesIdx] || '').trim() : '';

            return {
              name,
              phone,
              address,
              email,
              companyName,
              source: source || 'Import',
              service: service || 'Website',
              internalNotes
            };
          })
          .filter((c) => c.name !== '');

        const duplicates: any[] = [];
        parsedContacts.forEach((contact) => {
          const isDup = leads.some((l) => 
            (contact.email && l.email && l.email.toLowerCase() === contact.email.toLowerCase()) ||
            (contact.phone && l.phone && l.phone.replace(/\D/g, '') === contact.phone.replace(/\D/g, ''))
          );
          if (isDup) {
            duplicates.push(contact);
          }
        });

        setImportData({
          fileName: file.name,
          contacts: parsedContacts,
          duplicates,
          mapping: {
            nameMapped: nameIdx !== -1 ? headers[nameIdx] : 'None',
            phoneMapped: phoneIdx !== -1 ? headers[phoneIdx] : 'None',
            addressMapped: addressIdx !== -1 ? headers[addressIdx] : 'None',
            emailMapped: emailIdx !== -1 ? headers[emailIdx] : 'None',
            companyMapped: companyIdx !== -1 ? headers[companyIdx] : 'None',
          }
        });
        setImportStep('PREVIEW');
      } catch (err) {
        console.error(err);
        alert('Failed to parse file. Make sure it is a valid CSV or Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (!importData) return;
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: importData.contacts,
          duplicateResolution,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportSummary(data.message);
        setImportStep('SUMMARY');
        fetchLeads();
      } else {
        alert(data.error || 'Failed to import contacts.');
      }
    } catch (err) {
      console.error(err);
      alert('Error importing contacts.');
    }
  };

  // Mock Upload Attachment
  const handleUploadAttachment = async () => {
    if (!selectedLead) return;
    const fileName = `Design_Scope_${Math.floor(Math.random()*1000)}.pdf`;
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          fileUrl: '#',
          fileType: 'PDF',
          fileSize: 840200,
        }),
      });
      if (res.ok) {
        handleOpenLead(selectedLead.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 relative min-h-screen pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900 tracking-tight">Leads Dashboard</h1>
            <p className="text-xs text-gray-500">Manage service leads and track pipeline conversion milestones.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50 transition-colors border border-gray-200 px-3.5 py-2 rounded-lg text-xs font-semibold"
            >
              <FileDown size={14} />
              Export CSV
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50 transition-colors border border-gray-200 px-3.5 py-2 rounded-lg text-xs font-semibold"
            >
              <FileUp size={14} />
              Import Contacts
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-primary hover:opacity-90 px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm"
            >
              <Plus size={14} />
              New Lead
            </button>
          </div>
        </div>

        {/* Filters and View Toggles */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-white border border-gray-200 p-4 rounded-xl">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-lg focus-within:border-primary/50 transition-colors w-full md:w-72">
            <Search className="absolute left-3 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search by name, company, tags..."
              className="bg-transparent pl-9 pr-3 py-1.5 text-xs outline-none text-gray-900 w-full placeholder-gray-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 w-full md:w-auto flex-1">
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 outline-none cursor-pointer"
            >
              <option value="">All Services</option>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 outline-none cursor-pointer"
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 outline-none cursor-pointer"
            >
              <option value="">All Assignees</option>
              {teamMembers.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          <div className="flex bg-white border border-gray-200 p-0.5 rounded-lg w-full md:w-auto">
            <button
              onClick={() => setView('kanban')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Kanban size={13} />
              Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ListIcon size={13} />
              List
            </button>
          </div>
        </div>

        {/* View Layouts */}
        {view === 'kanban' ? (
          /* Kanban View Layout */
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 overflow-x-auto pb-4 no-scrollbar">
            {STATUSES.map((col) => {
              const colLeads = leads.filter((l) => l.status === col.id);
              return (
                <div
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className="flex flex-col bg-white border border-gray-200 rounded-xl p-3 min-w-[240px] kanban-column"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                    <span className="font-display font-semibold text-xs text-gray-900">{col.label}</span>
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-semibold">
                      {colLeads.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] no-scrollbar">
                    {colLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => handleOpenLead(lead.id)}
                        className="p-3.5 rounded-xl bg-white border border-gray-200 hover:border-primary hover:shadow-md cursor-grab active:cursor-grabbing transition-all select-none group relative"
                      >
                        <h4 className="text-xs font-semibold text-gray-900 group-hover:text-primary transition-colors truncate mb-1">
                          {lead.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 truncate mb-2.5">
                          {lead.companyName || 'No Company'}
                        </p>

                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                            {lead.service}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                            lead.priority === 'URGENT' ? 'bg-red-50 text-red-600' :
                            lead.priority === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {lead.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View Layout */
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                    <th className="p-4">Lead Name</th>
                    <th className="p-4">Company</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Budget</th>
                    <th className="p-4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        No matches found. Create a new lead to get started.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => handleOpenLead(lead.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-semibold text-gray-900">{lead.name}</td>
                        <td className="p-4 text-gray-500">{lead.companyName || '—'}</td>
                        <td className="p-4">
                          <p className="text-gray-900">{lead.contactPerson}</p>
                          <p className="text-[10px] text-gray-500">{lead.email}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-mono text-[10px] text-gray-500">
                            {lead.service}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            lead.priority === 'URGENT' ? 'bg-red-50 text-red-600' :
                            lead.priority === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {lead.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold inline-block ${
                            STATUSES.find((s) => s.id === lead.status)?.color
                          }`}>
                            {STATUSES.find((s) => s.id === lead.status)?.label}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-semibold text-gray-600">
                          {lead.estimatedBudget ? `$${lead.estimatedBudget.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-4 text-gray-500">{lead.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lead Slide-over Drawer Panel */}
        {drawerOpen && selectedLead && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40 animate-fade-in" onClick={() => setDrawerOpen(false)} />
            <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white border-l border-gray-200 z-50 shadow-2xl flex flex-col animate-slide-in">
              {/* Drawer Header */}
              <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="font-display font-bold text-base text-gray-900">{selectedLead.name}</h3>
                  <p className="text-[11px] text-gray-500">{selectedLead.companyName || 'Personal Contact'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDuplicateLead(selectedLead.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    title="Duplicate Lead"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => handleArchiveLead(selectedLead.id, !selectedLead.isArchived)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    title={selectedLead.isArchived ? 'Restore Lead' : 'Archive Lead'}
                  >
                    <Archive size={14} />
                  </button>
                  <button
                    onClick={() => handleHardDeleteLead(selectedLead.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete Lead"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors ml-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="flex border-b border-gray-200 text-xs font-semibold bg-gray-50">
                {(['overview', 'followups', 'notes', 'attachments', 'timeline'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDrawerTab(tab)}
                    className={`flex-1 py-3 text-center transition-colors border-b-2 capitalize ${
                      drawerTab === tab
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {drawerTab === 'overview' && (
                  <div className="space-y-4 text-xs">
                    {/* Status Pill Select */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Status Pipeline Stage
                      </label>
                      <select
                        value={selectedLead.status}
                        onChange={(e) => handleUpdateLeadField({ status: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none cursor-pointer focus:border-primary/50"
                      >
                        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>

                    {/* Basic Fields Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Contact Person</span>
                        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-gray-900 font-medium flex items-center gap-1.5">
                          <User size={13} className="text-gray-500" />
                          {selectedLead.contactPerson}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Email Address</span>
                        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-gray-900 font-medium flex items-center gap-1.5 truncate">
                          <Mail size={13} className="text-gray-500" />
                          {selectedLead.email}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Phone Number</span>
                        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-gray-900 font-medium flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-500" />
                          {selectedLead.phone || '—'}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Source</span>
                        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-gray-900 font-medium capitalize">
                          {selectedLead.source}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Settings */}
                    <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Interested Service
                        </label>
                        <select
                          value={selectedLead.service}
                          onChange={(e) => handleUpdateLeadField({ service: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 outline-none cursor-pointer focus:border-primary/50"
                        >
                          {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Priority Rank
                        </label>
                        <select
                          value={selectedLead.priority}
                          onChange={(e) => handleUpdateLeadField({ priority: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 outline-none cursor-pointer focus:border-primary/50"
                        >
                          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Estimated Budget ($)
                        </label>
                        <input
                          type="number"
                          value={selectedLead.estimatedBudget || ''}
                          onChange={(e) => handleUpdateLeadField({ estimatedBudget: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-primary/50"
                          placeholder="Budget amount"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Target Tags (comma split)
                        </label>
                        <input
                          type="text"
                          value={selectedLead.tags || ''}
                          onChange={(e) => handleUpdateLeadField({ tags: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-primary/50"
                          placeholder="xr, game, spatial"
                        />
                      </div>
                    </div>

                    {/* Internal Description */}
                    <div className="border-t border-gray-200 pt-4">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Internal Notes & Brief Description
                      </label>
                      <textarea
                        rows={4}
                        value={selectedLead.internalNotes || ''}
                        onChange={(e) => handleUpdateLeadField({ internalNotes: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 outline-none focus:border-primary/50"
                        placeholder="Detail client target request and XR goals..."
                      />
                    </div>
                  </div>
                )}

                {drawerTab === 'followups' && (
                  <div className="space-y-4">
                    {/* Schedule Follow-up Form */}
                    <form onSubmit={handleScheduleFollowUp} className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-4">
                      <h4 className="font-display font-semibold text-xs text-gray-900">Schedule New Follow-Up</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Type</label>
                          <select
                            value={followUpForm.type}
                            onChange={(e) => setFollowUpForm(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-900 outline-none"
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
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Priority</label>
                          <select
                            value={followUpForm.priority}
                            onChange={(e) => setFollowUpForm(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-900 outline-none"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </div>
                      </div>

                      {/* Custom Monthly Date Picker Grid */}
                      <div className="border border-gray-200 p-3 rounded-xl bg-white">
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5">Select Due Date</label>
                        
                        {/* Month and Navigation */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-900">
                            {MONTH_NAMES[schedulerMonth]} {schedulerYear}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={handlePrevMonth}
                              className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={handleNextMonth}
                              className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Date Shortcuts */}
                        <div className="flex gap-2 justify-between mb-3">
                          <button
                            type="button"
                            onClick={handleShortcutToday}
                            className="flex-1 py-1 px-2 text-[10px] font-semibold bg-gray-50 border border-gray-200 hover:border-primary/55 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={handleShortcutNextWeek}
                            className="flex-1 py-1 px-2 text-[10px] font-semibold bg-gray-50 border border-gray-200 hover:border-primary/55 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                          >
                            Next Week
                          </button>
                          <button
                            type="button"
                            onClick={handleShortcutNextMonth}
                            className="flex-1 py-1 px-2 text-[10px] font-semibold bg-gray-50 border border-gray-200 hover:border-primary/55 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                          >
                            Next Month
                          </button>
                        </div>

                        {/* Calendar Day Headers */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[9px] font-bold text-gray-500">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} className="py-0.5">{d}</div>
                          ))}
                        </div>

                        {/* Calendar Grid Days */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {(() => {
                            const firstDay = new Date(schedulerYear, schedulerMonth, 1).getDay();
                            const totalDays = new Date(schedulerYear, schedulerMonth + 1, 0).getDate();
                            const days = [];
                            for (let i = 0; i < firstDay; i++) {
                              days.push({ day: null, date: null });
                            }
                            for (let d = 1; d <= totalDays; d++) {
                              days.push({ day: d, date: new Date(schedulerYear, schedulerMonth, d) });
                            }

                            return days.map((item, index) => {
                              if (!item.day) {
                                return <div key={`empty-${index}`} className="aspect-square" />;
                              }
                              const isSelected = schedulerDate.getDate() === item.day &&
                                                 schedulerDate.getMonth() === schedulerMonth &&
                                                 schedulerDate.getFullYear() === schedulerYear;
                              const isToday = new Date().getDate() === item.day &&
                                              new Date().getMonth() === schedulerMonth &&
                                              new Date().getFullYear() === schedulerYear;
                              return (
                                <button
                                  key={`day-${item.day}`}
                                  type="button"
                                  onClick={() => setSchedulerDate(item.date!)}
                                  className={`aspect-square text-[10px] rounded-lg flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'bg-primary text-white font-bold shadow-sm scale-105'
                                      : isToday
                                      ? 'bg-gray-100 border border-primary/50 text-gray-900 font-semibold'
                                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                  }`}
                                >
                                  {item.day}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        {/* Selected Date Indicator */}
                        <div className="mt-2 text-[10px] text-gray-500 text-center">
                          Selected: <span className="text-gray-900 font-semibold">{schedulerDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>

                      {/* Custom 12-Hour AM/PM Time Picker */}
                      <div className="border border-gray-200 p-3 rounded-xl bg-white space-y-2">
                        <label className="block text-[9px] font-bold text-gray-500 uppercase">Select Time</label>
                        
                        {/* Time Presets */}
                        <div className="flex gap-1.5 justify-between">
                          {['09:00 AM', '11:00 AM', '02:00 PM', '05:00 PM'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSchedulerTime(t)}
                              className={`flex-1 py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                                schedulerTime === t
                                  ? 'bg-blue-50 border-primary text-primary'
                                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-primary/30 hover:text-gray-900'
                              }`}
                            >
                              {t.replace(/^0/, '')}
                            </button>
                          ))}
                        </div>

                        {/* Custom selects */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <label className="block text-[8px] font-bold text-gray-500 uppercase mb-0.5">Hour</label>
                            <select
                              value={timeHour}
                              onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), timeMinute, timeAmpm)}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] text-gray-900 outline-none cursor-pointer focus:border-primary/50"
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                <option key={h} value={h}>
                                  {String(h).padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-gray-500 uppercase mb-0.5">Minute</label>
                            <select
                              value={timeMinute}
                              onChange={(e) => handleTimeChange(timeHour, e.target.value, timeAmpm)}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] text-gray-900 outline-none cursor-pointer focus:border-primary/50"
                            >
                              {['00', '15', '30', '45'].map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-gray-500 uppercase mb-0.5">AM/PM</label>
                            <select
                              value={timeAmpm}
                              onChange={(e) => handleTimeChange(timeHour, timeMinute, e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] text-gray-900 outline-none cursor-pointer focus:border-primary/50"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>

                        {/* Selected Time Indicator */}
                        <div className="text-[10px] text-gray-500 text-center">
                          Selected Time: <span className="text-gray-900 font-semibold">{schedulerTime}</span>
                        </div>
                      </div>

                      {/* Reminder Timing & Note */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Reminder Alert</label>
                          <select
                            value={followUpForm.reminderTiming}
                            onChange={(e) => setFollowUpForm(prev => ({ ...prev, reminderTiming: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-900 outline-none"
                          >
                            <option value="AT_TIME">At scheduled time</option>
                            <option value="15M_BEFORE">15 minutes before</option>
                            <option value="1H_BEFORE">1 hour before</option>
                            <option value="1D_BEFORE">1 day before</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Instructions / Note</label>
                          <input
                            type="text"
                            placeholder="Discuss pricing..."
                            value={followUpForm.note}
                            onChange={(e) => setFollowUpForm(prev => ({ ...prev, note: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-900 outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/95 py-2.5 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.01]"
                      >
                        <Calendar size={13} />
                        Plan Follow-Up & Sync
                      </button>
                    </form>

                    {/* Follow-ups List */}
                    <div className="space-y-2.5 border-t border-gray-200 pt-4">
                      <h4 className="font-display font-semibold text-xs text-gray-900">Planned Reminders</h4>
                      {selectedLead.followUps?.length === 0 ? (
                        <p className="text-[11px] text-gray-500 py-4 text-center">No follow-ups scheduled.</p>
                      ) : (
                        selectedLead.followUps?.map((item: any) => (
                          <div key={item.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <p className="font-semibold text-gray-900 capitalize">{item.type.replace(/_/g, ' ').toLowerCase()}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">{item.note || 'No notes planned.'}</p>
                              <span className="text-[9px] text-gray-500 block font-mono mt-1">
                                {new Date(item.scheduledAt).toLocaleString()}
                              </span>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              item.status === 'OVERDUE' ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' :
                              'bg-indigo-50 text-indigo-600 border-indigo-200'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {drawerTab === 'notes' && (
                  <div className="space-y-4">
                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Write detailed client update notes..."
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-primary/50"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-primary hover:opacity-90 px-3.5 rounded-lg text-white flex items-center justify-center transition-all"
                      >
                        <Send size={14} />
                      </button>
                    </form>

                    {/* Notes List */}
                    <div className="space-y-2.5">
                      {selectedLead.notes?.length === 0 ? (
                        <p className="text-xs text-gray-500 py-8 text-center">No notes written yet.</p>
                      ) : (
                        selectedLead.notes?.map((n: any) => (
                          <div key={n.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                            <p className="text-xs text-gray-900 leading-normal">{n.content}</p>
                            <span className="text-[9px] text-gray-500 font-mono block">
                              Logged: {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {drawerTab === 'attachments' && (
                  <div className="space-y-4">
                    {/* Upload Mock Trigger */}
                    <div
                      onClick={handleUploadAttachment}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-primary/50 transition-colors flex flex-col items-center justify-center text-center cursor-pointer bg-gray-50 group"
                    >
                      <Paperclip size={24} className="text-gray-500 group-hover:text-primary transition-colors mb-2" />
                      <span className="text-xs font-semibold text-gray-900">Click to Upload Proposal Mock</span>
                      <span className="text-[10px] text-gray-500 mt-1">Simulated upload supporting PDF, DOCX, PNG</span>
                    </div>

                    {/* Attachments List */}
                    <div className="space-y-2.5">
                      {selectedLead.attachments?.length === 0 ? (
                        <p className="text-xs text-gray-500 py-8 text-center">No documents uploaded.</p>
                      ) : (
                        selectedLead.attachments?.map((doc: any) => (
                          <div key={doc.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 text-primary font-bold font-mono text-[9px]">
                                {doc.fileType}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{doc.fileName}</p>
                                <p className="text-[10px] text-gray-500">{(doc.fileSize / 1024).toFixed(0)} KB</p>
                              </div>
                            </div>
                            <a
                              href={doc.fileUrl}
                              download
                              className="text-[10px] font-bold text-teal-600 hover:text-gray-900 border border-teal-200 px-2 py-1 rounded bg-teal-50 transition-colors"
                            >
                              Open
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {drawerTab === 'timeline' && (
                  <div className="relative border-l border-gray-200 pl-5 ml-2 space-y-4 text-xs">
                    {selectedLead.activities?.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Timeline inactive.</p>
                    ) : (
                      selectedLead.activities?.map((act: any) => (
                        <div key={act.id} className="relative">
                          <span className="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-200 border-2 border-white" />
                          <span className="text-[10px] text-gray-500 block font-mono">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                          <p className="font-semibold text-gray-900 mt-0.5">{act.description}</p>
                          <span className="text-[10px] text-gray-500 font-medium block mt-0.5">
                            Author: {act.user?.name || 'System'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Modal: Add Lead Form */}
        {showAddModal && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50 animate-fade-in" onClick={() => setShowAddModal(false)} />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden relative animate-fade-in">
                {/* Header border */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-primary" />

                <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h3 className="font-display font-bold text-base text-gray-900">Create New Agency Lead</h3>
                  <button className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors" onClick={() => setShowAddModal(false)}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateLead} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-gray-900">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Lead Name / Client Campaign</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Spatial Metaverse Room"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Company Name</label>
                      <input
                        type="text"
                        placeholder="e.g. TechCorp LLC"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                        value={leadForm.companyName}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, companyName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contact Person</label>
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                        value={leadForm.contactPerson}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="client@company.com"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                        value={leadForm.email}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+1 555-0100"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                        value={leadForm.phone}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">WhatsApp Contact</label>
                      <input
                        type="text"
                        placeholder="+1 555-0100"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                        value={leadForm.whatsapp}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Service</label>
                      <select
                        value={leadForm.service}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, service: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 outline-none cursor-pointer"
                      >
                        {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Priority</label>
                      <select
                        value={leadForm.priority}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 outline-none cursor-pointer"
                      >
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Source</label>
                      <select
                        value={leadForm.source}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 outline-none cursor-pointer"
                      >
                        {SOURCES.map(so => <option key={so} value={so}>{so}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Estimated Budget ($)</label>
                      <input
                        type="number"
                        placeholder="e.g. 25000"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                        value={leadForm.estimatedBudget}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, estimatedBudget: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tags (comma split)</label>
                      <input
                        type="text"
                        placeholder="e.g. unity, design"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                        value={leadForm.tags}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, tags: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Brief Proposal Scopes / Project Brief</label>
                    <textarea
                      rows={3}
                      placeholder="Add key features or requested service metrics..."
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 text-gray-900 outline-none focus:border-primary/50"
                      value={leadForm.internalNotes}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, internalNotes: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg text-xs font-semibold text-gray-900 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary hover:opacity-90 px-5 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm"
                    >
                      Create Lead
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Modal: CSV / Excel Contacts Import */}
        {showImportModal && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50 animate-fade-in" onClick={() => {
              setShowImportModal(false);
              setImportData(null);
              setImportStep('UPLOAD');
            }} />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-lg p-6 relative animate-fade-in text-gray-900 text-xs">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-primary" />
                
                <h3 className="font-display font-bold text-base mb-1">Import Lead Contacts</h3>
                <p className="text-gray-500 text-[10px] mb-4">Upload a CSV or Excel sheet to bulk import new accounts into Saraban CRM.</p>

                {importStep === 'UPLOAD' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 relative group hover:border-primary/50 transition-colors">
                      <FileUp size={28} className="text-gray-500 mb-2 group-hover:text-primary transition-colors" />
                      <span className="font-semibold text-gray-900">Drag and Drop Spreadsheets Here</span>
                      <span className="text-[10px] text-gray-500 mt-1">Accepts CSV (.csv) and Excel (.xlsx, .xls) files</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        ref={fileInputRef}
                        onChange={handleImportFile}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>

                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg space-y-2">
                      <p className="font-semibold text-[10px] text-gray-900">Required columns: <span className="text-primary">Name, Phone Number, Address</span></p>
                      <p className="text-[9px] text-gray-500">Optional fields: Email, Company, Lead Source, Service, Notes</p>
                      
                      <div className="flex gap-2.5 pt-1.5 border-t border-gray-100">
                        <button
                          onClick={downloadCSVTemplate}
                          className="text-[9px] bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2 py-1.5 rounded transition-colors text-gray-900 font-semibold"
                        >
                          Download CSV Template
                        </button>
                        <button
                          onClick={downloadExcelTemplate}
                          className="text-[9px] bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2 py-1.5 rounded transition-colors text-gray-900 font-semibold"
                        >
                          Download Excel Template
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setShowImportModal(false)}
                        className="bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg text-xs font-semibold text-gray-900 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {importStep === 'PREVIEW' && importData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="text-gray-500 block">File Name:</span>
                        <strong className="text-gray-900 block mt-0.5 truncate">{importData.fileName}</strong>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="text-gray-500 block">Rows Mapped:</span>
                        <strong className="text-gray-900 block mt-0.5">{importData.contacts.length} items found</strong>
                      </div>
                    </div>

                    {/* Auto-mapping verification */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-1.5 uppercase text-[9px] tracking-wider text-primary">Auto-Column Mapping Results</h4>
                      <div className="grid grid-cols-3 gap-2 text-[9px]">
                        <div><span className="text-gray-500">Name:</span> <strong className="text-emerald-600 font-mono">{importData.mapping.nameMapped}</strong></div>
                        <div><span className="text-gray-500">Phone:</span> <strong className="text-emerald-600 font-mono">{importData.mapping.phoneMapped}</strong></div>
                        <div><span className="text-gray-500">Address:</span> <strong className="text-emerald-600 font-mono">{importData.mapping.addressMapped}</strong></div>
                      </div>
                    </div>

                    {/* Duplicates warnings */}
                    {importData.duplicates.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2.5 items-start">
                        <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={14} />
                        <div className="text-[10px]">
                          <strong className="text-gray-900 block font-semibold">Duplicate Contacts Detected ({importData.duplicates.length})</strong>
                          <p className="text-[9px] text-gray-500 mt-0.5">We matching phone numbers or emails against the database and found overlap.</p>
                          <div className="max-h-20 overflow-y-auto mt-2 space-y-0.5 text-[9px] font-mono text-gray-600">
                            {importData.duplicates.slice(0, 3).map((d, i) => (
                              <div key={i}>• {d.name} ({d.email || d.phone})</div>
                            ))}
                            {importData.duplicates.length > 3 && <div>and {importData.duplicates.length - 3} more...</div>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Duplicate handling strategy option selection */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Duplicate Resolution Policy</label>
                      <select
                        value={duplicateResolution}
                        onChange={(e: any) => setDuplicateResolution(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none cursor-pointer"
                      >
                        <option value="skip">Skip duplicates (Ignore files overlapping entries)</option>
                        <option value="update">Update existing (Merge new sheet data onto duplicates)</option>
                        <option value="import_all">Import all (Create double records regardless)</option>
                      </select>
                    </div>

                    <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setImportStep('UPLOAD');
                          setImportData(null);
                        }}
                        className="bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg text-xs font-semibold text-gray-900 transition-colors"
                      >
                        Go Back
                      </button>
                      <button
                        onClick={handleConfirmImport}
                        className="bg-primary hover:opacity-90 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm"
                      >
                        Confirm Import ({importData.contacts.length} leads)
                      </button>
                    </div>
                  </div>
                )}

                {importStep === 'SUMMARY' && (
                  <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                      <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
                      <h4 className="font-semibold text-gray-900 text-sm">Import Completed Successfully!</h4>
                      <p className="text-[10px] text-gray-500 leading-normal max-w-sm mx-auto">{importSummary}</p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          setShowImportModal(false);
                          setImportStep('UPLOAD');
                          setImportData(null);
                        }}
                        className="bg-primary hover:opacity-90 px-5 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
