'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, Loader2, MapPin, Users, ShieldCheck, ChevronRight, X, Building2 } from 'lucide-react';

interface AccountDetail {
  id: string;
  legalName: string;
  displayName: string | null;
  gstin: string | null;
  pan: string | null;
  businessType: string | null;
  isCustomer: boolean;
  isVendor: boolean;
  isBrand: boolean;
  primaryOutletId: string | null;
  outlets: Array<{ id: string; name: string; pincode: string | null; requiresAddressUpdate: boolean }>;
  _count: { members: number; roles: number };
}

interface AccountOverviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onOpenOutlets?: () => void;
  onOpenMembers?: () => void;
  onOpenRoles?: () => void;
}

export function AccountOverviewOverlay({
  isOpen,
  onClose,
  accountId,
  onOpenOutlets,
  onOpenMembers,
  onOpenRoles,
}: AccountOverviewOverlayProps) {
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!accountId) return;
    Promise.resolve().then(() => setLoading(true));
    fetch(`/api/v1/account/${accountId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setAccount(j.data);
      })
      .catch((err) => console.error('Error fetching account overview:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const incomplete = account ? account.outlets.filter((o) => o.requiresAddressUpdate).length : 0;

  return (
    <div className="fixed inset-0 z-[14000] flex items-start justify-center animate-in fade-in duration-200">
      <div className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:w-[600px] md:mt-[5vh] md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 bg-[#F2F3F2] md:bg-white flex flex-col animate-in slide-in-from-right md:slide-in-from-bottom md:zoom-in-95 duration-300 relative z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-4 md:px-6 py-3 md:py-4 shrink-0 relative bg-white border-b border-gray-100">
          <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 md:hidden z-10">
            <ChevronLeft size={20} className="text-[#181725]" />
          </button>
          <h2 className="w-full text-center md:text-left text-[17px] md:text-[20px] font-[700] text-[#181725]">Account Overview</h2>
          <button onClick={onClose} className="hidden md:flex p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 z-10">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 md:pt-5 pb-28 md:pb-6">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-[#53B175]" />
            </div>
          ) : !account ? (
            <p className="text-[13px] text-[#666] py-12 text-center bg-white rounded-xl border border-gray-100">
              Could not load business account details.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onOpenOutlets?.();
                  }}
                  className="bg-white border border-gray-100 rounded-xl p-4 hover:border-[#53B175]/30 hover:shadow-sm transition-all text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="w-8 h-8 rounded-lg bg-[#E8F5E9] flex items-center justify-center">
                      <MapPin size={16} className="text-[#53B175]" />
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Outlets</p>
                    <p className="text-[18px] font-bold text-[#181725]">{account.outlets.length}</p>
                    <p className={`text-[9.5px] mt-0.5 font-medium ${incomplete > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {incomplete > 0 ? `${incomplete} need address` : 'All complete'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenMembers?.();
                  }}
                  className="bg-white border border-gray-100 rounded-xl p-4 hover:border-[#53B175]/30 hover:shadow-sm transition-all text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Users size={16} className="text-blue-500" />
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Members</p>
                    <p className="text-[18px] font-bold text-[#181725]">{account._count.members}</p>
                    <p className="text-[9.5px] mt-0.5 text-gray-500 font-medium">Manage access</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenRoles?.();
                  }}
                  className="bg-white border border-gray-100 rounded-xl p-4 hover:border-[#53B175]/30 hover:shadow-sm transition-all text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <ShieldCheck size={16} className="text-purple-500" />
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Custom Roles</p>
                    <p className="text-[18px] font-bold text-[#181725]">{account._count.roles}</p>
                    <p className="text-[9.5px] mt-0.5 text-gray-500 font-medium">Matrix & templates</p>
                  </div>
                </button>
              </div>

              {/* Business Details Section */}
              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2.5">
                  <Building2 size={16} className="text-[#53B175]" />
                  <h3 className="text-[14px] font-bold text-[#181725]">Business Details</h3>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
                  <DetailRow label="Legal name" value={account.legalName} />
                  <DetailRow label="Display name" value={account.displayName ?? '—'} />
                  <DetailRow label="GSTIN" value={account.gstin ?? '—'} mono />
                  <DetailRow label="PAN" value={account.pan ?? '—'} mono />
                  <DetailRow label="Business type" value={account.businessType ?? '—'} />
                  <DetailRow
                    label="Account type"
                    value={[
                      account.isCustomer && 'Customer',
                      account.isVendor && 'Vendor',
                      account.isBrand && 'Brand',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">{label}</dt>
      <dd className={`text-[#181725] font-medium mt-1 ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</dd>
    </div>
  );
}
