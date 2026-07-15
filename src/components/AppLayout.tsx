'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Calendar as CalendarIcon,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Bell,
  Search,
  Plus,
  Menu,
  X,
  AlertCircle
} from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, theme, toggleTheme, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [overdueReminders, setOverdueReminders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch alerts for notification bell
  useEffect(() => {
    if (user) {
      fetchAlerts();
      // Poll alerts every 60 seconds
      const interval = setInterval(fetchAlerts, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/followups?status=OVERDUE&limit=5');
      if (res.ok) {
        const data = await res.json();
        setOverdueReminders(data.followUps || []);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>; // Render unauthenticated layout
  }

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Saraban Logo" className="h-8 w-auto object-contain" />
            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 rounded font-bold uppercase px-1.5 py-0.5 tracking-widest">
              CRM
            </span>
          </div>
          <button className="md:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors ${
                    isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Bottom Profile */}
        <div className="p-4 border-t border-gray-200 space-y-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-none mb-1 text-gray-900">{user.name}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                user.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-teal-50 text-teal-700'
              }`}>
                {user.role}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors text-xs font-semibold"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Nav */}
        <header className="h-16 border-b border-gray-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between z-30 sticky top-0">
          <button className="md:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 w-80 focus-within:border-primary transition-colors">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search leads, tags, services..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400 text-gray-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  router.push(`/leads?search=${searchQuery}`);
                }
              }}
            />
            <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300 text-gray-500">
              Enter
            </span>
          </div>

          {/* Actions panel */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/leads?action=new')}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm"
            >
              <Plus size={14} />
              Add Lead
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors relative"
              >
                <Bell size={20} />
                {overdueReminders.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 animate-fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <span className="font-display font-semibold text-sm text-gray-900">Follow-up Notifications</span>
                      <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                        {overdueReminders.length} Overdue
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                      {overdueReminders.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">No overdue follow-up alerts!</p>
                      ) : (
                        overdueReminders.map((rem) => (
                          <div
                            key={rem.id}
                            onClick={() => {
                              setShowNotifications(false);
                              router.push(`/leads?id=${rem.leadId}`);
                            }}
                            className="p-2.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 cursor-pointer transition-colors flex gap-2.5 items-start"
                          >
                            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={14} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate text-gray-900">{rem.lead.name}</p>
                              <p className="text-[11px] text-gray-500 truncate">{rem.note || 'Needs follow-up'}</p>
                              <span className="text-[9px] text-red-600 font-semibold uppercase mt-1 block">
                                Overdue: {new Date(rem.scheduledAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
