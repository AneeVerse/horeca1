'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, Save, Users, Plus, Trash2, Crown, Shield, Edit3, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandProfile {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    website: string | null;
    approvalStatus: string;
}

interface TeamMember {
    id: string;
    role: 'owner' | 'manager' | 'editor' | 'viewer';
    isOwner: boolean;
    createdAt: string;
    user: { id: string; fullName: string; email: string; isActive: boolean };
}

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_CONFIG = {
    owner:   { label: 'Owner',   color: '#F59E0B', bg: '#FFF7E6', Icon: Crown  },
    manager: { label: 'Manager', color: '#3B82F6', bg: '#EFF6FF', Icon: Shield },
    editor:  { label: 'Editor',  color: '#8B5CF6', bg: '#F3F0FF', Icon: Edit3  },
    viewer:  { label: 'Viewer',  color: '#6B7280', bg: '#F3F4F6', Icon: Eye    },
};

export default function BrandSettingsPage() {
    const [profile, setProfile] = useState<BrandProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ name: '', tagline: '', description: '', logoUrl: '', bannerUrl: '', website: '' });
    const [error, setError] = useState<string | null>(null);

    // Team state
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [memberForm, setMemberForm] = useState({ fullName: '', email: '', password: '', role: 'viewer' as 'manager' | 'editor' | 'viewer' });
    const [addingMember, setAddingMember] = useState(false);
    const [memberError, setMemberError] = useState<string | null>(null);

    const fetchTeam = useCallback(async () => {
        try {
            setTeamLoading(true);
            const res = await fetch('/api/v1/brand/team');
            const json = await res.json();
            if (json.success) {
                setTeam(json.data);
                setIsOwner(json.data[0]?.isOwner ?? false);
            }
        } catch { /* silent */ }
        finally { setTeamLoading(false); }
    }, []);

    useEffect(() => {
        fetch('/api/v1/brand/profile')
            .then(r => r.json())
            .then(json => {
                if (json.success) {
                    setProfile(json.data);
                    setForm({
                        name: json.data.name ?? '',
                        tagline: json.data.tagline ?? '',
                        description: json.data.description ?? '',
                        logoUrl: json.data.logoUrl ?? '',
                        bannerUrl: json.data.bannerUrl ?? '',
                        website: json.data.website ?? '',
                    });
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));

        fetchTeam();
    }, [fetchTeam]);

    const handleSave = async () => {
        setSaving(true); setSaved(false); setError(null);
        try {
            const res = await fetch('/api/v1/brand/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name || undefined,
                    tagline: form.tagline || undefined,
                    description: form.description || undefined,
                    logoUrl: form.logoUrl || undefined,
                    bannerUrl: form.bannerUrl || undefined,
                    website: form.website || undefined,
                }),
            });
            const json = await res.json();
            if (json.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
            else setError(json.error?.message ?? 'Failed to save');
        } catch { setError('Network error'); }
        finally { setSaving(false); }
    };

    const handleAddMember = async () => {
        if (!memberForm.fullName.trim() || !memberForm.email.trim() || !memberForm.password.trim()) {
            setMemberError('All fields are required'); return;
        }
        try {
            setAddingMember(true); setMemberError(null);
            const res = await fetch('/api/v1/brand/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memberForm),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to add member');
            setTeam(prev => [...prev, json.data]);
            setShowAddMember(false);
            setMemberForm({ fullName: '', email: '', password: '', role: 'viewer' });
        } catch (err: unknown) {
            setMemberError(err instanceof Error ? err.message : 'Failed to add member');
        } finally { setAddingMember(false); }
    };

    const handleRemoveMember = async (member: TeamMember) => {
        if (!confirm(`Remove ${member.user.fullName} from your team?`)) return;
        try {
            const res = await fetch(`/api/v1/brand/team/${member.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            setTeam(prev => prev.filter(m => m.id !== member.id));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to remove');
        }
    };

    const handleChangeRole = async (member: TeamMember, newRole: 'manager' | 'editor' | 'viewer') => {
        try {
            const res = await fetch(`/api/v1/brand/team/${member.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            setTeam(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to update role');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#53B175]" /></div>;
    }

    const fields = [
        { key: 'name', label: 'Brand Name', placeholder: 'Your brand name', required: true },
        { key: 'tagline', label: 'Tagline', placeholder: 'Short brand description' },
        { key: 'website', label: 'Website', placeholder: 'https://yourbrand.com' },
        { key: 'logoUrl', label: 'Logo URL', placeholder: 'https://...' },
        { key: 'bannerUrl', label: 'Banner URL', placeholder: 'https://...' },
    ];

    return (
        <div className="max-w-[700px] mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight">Brand Settings</h1>
                <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px]">Update your brand profile and team</p>
            </div>

            {profile && (
                <div className="flex items-center gap-3 p-3 bg-[#F8F9FB] rounded-[12px] border border-[#EEEEEE]">
                    <div className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">Brand Slug</div>
                    <code className="text-[13px] font-bold text-[#53B175]">{profile.slug}</code>
                    <div className={cn('ml-auto text-[11px] font-[900] px-2 py-0.5 rounded-[6px]',
                        profile.approvalStatus === 'approved' ? 'bg-[#EEF8F1] text-[#53B175]' : 'bg-[#FFF7E6] text-amber-600')}>
                        {profile.approvalStatus.toUpperCase()}
                    </div>
                </div>
            )}

            {/* Brand Profile Form */}
            <div className="bg-white rounded-[20px] border border-[#EEEEEE] p-6 space-y-5">
                {fields.map(field => (
                    <div key={field.key}>
                        <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1.5 uppercase tracking-wider">
                            {field.label}{field.required && ' *'}
                        </label>
                        <input
                            type="text"
                            value={form[field.key as keyof typeof form]}
                            onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-2.5 text-[14px] font-medium outline-none focus:border-[#53B175]/50 bg-[#FAFAFA] focus:bg-white transition-colors"
                        />
                    </div>
                ))}
                <div>
                    <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1.5 uppercase tracking-wider">Description</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Tell buyers about your brand..."
                        rows={4}
                        className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-3 text-[14px] font-medium outline-none focus:border-[#53B175]/50 bg-[#FAFAFA] focus:bg-white transition-colors resize-none"
                    />
                </div>
                {error && <p className="text-[13px] text-[#E74C3C] font-bold">{error}</p>}
                <div className="flex items-center justify-end pt-2">
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-60 hover:bg-[#3d9e41] transition-colors">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
                        {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Team Members */}
            <div className="bg-white rounded-[20px] border border-[#EEEEEE] overflow-hidden">
                <div className="p-6 border-b border-[#EEEEEE] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={20} className="text-[#53B175]" />
                        <h2 className="text-[18px] font-bold text-[#181725]">Team Members</h2>
                        <span className="text-[14px] text-[#AEAEAE]">({team.length})</span>
                    </div>
                    {isOwner && (
                        <button onClick={() => { setShowAddMember(true); setMemberError(null); }}
                            className="h-[36px] px-4 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#3d9e41] transition-colors flex items-center gap-1.5">
                            <Plus size={14} /> Add Member
                        </button>
                    )}
                </div>

                {showAddMember && (
                    <div className="p-6 border-b border-[#EEEEEE] bg-[#FAFAFA]">
                        <h3 className="text-[14px] font-bold text-[#181725] mb-4">New Team Member</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Full Name</label>
                                <input type="text" value={memberForm.fullName} onChange={e => setMemberForm(f => ({ ...f, fullName: e.target.value }))}
                                    placeholder="e.g. Priya Sharma"
                                    className="w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] outline-none focus:border-[#53B175]/40 bg-white" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Email</label>
                                <input type="email" value={memberForm.email} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="priya@brand.com"
                                    className="w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] outline-none focus:border-[#53B175]/40 bg-white" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Password</label>
                                <input type="password" value={memberForm.password} onChange={e => setMemberForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder="Min. 6 characters"
                                    className="w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] outline-none focus:border-[#53B175]/40 bg-white" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Role</label>
                                <select value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value as 'manager' | 'editor' | 'viewer' }))}
                                    className="w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] outline-none focus:border-[#53B175]/40 bg-white">
                                    <option value="manager">Manager — Full access, no team management</option>
                                    <option value="editor">Editor — Products &amp; catalog only</option>
                                    <option value="viewer">Viewer — Read only</option>
                                </select>
                            </div>
                        </div>
                        {memberError && <p className="mt-3 text-[13px] font-bold text-[#E74C3C]">{memberError}</p>}
                        <div className="flex items-center gap-3 mt-4">
                            <button onClick={handleAddMember} disabled={addingMember}
                                className="h-[40px] px-6 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#3d9e41] transition-colors flex items-center gap-1.5 disabled:opacity-50">
                                {addingMember ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                {addingMember ? 'Creating...' : 'Create Account'}
                            </button>
                            <button onClick={() => setShowAddMember(false)}
                                className="h-[40px] px-6 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Role legend */}
                <div className="px-6 py-3 border-b border-[#F5F5F5] flex flex-wrap gap-3">
                    {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[5px]" style={{ color: cfg.color, backgroundColor: cfg.bg }}>{cfg.label}</span>
                            <span className="text-[11px] text-[#AEAEAE]">
                                {key === 'owner' ? 'Full + team' : key === 'manager' ? 'Full access' : key === 'editor' ? 'Products' : 'Read only'}
                            </span>
                        </div>
                    ))}
                </div>

                {teamLoading ? (
                    <div className="p-6 flex justify-center"><Loader2 size={24} className="animate-spin text-[#53B175]" /></div>
                ) : team.length === 0 ? (
                    <div className="p-6"><p className="text-[14px] text-[#AEAEAE]">No team members yet.</p></div>
                ) : (
                    <div className="divide-y divide-[#F5F5F5]">
                        {team.map(member => {
                            const cfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.viewer;
                            return (
                                <div key={member.id} className="px-6 py-4 flex items-center gap-4">
                                    <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-[14px] font-[900] shrink-0"
                                        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                        {getInitials(member.user.fullName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[14px] font-bold text-[#181725] truncate">{member.user.fullName}</p>
                                            <span className="text-[11px] font-[900] px-2 py-0.5 rounded-[5px]"
                                                style={{ color: cfg.color, backgroundColor: cfg.bg }}>{cfg.label}</span>
                                        </div>
                                        <p className="text-[12px] text-[#7C7C7C] truncate">{member.user.email}</p>
                                    </div>
                                    <p className="text-[12px] text-[#AEAEAE] shrink-0 hidden md:block">
                                        {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    {isOwner && !member.isOwner && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <select value={member.role} onChange={e => handleChangeRole(member, e.target.value as 'manager' | 'editor' | 'viewer')}
                                                className="h-[32px] text-[12px] border border-[#EEEEEE] rounded-[8px] px-2 outline-none focus:border-[#53B175]/40 bg-white">
                                                <option value="manager">Manager</option>
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                            <button onClick={() => handleRemoveMember(member)}
                                                className="p-1.5 rounded-[6px] hover:bg-red-50 transition-colors">
                                                <Trash2 size={14} className="text-[#E74C3C]" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
