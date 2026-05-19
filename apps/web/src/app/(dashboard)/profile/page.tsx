'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User as UserIcon, Lock, Phone, Mail, Shield, Building, Clock, Calendar, CheckCircle, Save
} from 'lucide-react';

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

  // Edit states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Feedback states
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getMe();
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }

    try {
      setActionLoading(true);
      const updated = await usersApi.updateMyProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null
      });
      setProfile(updated);
      // Sync names/phones globally immediately!
      updateUser({ full_name: updated.full_name });
      setSuccessMsg('Profile updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('All password fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    try {
      setActionLoading(true);
      await usersApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      setSuccessMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatJoinDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRole = (roleStr?: string) => {
    if (!roleStr) return 'Employee';
    return roleStr.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-t-2 border-b-2 border-[var(--accent-primary)] animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-1 sm:p-4 text-[var(--text-primary)]">
      {/* Header Panel */}
      <div className="relative p-6 sm:p-8 rounded-3xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)]/60 text-white flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/20">
            <UserIcon className="h-10 w-10 text-white" />
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {profile?.full_name}
            </h1>
            <p className="text-sm font-semibold text-[var(--text-muted)] flex items-center justify-center md:justify-start gap-2">
              <Mail className="h-4 w-4" /> {profile?.email}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
              <span className="px-3 py-1 text-xs font-bold rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                {formatRole(profile?.role)}
              </span>
              <span className="px-3 py-1 text-xs font-bold rounded-lg border border-[var(--status-success-text)]/20 bg-[var(--status-success-text)]/10 text-[var(--status-success-text)] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success-text)] animate-pulse" />
                Active Account
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications banner */}
      {(successMsg || errorMsg) && (
        <div className={`p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
          successMsg 
            ? 'border-[var(--status-success-text)]/20 bg-[var(--status-success-text)]/10 text-[var(--status-success-text)]' 
            : 'border-[var(--status-danger-text)]/20 bg-[var(--status-danger-text)]/10 text-[var(--status-danger-text)]'
        }`}>
          <p className="text-sm font-bold flex items-center gap-2">
            {successMsg ? <CheckCircle className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            {successMsg || errorMsg}
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Navigation Sidebar Cards */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-4 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-2">
            <button
              onClick={() => setActiveTab('info')}
              className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all duration-200 ${
                activeTab === 'info'
                  ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <UserIcon className="h-4 w-4" />
              Profile Details
            </button>
            
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all duration-200 ${
                activeTab === 'security'
                  ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Lock className="h-4 w-4" />
              Security & Credentials
            </button>
          </Card>

          {/* Org & Career Card */}
          <Card className="p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-6">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              Professional Summary
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-default)]">
                  <Building className="h-4 w-4 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Department</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{profile?.department_name || 'Unassigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-default)]">
                  <Shield className="h-4 w-4 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Designation</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{profile?.designation || 'Specialist'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-default)]">
                  <UserIcon className="h-4 w-4 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Reporting Manager</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{profile?.manager_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-default)]">
                  <Clock className="h-4 w-4 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Shift Details</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{profile?.shift_timing || '9:00 AM - 6:00 PM (PKT)'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-semibold">
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-default)]">
                  <Calendar className="h-4 w-4 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Member Since</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{formatJoinDate(profile?.created_at)}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Form panel cards */}
        <div className="lg:col-span-2">
          {activeTab === 'info' ? (
            <Card className="p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Personal Profile Settings</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Keep your direct personal information updated so team members can contact you.
                </p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-3.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-3.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+92 300 1234567"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                    Work Email Address
                  </label>
                  <div className="relative opacity-60">
                    <Mail className="absolute left-4 top-3.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm cursor-not-allowed"
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] italic block mt-1">
                    Your professional email address is managed directly by the human resources division.
                  </span>
                </div>

                <div className="flex justify-end pt-4 border-t border-[var(--border-default)]">
                  <Button 
                    type="submit" 
                    disabled={actionLoading} 
                    className="px-6 py-3 rounded-2xl font-extrabold text-sm flex items-center gap-2"
                  >
                    <Save className="h-4.5 w-4.5" />
                    {actionLoading ? 'Saving...' : 'Update Profile Details'}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Security Preferences</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Ensure password compliance by updating your secret access credentials below.
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      New Security Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4.5 w-4.5 text-[var(--text-muted)]" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[var(--border-default)]">
                  <Button 
                    type="submit" 
                    disabled={actionLoading}
                    className="px-6 py-3 rounded-2xl font-extrabold text-sm flex items-center gap-2"
                  >
                    <Lock className="h-4.5 w-4.5" />
                    {actionLoading ? 'Changing Password...' : 'Save Secure Password'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
        
      </div>
    </div>
  );
}
