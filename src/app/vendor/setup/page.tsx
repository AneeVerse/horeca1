'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft, Store, Truck, Package, Users, Rocket, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/ui/ImageUpload';

const STEPS = [
  { id: 1, title: 'Welcome', subtitle: 'Your store is approved and ready to set up', icon: Sparkles },
  { id: 2, title: 'Store Profile', subtitle: 'Add your logo, banner and description', icon: Store },
  { id: 3, title: 'Delivery Setup', subtitle: 'Configure your delivery days and time slots', icon: Truck },
  { id: 4, title: 'Add Products', subtitle: 'Upload your first products to go live', icon: Package },
  { id: 5, title: 'Invite Team', subtitle: 'Add staff members to help manage your store', icon: Users },
  { id: 6, title: 'Go Live!', subtitle: "You're all set — open your store to buyers", icon: Rocket },
];

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [vendorName, setVendorName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('vendor_setup_completed')) {
      router.replace('/vendor/dashboard');
    }
    // Fetch vendor name
    fetch('/api/v1/vendor/settings').then(r => r.json()).then(j => {
      if (j.success) setVendorName(j.data.businessName || '');
    }).catch(() => {});
  }, [router]);

  const saveProfile = async () => {
    if (!logoUrl && !bannerUrl && !description) return;
    setSaving(true);
    try {
      await fetch('/api/v1/vendor/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: logoUrl || undefined, bannerUrl: bannerUrl || undefined, description: description || undefined }),
      });
    } catch { /* fire and forget */ } finally { setSaving(false); }
  };

  const complete = () => {
    if (typeof window !== 'undefined') localStorage.setItem('vendor_setup_completed', '1');
    router.push('/vendor/dashboard');
  };

  const next = async () => {
    if (step === 2) await saveProfile();
    if (step === 6) { complete(); return; }
    setStep(s => Math.min(6, s + 1));
  };

  const back = () => setStep(s => Math.max(1, s - 1));

  const skip = () => {
    if (step === 6) { complete(); return; }
    setStep(s => Math.min(6, s + 1));
  };

  const progress = ((step - 1) / 5) * 100;

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-start py-10 px-4">
      {/* Logo */}
      <div className="mb-8">
        <span className="text-[22px] font-extrabold text-[#299E60]">Horeca1</span>
        <span className="text-[14px] text-[#7C7C7C] ml-2">Vendor Setup</span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl mb-8">
        {/* Step dots with connecting line */}
        <div className="relative flex items-center justify-between">
          {/* Background track */}
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-[#EEEEEE]" />
          {/* Filled track */}
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 h-0.5 bg-[#299E60] transition-all duration-500"
            style={{ width: `calc(${progress}% - 2rem)` }}
          />
          {/* Dots */}
          {STEPS.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-1.5">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-all bg-[#F8F9FB]',
                s.id < step ? 'bg-[#299E60] border-[#299E60] text-white' :
                s.id === step ? 'bg-white border-[#299E60] text-[#299E60]' :
                'bg-[#F8F9FB] border-[#EEEEEE] text-[#AEAEAE]'
              )}>
                {s.id < step ? <CheckCircle2 size={14} /> : s.id}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-[#AEAEAE] text-center mt-3">Step {step} of {STEPS.length}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-[20px] border border-[#EEEEEE] shadow-sm p-8">
        {/* Step icon + title */}
        <div className="flex flex-col items-center text-center mb-8">
          {(() => { const Icon = STEPS[step - 1].icon; return <div className="w-16 h-16 rounded-full bg-[#EEF8F1] flex items-center justify-center mb-4"><Icon size={28} className="text-[#299E60]" /></div>; })()}
          <h1 className="text-[24px] font-extrabold text-[#181725]">{STEPS[step - 1].title}</h1>
          <p className="text-[14px] text-[#7C7C7C] mt-1">{STEPS[step - 1].subtitle}</p>
        </div>

        {/* Step content */}
        {step === 1 && (
          <div className="text-center">
            <p className="text-[16px] text-[#181725] mb-2">Welcome{vendorName ? `, ${vendorName}` : ''}! 🎉</p>
            <p className="text-[14px] text-[#7C7C7C] leading-relaxed">
              Your vendor account has been approved. Let&apos;s set up your store in a few quick steps so buyers can start finding and ordering from you.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {['Upload your logo & banner', 'Configure delivery slots', 'Add your first products', 'Invite your team'].map(item => (
                <div key={item} className="flex items-center gap-2 bg-[#F8F9FB] rounded-[10px] p-3 text-left">
                  <CheckCircle2 size={16} className="text-[#299E60] shrink-0" />
                  <span className="text-[13px] text-[#181725]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Store Logo</label>
              <ImageUpload value={logoUrl} onChange={setLogoUrl} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Store Banner</label>
              <ImageUpload value={bannerUrl} onChange={setBannerUrl} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Store Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Tell buyers what you sell and what makes your store special..."
                className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-3 text-[14px] outline-none focus:border-[#299E60]/40 transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <p className="text-[14px] text-[#7C7C7C] mb-6">Set up the days and time slots when you can accept and deliver orders.</p>
            <a href="/vendor/settings#delivery" target="_blank" className="inline-flex items-center gap-2 bg-[#299E60] text-white px-6 py-3 rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-colors">
              Configure Delivery Slots <ChevronRight size={16} />
            </a>
            <p className="text-[12px] text-[#AEAEAE] mt-3">Opens in Settings — come back here when done</p>
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <p className="text-[14px] text-[#7C7C7C] mb-6">Add products to your catalog so buyers can browse and order from you.</p>
            <div className="flex gap-3 justify-center">
              <a href="/vendor/products" target="_blank" className="inline-flex items-center gap-2 bg-[#299E60] text-white px-6 py-3 rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-colors">
                Add Products <ChevronRight size={16} />
              </a>
              <a href="/vendor/bulk-upload" target="_blank" className="inline-flex items-center gap-2 border border-[#299E60] text-[#299E60] px-6 py-3 rounded-[12px] text-[14px] font-bold hover:bg-[#EEF8F1] transition-colors">
                Bulk Upload
              </a>
            </div>
            <p className="text-[12px] text-[#AEAEAE] mt-3">You can also add products later from the sidebar</p>
          </div>
        )}

        {step === 5 && (
          <div className="text-center">
            <p className="text-[14px] text-[#7C7C7C] mb-6">Add staff members to help you manage orders, inventory, and customers.</p>
            <a href="/vendor/team" target="_blank" className="inline-flex items-center gap-2 bg-[#299E60] text-white px-6 py-3 rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-colors">
              Invite Team Members <ChevronRight size={16} />
            </a>
            <p className="text-[12px] text-[#AEAEAE] mt-3">You can always add more team members later</p>
          </div>
        )}

        {step === 6 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-[#EEF8F1] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-[#299E60]" />
            </div>
            <p className="text-[16px] font-bold text-[#181725] mb-2">Your store is ready! 🚀</p>
            <p className="text-[14px] text-[#7C7C7C] leading-relaxed mb-6">
              Your store is now live on Horeca1. Buyers in your service area can find and order from you.
            </p>
            <button onClick={complete} className="inline-flex items-center gap-2 bg-[#299E60] text-white px-8 py-3 rounded-[12px] text-[15px] font-bold hover:bg-[#238a54] transition-colors shadow-md">
              Go to My Dashboard <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#F5F5F5]">
          <button
            onClick={back}
            disabled={step === 1}
            className={cn('flex items-center gap-1.5 text-[14px] font-bold text-[#7C7C7C] hover:text-[#181725] transition-colors', step === 1 && 'invisible')}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="flex items-center gap-3">
            {step > 2 && step < 6 && (
              <button onClick={skip} className="text-[13px] text-[#AEAEAE] hover:text-[#7C7C7C] transition-colors">
                Skip this step
              </button>
            )}
            {step < 6 && (
              <button
                onClick={next}
                disabled={saving}
                className="flex items-center gap-2 bg-[#299E60] text-white px-6 py-2.5 rounded-[10px] text-[14px] font-bold hover:bg-[#238a54] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Continue'} <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
