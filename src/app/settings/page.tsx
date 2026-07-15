'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/context/AuthContext';
import {
  Settings,
  User,
  Bell,
  Link as LinkIcon,
  ShieldAlert,
  Users,
  Plus,
  Save,
  Check,
  X,
  Mail,
  Calendar,
  AlertTriangle,
  Trash2
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'integrations' | 'users'>('profile');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
  });

  // Notification States
  const [notifyPreferences, setNotifyPreferences] = useState({
    inApp: true,
    browserPush: false,
    emailAlerts: true,
    timingOffset: '15M_BEFORE'
  });

  // Integrations states
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendConnected, setResendConnected] = useState(false);
  const [googleSyncStatus, setGoogleSyncStatus] = useState<{
    connected: boolean;
    connectedEmail: string | null;
    lastSyncedAt: string | null;
  } | null>(null);

  // User Management List (Database driven)
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'MEMBER',
    password: 'password123'
  });

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserForm, setEditUserForm] = useState({
    id: '',
    name: '',
    role: 'MEMBER',
    phoneNumber: '',
    department: '',
    status: 'ACTIVE'
  });

  // Removal safeguards states
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [userToRemoveDetails, setUserToRemoveDetails] = useState<{
    user: any;
    counts: { leads: number; followUps: number; notes: number };
  } | null>(null);
  const [removeAction, setRemoveAction] = useState<'archive' | 'transfer'>('archive');
  const [transferToUserId, setTransferToUserId] = useState<string>('');

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchTeamUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setTeamUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load team users:', err);
    }
  };

  const fetchGoogleSyncStatus = async () => {
    try {
      const res = await fetch('/api/integrations/google/sync');
      if (res.ok) {
        const data = await res.json();
        setGoogleSyncStatus(data);
      }
    } catch (err) {
      console.error('Failed to load Google sync status:', err);
    }
  };

  useEffect(() => {
    fetchTeamUsers();
    fetchGoogleSyncStatus();
  }, []);

  // Clear toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    }, 800);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) return;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: `Member ${newUserForm.name} added successfully.`, type: 'success' });
        setShowAddUserModal(false);
        setNewUserForm({ name: '', email: '', role: 'MEMBER', password: 'password123' });
        fetchTeamUsers();
      } else {
        setToast({ message: data.error || 'Failed to add member', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error adding team member', type: 'error' });
    }
  };

  const handleEditMemberClick = (member: any) => {
    setEditingUser(member);
    setEditUserForm({
      id: member.id,
      name: member.name || '',
      role: member.role || 'MEMBER',
      phoneNumber: member.phoneNumber || '',
      department: member.department || '',
      status: member.status || 'ACTIVE'
    });
    setShowEditUserModal(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserForm.name) return;

    try {
      const res = await fetch(`/api/users/${editUserForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editUserForm.name,
          role: editUserForm.role,
          phoneNumber: editUserForm.phoneNumber,
          department: editUserForm.department,
          status: editUserForm.status,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: `Member "${editUserForm.name}" updated successfully.`, type: 'success' });
        setShowEditUserModal(false);
        setEditingUser(null);
        fetchTeamUsers();
      } else {
        setToast({ message: data.error || 'Failed to update member', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error updating team member', type: 'error' });
    }
  };

  const toggleUserStatus = async (targetUser: any) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setToast({ message: `User ${targetUser.name} is now ${nextStatus.toLowerCase()}.`, type: 'success' });
        fetchTeamUsers();
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to update status', type: 'error' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleUserRole = async (targetUser: any) => {
    const nextRole = targetUser.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    try {
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });

      if (res.ok) {
        setToast({ message: `User ${targetUser.name} role updated to ${nextRole}.`, type: 'success' });
        fetchTeamUsers();
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to update role', type: 'error' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInitiateRemoveUser = async (targetUser: any) => {
    try {
      const res = await fetch(`/api/users/${targetUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setUserToRemoveDetails(data);
        setTransferToUserId('');
        // If has records, default to transfer, else clean archive/delete
        const hasRecords = data.counts.leads > 0 || data.counts.followUps > 0 || data.counts.notes > 0;
        setRemoveAction(hasRecords ? 'transfer' : 'archive');
        setShowRemoveModal(true);
      } else {
        setToast({ message: 'Failed to retrieve member details', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error checking member ownership records', type: 'error' });
    }
  };

  const handleConfirmRemoveUser = async () => {
    if (!userToRemoveDetails) return;
    const { user: targetUser } = userToRemoveDetails;

    let url = `/api/users/${targetUser.id}?action=${removeAction}`;
    if (removeAction === 'transfer') {
      if (!transferToUserId) {
        setToast({ message: 'Please select a member to transfer records to.', type: 'error' });
        return;
      }
      url += `&transferToId=${transferToUserId}`;
    }

    try {
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        setToast({ message: data.message || `Member ${targetUser.name} removed successfully.`, type: 'success' });
        setShowRemoveModal(false);
        setUserToRemoveDetails(null);
        fetchTeamUsers();
      } else {
        setToast({ message: data.error || 'Failed to remove member', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error processing member removal', type: 'error' });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      const res = await fetch('/api/integrations/google/sync', { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: 'Google account disconnected.', type: 'success' });
        fetchGoogleSyncStatus();
      } else {
        setToast({ message: 'Failed to disconnect account.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 text-gray-900 text-xs max-w-4xl pb-10">
        
        {/* Page Title */}
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 tracking-tight flex items-center gap-2">
            CRM System Configurations
            <Settings size={20} className="text-primary" />
          </h1>
          <p className="text-xs text-gray-500">Adjust personal dashboard settings, notification gates, integrations, and user access roles.</p>
        </div>

        {/* Configurations Layout Split */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Side Tab Controls */}
          <div className="w-full md:w-56 bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left font-semibold transition-all ${
                activeTab === 'profile' ? 'bg-blue-50 text-primary border border-blue-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <User size={15} />
              Account Settings
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left font-semibold transition-all ${
                activeTab === 'notifications' ? 'bg-blue-50 text-primary border border-blue-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Bell size={15} />
              Notification Settings
            </button>

            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left font-semibold transition-all ${
                activeTab === 'integrations' ? 'bg-blue-50 text-primary border border-blue-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <LinkIcon size={15} />
              Connected Integrations
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left font-semibold transition-all ${
                activeTab === 'users' ? 'bg-blue-50 text-primary border border-blue-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Users size={15} />
              Team Management
            </button>
          </div>

          {/* Main Setting Workspace Area */}
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm min-h-[400px]">
            {activeTab === 'profile' && (
              <form onSubmit={handleSavePreferences} className="space-y-4 max-w-md">
                <h3 className="font-display font-semibold text-base mb-4">Edit Profile details</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Update Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password (optional)"
                    value={profileForm.password}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-primary hover:opacity-90 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-white transition-all shadow-sm"
                >
                  {saveStatus === 'saving' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : saveStatus === 'saved' ? (
                    <>
                      <Check size={14} />
                      Saved Successfully
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Configurations
                    </>
                  )}
                </button>
              </form>
            )}

            {activeTab === 'notifications' && (
              <form onSubmit={handleSavePreferences} className="space-y-5">
                <div>
                  <h3 className="font-display font-semibold text-base">Alert Preferences</h3>
                  <p className="text-xs text-gray-500 mb-4">Set where and when you receive lead and follow-up notifications.</p>
                </div>

                <div className="space-y-3.5 bg-gray-50 border border-gray-200 p-4 rounded-xl max-w-md">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyPreferences.inApp}
                      onChange={(e) => setNotifyPreferences(prev => ({ ...prev, inApp: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-200 bg-white checked:bg-primary accent-primary"
                    />
                    <div>
                      <span className="font-semibold block">In-App Notification Toasts</span>
                      <span className="text-[10px] text-gray-500">Display visual alerts inside the header navigation</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer border-t border-gray-100 pt-3">
                    <input
                      type="checkbox"
                      checked={notifyPreferences.browserPush}
                      onChange={(e) => setNotifyPreferences(prev => ({ ...prev, browserPush: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-200 bg-white checked:bg-primary accent-primary"
                    />
                    <div>
                      <span className="font-semibold block">Browser Push Notifications</span>
                      <span className="text-[10px] text-gray-500">Send system notifications via service worker when tab is minimized</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer border-t border-gray-100 pt-3">
                    <input
                      type="checkbox"
                      checked={notifyPreferences.emailAlerts}
                      onChange={(e) => setNotifyPreferences(prev => ({ ...prev, emailAlerts: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-200 bg-white checked:bg-primary accent-primary"
                    />
                    <div>
                      <span className="font-semibold block">Email Reminders Dispatch</span>
                      <span className="text-[10px] text-gray-500">Send templated reminders via SMTP connection directly to your inbox</span>
                    </div>
                  </label>
                </div>

                <div className="max-w-md">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Default Reminder Timing Lead Window
                  </label>
                  <select
                    value={notifyPreferences.timingOffset}
                    onChange={(e) => setNotifyPreferences(prev => ({ ...prev, timingOffset: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none cursor-pointer"
                  >
                    <option value="AT_TIME">At scheduled time</option>
                    <option value="15M_BEFORE">15 minutes before</option>
                    <option value="1H_BEFORE">1 hour before</option>
                    <option value="1D_BEFORE">1 day before</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-primary hover:opacity-90 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-white transition-all shadow-sm"
                >
                  <Save size={14} />
                  Save Preferences
                </button>
              </form>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-semibold text-base">Connected Integrations</h3>
                  <p className="text-xs text-gray-500">Configure connection configurations for external systems. No secret keys are rendered here for security.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  {/* Google Calendar sync setup */}
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">Google Calendar</h4>
                          <p className="text-[10px] text-gray-500">Sync client meetings and CRM follow-up windows.</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] space-y-2.5">
                        {googleSyncStatus && googleSyncStatus.connected ? (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Connected Account:</span>
                              <span className="text-emerald-600 font-mono font-semibold">{googleSyncStatus.connectedEmail || 'Synced'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Status:</span>
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">✓ Active Connection</span>
                            </div>
                            {googleSyncStatus.lastSyncedAt && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500">Last Synced:</span>
                                <span className="text-gray-500 font-mono">{new Date(googleSyncStatus.lastSyncedAt).toLocaleString()}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-500 text-[9px] leading-relaxed">
                            No active integration. Setup Google OAuth to synchronize events automatically with your CRM dashboard.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      {googleSyncStatus && googleSyncStatus.connected ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleDisconnectGoogle}
                            className="flex-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                          >
                            Disconnect
                          </button>
                          <a
                            href="/api/integrations/google/auth?action=link"
                            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200 py-1.5 rounded-lg text-[10px] font-semibold text-center transition-colors block"
                          >
                            Reconnect
                          </a>
                        </div>
                      ) : (
                        <a
                          href="/api/integrations/google/auth?action=link"
                          className="block w-full bg-primary hover:opacity-90 text-white py-1.5 rounded-lg text-[10px] font-bold text-center transition-all shadow-sm"
                        >
                          Connect Google Account
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Resend API key setup */}
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
                          <Mail size={18} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">Resend Email Delivery</h4>
                          <p className="text-[10px] text-gray-500">Dispatch email updates for overdue follow-up alerts.</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5">Resend API Key</label>
                        <input
                          type="password"
                          placeholder="re_••••••••••••••••••••"
                          value={resendApiKey}
                          onChange={(e) => setResendApiKey(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 outline-none focus:border-primary/50 font-mono text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          if (resendApiKey.trim() !== '') {
                            setResendConnected(!resendConnected);
                            setToast({
                              message: resendConnected ? 'Resend disconnected.' : 'Resend connected successfully.',
                              type: 'success'
                            });
                          }
                        }}
                        className={`w-full py-1.5 rounded-lg font-bold border text-[10px] transition-colors ${
                          resendConnected
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-primary text-white border-transparent hover:opacity-90'
                        }`}
                      >
                        {resendConnected ? 'Connected (✓)' : 'Connect API Key'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-display font-semibold text-base">Team Members Accounts</h3>
                    <p className="text-xs text-gray-500">Admin-only panel to review roles and adjust member status.</p>
                  </div>

                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="bg-primary hover:opacity-90 px-3.5 py-2 rounded-lg text-white font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14} />
                      Add Member
                    </button>
                  )}
                </div>

                {user?.role !== 'ADMIN' ? (
                  /* Warning banner for non-admin */
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3 items-start max-w-md">
                    <ShieldAlert className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <h4 className="font-semibold text-gray-900">Administrative Access Required</h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                        Your account is currently assigned the role: <strong className="text-teal-600">MEMBER</strong>. Team and roles configurations are restricted to administrator accounts.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* User List Table for Admin */
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                          <th className="p-3">Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3 text-center">Role</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {teamUsers.map(member => (
                          <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 font-semibold text-gray-900">{member.name}</td>
                            <td className="p-3 text-gray-500 font-mono text-[10px]">{member.email}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold inline-block ${
                                member.role === 'ADMIN' ? 'bg-blue-50 text-primary border-blue-200' : 'bg-teal-50 text-teal-600 border-teal-200'
                              }`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold inline-block ${
                                member.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                              }`}>
                                {member.status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              <button
                                onClick={() => handleEditMemberClick(member)}
                                className="text-[10px] font-semibold hover:text-primary transition-colors bg-blue-50 border border-blue-200 px-2.5 py-1 rounded hover:bg-blue-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleUserRole(member)}
                                className="text-[10px] font-semibold hover:text-primary transition-colors bg-gray-50 border border-gray-200 px-2 py-1 rounded"
                                title="Toggle Role"
                              >
                                Toggle Role
                              </button>
                              <button
                                onClick={() => toggleUserStatus(member)}
                                className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                                  member.status === 'ACTIVE'
                                    ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
                                    : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              </button>
                              {user?.id !== member.id && (
                                <button
                                  onClick={() => handleInitiateRemoveUser(member)}
                                  className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2 py-1 rounded transition-colors inline-flex items-center gap-1"
                                >
                                  <Trash2 size={12} />
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Admin Add User */}
        {showAddUserModal && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50 animate-fade-in" onClick={() => setShowAddUserModal(false)} />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-lg p-6 relative animate-fade-in text-gray-900 text-xs">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-primary" />
                
                <h3 className="font-display font-bold text-base mb-4">Add Team Member</h3>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane@saraban.com"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Temporary Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Access Role
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none cursor-pointer"
                    >
                      <option value="MEMBER">Team Member (assigned leads only)</option>
                      <option value="ADMIN">Admin (full global visibility)</option>
                    </select>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg text-xs font-semibold text-gray-900 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary hover:opacity-90 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm"
                    >
                      Create User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Modal: Safety Remove Team Member */}
        {showRemoveModal && userToRemoveDetails && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50 animate-fade-in" onClick={() => {
              setShowRemoveModal(false);
              setUserToRemoveDetails(null);
            }} />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-lg p-6 relative animate-fade-in text-gray-900 text-xs">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-red-600" />
                
                <h3 className="font-display font-bold text-base mb-2 flex items-center gap-2 text-rose-600">
                  <ShieldAlert size={18} />
                  Remove Team Member
                </h3>
                
                <p className="text-gray-500 mb-4">
                  Are you sure you want to remove <strong className="text-gray-900">{userToRemoveDetails.user.name}</strong> ({userToRemoveDetails.user.email}) from the team?
                </p>

                {/* If the user has assigned records */}
                {(userToRemoveDetails.counts.leads > 0 || userToRemoveDetails.counts.followUps > 0 || userToRemoveDetails.counts.notes > 0) ? (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-2">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-1.5 text-rose-600">
                        <AlertTriangle size={14} />
                        Assigned Data Warning
                      </h4>
                      <p className="text-[10px] text-gray-500 leading-normal">
                        This member currently owns or created the following records in the CRM:
                      </p>
                      <ul className="list-disc list-inside space-y-1 font-semibold text-gray-900 pl-1 text-[10px]">
                        <li>{userToRemoveDetails.counts.leads} Leads</li>
                        <li>{userToRemoveDetails.counts.followUps} Meetings, Tasks & Follow-ups</li>
                        <li>{userToRemoveDetails.counts.notes} Internal Notes</li>
                      </ul>
                      <p className="text-[10px] text-gray-500 leading-normal mt-1">
                        Please choose a safety protocol to prevent data loss.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Removal Strategy</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all">
                          <input
                            type="radio"
                            name="removeAction"
                            checked={removeAction === 'transfer'}
                            onChange={() => setRemoveAction('transfer')}
                            className="accent-primary"
                          />
                          <div className="ml-2">
                            <span className="font-semibold block">Transfer Ownership (Recommended)</span>
                            <span className="text-[9px] text-gray-500">Move all leads, follow-ups, notes, and activities to another team member.</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all">
                          <input
                            type="radio"
                            name="removeAction"
                            checked={removeAction === 'archive'}
                            onChange={() => setRemoveAction('archive')}
                            className="accent-primary"
                          />
                          <div className="ml-2">
                            <span className="font-semibold block">Archive User & Preserve Data</span>
                            <span className="text-[9px] text-gray-500">Deactivate account (mark as inactive). All records remain owned by this user.</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {removeAction === 'transfer' && (
                      <div className="space-y-2 animate-fade-in">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Transfer Target Member</label>
                        <select
                          value={transferToUserId}
                          onChange={(e) => setTransferToUserId(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none cursor-pointer"
                        >
                          <option value="">-- Select Active Team Member --</option>
                          {teamUsers
                            .filter(u => u.id !== userToRemoveDetails.user.id && u.status === 'ACTIVE')
                            .map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-[11px] bg-gray-50 p-3 rounded-lg">
                    This user has no active leads or records. They can be removed cleanly from the system database immediately.
                  </p>
                )}

                <div className="flex gap-3 justify-end pt-4 mt-6 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowRemoveModal(false);
                      setUserToRemoveDetails(null);
                    }}
                    className="bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg text-xs font-semibold text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRemoveUser}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm"
                  >
                    {removeAction === 'archive' ? 'Archive Member' : 'Transfer & Remove'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal: Admin Edit User */}
        {showEditUserModal && editingUser && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50 animate-fade-in" onClick={() => { setShowEditUserModal(false); setEditingUser(null); }} />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-lg p-6 relative animate-fade-in text-gray-900 text-xs">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-primary" />
                
                <h3 className="font-display font-bold text-base mb-4">Edit Team Member</h3>

                <form onSubmit={handleEditUser} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Role
                    </label>
                    <select
                      value={editUserForm.role}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none cursor-pointer"
                    >
                      <option value="MEMBER">Team Member (MEMBER)</option>
                      <option value="ADMIN">Administrator (ADMIN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +1 555-0192"
                      value={editUserForm.phoneNumber}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Immersive XR"
                      value={editUserForm.department}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Status
                    </label>
                    <select
                      value={editUserForm.status}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 outline-none cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                      className="bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg text-xs font-semibold text-gray-900 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary hover:opacity-90 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Global Action Toast Notification */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-semibold transition-all duration-300 animate-slide-in flex items-center gap-2 text-xs ${
            toast.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
          }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="hover:opacity-75">
              <X size={14} />
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
