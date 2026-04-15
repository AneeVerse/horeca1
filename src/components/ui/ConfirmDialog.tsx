'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmTone = 'danger' | 'primary';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}

interface PendingPrompt {
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingPrompt | null>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve });
    });
  }, []);

  // Resolve via the functional-updater form so we always see the latest pending
  // prompt, even if multiple confirm() calls are queued in quick succession.
  const close = useCallback((result: boolean) => {
    setPending((p) => {
      p?.resolve(result);
      return null;
    });
  }, []);

  const tone: ConfirmTone = pending?.opts.tone ?? 'danger';
  const confirmBg =
    tone === 'danger'
      ? 'bg-[#E74C3C] hover:bg-[#c0392b]'
      : 'bg-[#299E60] hover:bg-[#238a54]';
  const iconBg = tone === 'danger' ? 'bg-[#FEE2E2] text-[#E74C3C]' : 'bg-[#E8F7EF] text-[#299E60]';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full max-w-[420px] rounded-[16px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-6 pb-5">
              <button
                onClick={() => close(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] text-[#AEAEAE] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <div className="flex items-start gap-4">
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shrink-0', iconBg)}>
                  <AlertTriangle size={22} />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="text-[17px] font-bold text-[#181725] leading-tight mb-1.5">
                    {pending.opts.title ?? 'Are you sure?'}
                  </h3>
                  <p className="text-[13.5px] text-[#7C7C7C] leading-relaxed">{pending.opts.message}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-[#FAFAFA] border-t border-[#EEEEEE]">
              <button
                onClick={() => close(false)}
                className="h-[40px] px-5 bg-white border border-[#EEEEEE] text-[#181725] rounded-[10px] text-[13px] font-bold hover:bg-[#F8F9FB] transition-colors"
              >
                {pending.opts.cancelText ?? 'Cancel'}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={cn('h-[40px] px-5 text-white rounded-[10px] text-[13px] font-bold transition-colors', confirmBg)}
              >
                {pending.opts.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
