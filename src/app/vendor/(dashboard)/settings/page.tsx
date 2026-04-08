'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, MapPin, Clock, User, Store, Plus, X, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/ui/ImageUpload';

interface ServiceArea {
    id: string;
    pincode: string;
    isActive: boolean;
}

interface DeliverySlot {
    id: string;
    dayOfWeek: number;
    slotStart: string;
    slotEnd: string;
    cutoffTime: string;
    isActive: boolean;
}

interface VendorSettings {
    id: string;
    businessName: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    minOrderValue: number;
    creditEnabled: boolean;
    deliveryFee: number;
    freeDeliveryAbove: number | null;
    serviceAreas: ServiceArea[];
    deliverySlots: DeliverySlot[];
    user: { email: string; phone: string | null; fullName: string };
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatTime(t: string): string {
    const [hours, minutes] = t.split(':');
    const h = parseInt(hours, 10);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function VendorSettingsPage() {
    const [settings, setSettings] = useState<VendorSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Profile fields
    const [businessName, setBusinessName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [minOrderValue, setMinOrderValue] = useState('');
    const [creditEnabled, setCreditEnabled] = useState(false);

    // Service area add form
    const [newPincode, setNewPincode] = useState('');
    const [addingArea, setAddingArea] = useState(false);

    // Delivery slot add/edit form
    const [showSlotForm, setShowSlotForm] = useState(false);
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
    const [slotDay, setSlotDay] = useState(1);
    const [slotStart, setSlotStart] = useState('');
    const [slotEnd, setSlotEnd] = useState('');
    const [slotCutoff, setSlotCutoff] = useState('');
    const [savingSlot, setSavingSlot] = useState(false);

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/vendor/settings');
            const json = await res.json();
            if (json.success) {
                const data = json.data;
                setSettings(data);
                setBusinessName(data.businessName);
                setDescription(data.description || '');
                setLogoUrl(data.logoUrl || '');
                setBannerUrl(data.bannerUrl || '');
                setMinOrderValue(String(data.minOrderValue));
                setCreditEnabled(data.creditEnabled);
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    // ── Profile Save ──
    const handleSave = async () => {
        try {
            setSaving(true);
            setSaved(false);
            const res = await fetch('/api/v1/vendor/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessName,
                    description: description || null,
                    logoUrl: logoUrl || null,
                    bannerUrl: bannerUrl || null,
                    minOrderValue: parseFloat(minOrderValue) || 0,
                    creditEnabled,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Save failed');
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    // ── Service Area CRUD ──
    const handleAddArea = async () => {
        if (!newPincode.trim()) return;
        try {
            setAddingArea(true);
            const res = await fetch('/api/v1/vendor/settings/service-areas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pincode: newPincode.trim() }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to add');
            setSettings(prev => prev ? { ...prev, serviceAreas: [...prev.serviceAreas, json.data] } : prev);
            setNewPincode('');
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to add service area');
        } finally {
            setAddingArea(false);
        }
    };

    const handleToggleArea = async (area: ServiceArea) => {
        try {
            const res = await fetch('/api/v1/vendor/settings/service-areas', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: area.id, isActive: !area.isActive }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to update');
            setSettings(prev => prev ? {
                ...prev,
                serviceAreas: prev.serviceAreas.map(a => a.id === area.id ? json.data : a),
            } : prev);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to update');
        }
    };

    const handleDeleteArea = async (area: ServiceArea) => {
        if (!confirm(`Remove service area ${area.pincode}?`)) return;
        try {
            const res = await fetch('/api/v1/vendor/settings/service-areas', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: area.id }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to delete');
            setSettings(prev => prev ? {
                ...prev,
                serviceAreas: prev.serviceAreas.filter(a => a.id !== area.id),
            } : prev);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete');
        }
    };

    // ── Delivery Slot CRUD ──
    const resetSlotForm = () => {
        setShowSlotForm(false);
        setEditingSlotId(null);
        setSlotDay(1);
        setSlotStart('');
        setSlotEnd('');
        setSlotCutoff('');
    };

    const openAddSlot = () => {
        resetSlotForm();
        setShowSlotForm(true);
    };

    const openEditSlot = (slot: DeliverySlot) => {
        setEditingSlotId(slot.id);
        setSlotDay(slot.dayOfWeek);
        setSlotStart(slot.slotStart);
        setSlotEnd(slot.slotEnd);
        setSlotCutoff(slot.cutoffTime);
        setShowSlotForm(true);
    };

    const handleSaveSlot = async () => {
        if (!slotStart || !slotEnd || !slotCutoff) {
            alert('Please fill all time fields');
            return;
        }
        try {
            setSavingSlot(true);
            if (editingSlotId) {
                // Update existing
                const res = await fetch('/api/v1/vendor/settings/delivery-slots', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editingSlotId,
                        dayOfWeek: slotDay,
                        slotStart,
                        slotEnd,
                        cutoffTime: slotCutoff,
                    }),
                });
                const json = await res.json();
                if (!json.success) throw new Error(json.error?.message || 'Failed to update');
                setSettings(prev => prev ? {
                    ...prev,
                    deliverySlots: prev.deliverySlots.map(s => s.id === editingSlotId ? json.data : s),
                } : prev);
            } else {
                // Create new
                const res = await fetch('/api/v1/vendor/settings/delivery-slots', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dayOfWeek: slotDay,
                        slotStart,
                        slotEnd,
                        cutoffTime: slotCutoff,
                    }),
                });
                const json = await res.json();
                if (!json.success) throw new Error(json.error?.message || 'Failed to add');
                setSettings(prev => prev ? {
                    ...prev,
                    deliverySlots: [...prev.deliverySlots, json.data],
                } : prev);
            }
            resetSlotForm();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to save slot');
        } finally {
            setSavingSlot(false);
        }
    };

    const handleToggleSlot = async (slot: DeliverySlot) => {
        try {
            const res = await fetch('/api/v1/vendor/settings/delivery-slots', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: slot.id, isActive: !slot.isActive }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to update');
            setSettings(prev => prev ? {
                ...prev,
                deliverySlots: prev.deliverySlots.map(s => s.id === slot.id ? json.data : s),
            } : prev);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to update');
        }
    };

    const handleDeleteSlot = async (slot: DeliverySlot) => {
        if (!confirm(`Delete ${DAY_NAMES[slot.dayOfWeek]} ${formatTime(slot.slotStart)} - ${formatTime(slot.slotEnd)} slot?`)) return;
        try {
            const res = await fetch('/api/v1/vendor/settings/delivery-slots', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: slot.id }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to delete');
            setSettings(prev => prev ? {
                ...prev,
                deliverySlots: prev.deliverySlots.filter(s => s.id !== slot.id),
            } : prev);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete. It may be linked to existing orders — try deactivating instead.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 size={36} className="animate-spin text-[#299E60]" />
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-[16px] font-bold text-[#7C7C7C]">Failed to load settings</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10 max-w-[800px]">
            <div>
                <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Settings</h1>
                <p className="text-[#000000] text-[13px] font-medium opacity-70">Manage your store settings</p>
            </div>

            {/* Business Profile */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#EEEEEE] flex items-center gap-2">
                    <Store size={20} className="text-[#299E60]" />
                    <h2 className="text-[18px] font-bold text-[#181725]">Business Profile</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Business Name</label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40"
                        />
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-3 text-[14px] outline-none focus:border-[#299E60]/40 resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Store Logo</label>
                            <ImageUpload
                                value={logoUrl}
                                onChange={(url) => setLogoUrl(url)}
                                folder="vendors"
                                label="Upload Logo"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Store Cover / Banner</label>
                            <ImageUpload
                                value={bannerUrl}
                                onChange={(url) => setBannerUrl(url)}
                                folder="vendors"
                                label="Upload Cover Image"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Minimum Order Value (₹)</label>
                            <input
                                type="number"
                                value={minOrderValue}
                                onChange={(e) => setMinOrderValue(e.target.value)}
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40"
                            />
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={creditEnabled}
                                    onChange={(e) => setCreditEnabled(e.target.checked)}
                                    className="w-5 h-5 accent-[#299E60]"
                                />
                                <span className="text-[14px] font-bold text-[#181725]">Enable credit for customers</span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="h-[48px] px-8 bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={16} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {saved && (
                            <span className="text-[14px] font-bold text-[#299E60] animate-pulse">Saved successfully!</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#EEEEEE] flex items-center gap-2">
                    <User size={20} className="text-[#3B82F6]" />
                    <h2 className="text-[18px] font-bold text-[#181725]">Account Information</h2>
                </div>
                <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between py-2">
                        <span className="text-[14px] text-[#7C7C7C]">Name</span>
                        <span className="text-[14px] font-bold text-[#181725]">{settings.user.fullName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-[#F5F5F5]">
                        <span className="text-[14px] text-[#7C7C7C]">Email</span>
                        <span className="text-[14px] font-bold text-[#181725]">{settings.user.email}</span>
                    </div>
                    {settings.user.phone && (
                        <div className="flex items-center justify-between py-2 border-t border-[#F5F5F5]">
                            <span className="text-[14px] text-[#7C7C7C]">Phone</span>
                            <span className="text-[14px] font-bold text-[#181725]">{settings.user.phone}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Service Areas — CRUD */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#EEEEEE] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MapPin size={20} className="text-[#F59E0B]" />
                        <h2 className="text-[18px] font-bold text-[#181725]">Service Areas</h2>
                        <span className="text-[14px] text-[#AEAEAE]">({settings.serviceAreas.length})</span>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    {/* Add new pincode */}
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={newPincode}
                            onChange={(e) => setNewPincode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
                            placeholder="Enter pincode..."
                            className="h-[40px] w-[180px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40"
                        />
                        <button
                            onClick={handleAddArea}
                            disabled={addingArea || !newPincode.trim()}
                            className="h-[40px] px-5 bg-[#299E60] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#238a54] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Plus size={14} />
                            {addingArea ? 'Adding...' : 'Add Area'}
                        </button>
                    </div>

                    {/* List */}
                    {settings.serviceAreas.length === 0 ? (
                        <p className="text-[14px] text-[#AEAEAE]">No service areas configured. Add a pincode above.</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {settings.serviceAreas.map((area) => (
                                <div
                                    key={area.id}
                                    className={cn(
                                        'flex items-center gap-2 pl-4 pr-2 py-2 rounded-[10px] border text-[13px] font-bold group',
                                        area.isActive
                                            ? 'bg-[#FFF8E1] border-[#F59E0B]/20 text-[#976538]'
                                            : 'bg-[#F5F5F5] border-[#EEEEEE] text-[#AEAEAE]'
                                    )}
                                >
                                    <MapPin size={14} />
                                    <span>{area.pincode}</span>
                                    <button
                                        onClick={() => handleToggleArea(area)}
                                        className="relative ml-1 inline-flex h-[18px] w-[32px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200"
                                        style={{ backgroundColor: area.isActive ? '#299E60' : '#D1D5DB' }}
                                        title={area.isActive ? 'Deactivate' : 'Activate'}
                                    >
                                        <span className="inline-block h-[13px] w-[13px] rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: area.isActive ? 'translateX(16px)' : 'translateX(3px)' }} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteArea(area)}
                                        className="p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Remove"
                                    >
                                        <X size={14} className="text-[#E74C3C]" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Delivery Slots — CRUD */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#EEEEEE] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock size={20} className="text-[#8B5CF6]" />
                        <h2 className="text-[18px] font-bold text-[#181725]">Delivery Slots</h2>
                        <span className="text-[14px] text-[#AEAEAE]">({settings.deliverySlots.length})</span>
                    </div>
                    <button
                        onClick={openAddSlot}
                        className="h-[36px] px-4 bg-[#8B5CF6] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#7C3AED] transition-colors flex items-center gap-1.5"
                    >
                        <Plus size={14} />
                        Add Slot
                    </button>
                </div>

                {/* Add/Edit Slot Form */}
                {showSlotForm && (
                    <div className="p-6 border-b border-[#EEEEEE] bg-[#FAFAFA]">
                        <h3 className="text-[14px] font-bold text-[#181725] mb-4">
                            {editingSlotId ? 'Edit Delivery Slot' : 'New Delivery Slot'}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Day</label>
                                <select
                                    value={slotDay}
                                    onChange={(e) => setSlotDay(Number(e.target.value))}
                                    className="w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] outline-none focus:border-[#8B5CF6]/40 bg-white"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7].map(d => (
                                        <option key={d} value={d}>{DAY_NAMES[d]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Start Time</label>
                                <input
                                    type="time"
                                    value={slotStart}
                                    onChange={(e) => setSlotStart(e.target.value)}
                                    className="w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] outline-none focus:border-[#8B5CF6]/40"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">End Time</label>
                                <input
                                    type="time"
                                    value={slotEnd}
                                    onChange={(e) => setSlotEnd(e.target.value)}
                                    className="w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] outline-none focus:border-[#8B5CF6]/40"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Cutoff Time</label>
                                <input
                                    type="time"
                                    value={slotCutoff}
                                    onChange={(e) => setSlotCutoff(e.target.value)}
                                    className="w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] outline-none focus:border-[#8B5CF6]/40"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSaveSlot}
                                disabled={savingSlot}
                                className="h-[40px] px-6 bg-[#8B5CF6] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#7C3AED] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Save size={14} />
                                {savingSlot ? 'Saving...' : editingSlotId ? 'Update Slot' : 'Add Slot'}
                            </button>
                            <button
                                onClick={resetSlotForm}
                                className="h-[40px] px-6 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Slot List */}
                <div className="divide-y divide-[#F5F5F5]">
                    {settings.deliverySlots.length === 0 && !showSlotForm ? (
                        <div className="p-6">
                            <p className="text-[14px] text-[#AEAEAE]">No delivery slots configured. Click &quot;Add Slot&quot; to create one.</p>
                        </div>
                    ) : (
                        settings.deliverySlots.map((slot) => (
                            <div key={slot.id} className={cn(
                                'px-6 py-4 flex items-center justify-between transition-colors',
                                !slot.isActive && 'opacity-60'
                            )}>
                                <div>
                                    <p className="text-[14px] font-bold text-[#181725]">
                                        {DAY_NAMES[slot.dayOfWeek] || `Day ${slot.dayOfWeek}`}
                                    </p>
                                    <p className="text-[12px] text-[#7C7C7C]">
                                        {formatTime(slot.slotStart)} - {formatTime(slot.slotEnd)} (Cutoff: {formatTime(slot.cutoffTime)})
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        'text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase',
                                        slot.isActive ? 'bg-[#EEF8F1] text-[#299E60]' : 'bg-[#F5F5F5] text-[#AEAEAE]'
                                    )}>
                                        {slot.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <button
                                        onClick={() => handleToggleSlot(slot)}
                                        className="relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200"
                                        style={{ backgroundColor: slot.isActive ? '#299E60' : '#D1D5DB' }}
                                        title={slot.isActive ? 'Deactivate' : 'Activate'}
                                    >
                                        <span className="inline-block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: slot.isActive ? 'translateX(18px)' : 'translateX(3px)' }} />
                                    </button>
                                    <button
                                        onClick={() => openEditSlot(slot)}
                                        className="p-1.5 rounded-[6px] hover:bg-blue-50 transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil size={14} className="text-[#3B82F6]" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSlot(slot)}
                                        className="p-1.5 rounded-[6px] hover:bg-red-50 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} className="text-[#E74C3C]" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
