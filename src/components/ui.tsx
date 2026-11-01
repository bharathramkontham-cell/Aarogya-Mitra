// Small design-system building blocks. Buttons are at least 44px tall
// (touch-target minimum), and every interactive element shows a visible
// keyboard focus ring.

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-2',
  secondary: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'sm' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizing = size === 'sm' ? 'min-h-[44px] px-3 text-sm' : 'min-h-[44px] px-4 text-base';
  return (
    <button className={`${base} ${variants[variant]} ${sizing} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm p-4 ${className}`}>{children}</div>;
}

const badgeTones: Record<string, string> = {
  blue: 'bg-primary-50 text-primary-800 border-primary-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-100',
  green: 'bg-success-50 text-success-700 border-success-100',
  amber: 'bg-warn-50 text-warn-600 border-warn-100',
  red: 'bg-danger-50 text-danger-700 border-danger-100',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  const className = badgeTones[tone] ?? badgeTones.slate;
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function StateMessage({ kind, title, children }: { kind: 'success' | 'error' | 'info' | 'warning'; title: string; children?: ReactNode }) {
  const tones = {
    success: 'border-success-100 bg-success-50 text-success-700',
    error: 'border-danger-100 bg-danger-50 text-danger-700',
    info: 'border-primary-100 bg-primary-50 text-primary-800',
    warning: 'border-warn-100 bg-warn-50 text-warn-600',
  };
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${tones[kind]}`}>
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-slate-700">{children}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-8 text-center">
      <p className="text-base font-semibold text-slate-700">{title}</p>
      <p className="max-w-md text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}{' '}
        {required ? (
          <span className="text-danger-600">(required)</span>
        ) : optional ? (
          <span className="font-normal text-slate-400">(optional)</span>
        ) : null}
      </label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {children}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-primary-600 min-h-[44px]';

export function SafetyNote({ text = 'Do not guess. Check the prescription label and contact your pharmacist or prescriber if instructions are unclear.' }: { text?: string }) {
  return (
    <div role="alert" className="rounded-lg border border-warn-100 bg-warn-50 p-3 text-sm text-warn-600">
      ⚠️ {text}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
        <h2 id="confirm-title" className="text-lg font-bold text-slate-800">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
