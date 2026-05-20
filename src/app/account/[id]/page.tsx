'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, MapPin, Users, ShieldCheck, ChevronRight } from 'lucide-react';

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

export default function AccountOverviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/account/${id}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setAccount(j.data); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-[#299E60]" /></div>;
  if (!account) return null;

  const incomplete = account.outlets.filter((o) => o.requiresAddressUpdate).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Outlets"
        value={account.outlets.length}
        sub={incomplete > 0 ? `${incomplete} need address` : 'All complete'}
        subTone={incomplete > 0 ? 'warning' : 'ok'}
        href={`/account/${id}/outlets`}
        icon={MapPin}
      />
      <StatCard label="Members" value={account._count.members} href={`/account/${id}/users`} icon={Users} />
      <StatCard label="Custom Roles" value={account._count.roles} href={`/account/${id}/roles`} icon={ShieldCheck} />

      <section className="bg-white rounded-2xl border border-[#F0F0F0] p-5 md:col-span-3">
        <h2 className="text-[15px] font-bold text-[#181725] mb-4">Business Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
          <Row label="Legal name" value={account.legalName} />
          <Row label="Display name" value={account.displayName ?? '—'} />
          <Row label="GSTIN" value={account.gstin ?? '—'} mono />
          <Row label="PAN" value={account.pan ?? '—'} mono />
          <Row label="Business type" value={account.businessType ?? '—'} />
          <Row label="Account type" value={[account.isCustomer && 'Customer', account.isVendor && 'Vendor', account.isBrand && 'Brand'].filter(Boolean).join(' · ')} />
        </dl>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, subTone, href, icon: Icon }: {
  label: string; value: number; sub?: string; subTone?: 'ok' | 'warning';
  href: string; icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl border border-[#F0F0F0] p-5 hover:border-[#181725]/20 transition-colors group flex items-center gap-4">
      <div className="w-[44px] h-[44px] rounded-full bg-[#F5F5F5] flex items-center justify-center group-hover:bg-[#181725]/5">
        <Icon size={18} className="text-[#181725]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">{label}</p>
        <p className="text-[20px] font-bold text-[#181725]">{value}</p>
        {sub && (
          <p className={`text-[11px] mt-0.5 ${subTone === 'warning' ? 'text-amber-600' : 'text-[#666]'}`}>{sub}</p>
        )}
      </div>
      <ChevronRight size={16} className="text-[#AEAEAE] group-hover:text-[#181725]" />
    </Link>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">{label}</dt>
      <dd className={`text-[#181725] ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
