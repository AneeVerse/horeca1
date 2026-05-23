'use client';

/**
 * BecomeVendorModal — lets a customer apply to also become a vendor on their
 * existing BusinessAccount. Submits to POST /api/v1/account/[id]/become-vendor
 * which flips the isVendor flag, creates the Vendor row (pending approval),
 * and grants the Vendor Admin role.
 *
 * After submit, the existing VendorApplicationBanner takes over and shows the
 * pending → approved status on the homepage automatically.
 */

import { useState } from 'react';
import { X, Store, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface BecomeVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBusinessName?: string;
  defaultGstNumber?: string;
  onSubmitted?: () => void;
}

export function BecomeVendorModal({
  isOpen, onClose, defaultBusinessName = '', defaultGstNumber = '', onSubmitted,
}: BecomeVendorModalProps) {
  const { data: session, update: updateSession } = useSession();
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [description, setDescription] = useState('');
  const [gstNumber, setGstNumber] = useState(defaultGstNumber);
  const [minOrderValue, setMinOrderValue] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeAccountId = (session?.user as { activeBusinessAccountId?: string } | undefined)?.activeBusinessAccountId;

  const handleSubmit = async () => {
    if (!activeAccountId) {
      setError('No active business account. Please pick an account from the navbar switcher first.');
      return;
    }
    if (!businessName.trim() || businessName.trim().length < 2) {
      setError('Business name is required (at least 2 characters)');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/account/${activeAccountId}/become-vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          description: description.trim() || undefined,
          gstNumber: gstNumber.trim() || undefined,
          minOrderValue: minOrderValue ? Number(minOrderValue) : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? 'Could not submit application');
        setSubmitting(false);
        return;
      }
      // Refresh the JWT so session.user.role flips from 'customer' to 'vendor'
      // and activeBusinessAccountType.isVendor becomes true. Passing an explicit
      // argument (instead of a bare update()) forces NextAuth to re-fire the jwt
      // callback with trigger==='update' — a bare update() is sometimes a no-op
      // when the session hasn't visibly changed yet from the client's POV.
      await updateSession({ refresh: Date.now() });

      // Toast BEFORE navigation so the user sees confirmation, then we do a full
      // page navigation (not router.push) so the browser actually re-reads the
      // freshly-rotated session cookie and the vendor portal gates re-evaluate.
      toast.success('Vendor application submitted — admin will review shortly.');
      onSubmitted?.();
      onClose();
      window.location.assign('/vendor/dashboard');
    } catch {
      setError('Network error — try again');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[14000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header with brand-style icon */}
        <div className="p-5 border-b border-gray-100 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shrink-0">
            <Store size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-[#181725] flex items-center gap-1.5">
              Become a vendor
              <Sparkles size={14} className="text-amber-500" />
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Start selling to other Horeca1 customers using your existing account.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          <Field
            label="Business name"
            required
            value={businessName}
            onChange={setBusinessName}
            placeholder="e.g. Dairy Direct Wholesale"
          />
          <Field
            label="Short description"
            value={description}
            onChange={setDescription}
            placeholder="What do you sell? (one line)"
            multiline
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="GST number (optional)"
              value={gstNumber}
              onChange={setGstNumber}
              placeholder="22AAAAA0000A1Z5"
            />
            <Field
              label="Minimum order value (₹)"
              value={minOrderValue}
              onChange={(v) => setMinOrderValue(v.replace(/[^0-9]/g, ''))}
              placeholder="0"
              inputMode="numeric"
            />
          </div>

          {/* What happens next */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 mt-2">
            <p className="text-[12px] font-bold text-emerald-900 mb-1">What happens after you submit</p>
            <ol className="text-[11.5px] text-emerald-900/80 space-y-1 list-decimal list-inside">
              <li>You stay logged in to the same account.</li>
              <li>Admin reviews your application (usually within 24 hours).</li>
              <li>Once approved, the <strong>Vendor</strong> portal becomes available in the navbar.</li>
              <li>You can keep buying as a customer the whole time.</li>
            </ol>
          </div>

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-[13px] font-semibold text-[#666] hover:bg-gray-50 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !businessName.trim()}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[13px] font-bold rounded-xl hover:shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required, multiline, inputMode }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
}) {
  const cls = 'w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all placeholder:text-gray-400 text-gray-700';
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold text-[#181725] mb-1 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={cls}
        />
      ) : (
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </label>
  );
}
