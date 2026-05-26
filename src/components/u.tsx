import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type LabelHTMLAttributes } from "react";

type BtnVariant = "primary" | "secondary" | "ghost" | "accent" | "dark" | "outline";
type BtnSize = "md" | "lg" | "sm";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; full?: boolean }>(
  ({ variant = "primary", size = "lg", full, className = "", ...p }, ref) => {
    const v: Record<BtnVariant, string> = {
      primary: "bg-primary text-primary-foreground active:bg-primary/90",
      secondary: "bg-surface text-dark active:bg-surface/80",
      ghost: "bg-transparent text-foreground active:bg-surface",
      accent: "bg-accent text-accent-foreground active:bg-accent/90",
      dark: "bg-dark text-primary-foreground active:bg-dark/90",
      outline: "border border-border bg-background text-foreground active:bg-surface",
    };
    const s: Record<BtnSize, string> = {
      sm: "h-10 px-3 text-sm",
      md: "h-11 px-4 text-sm",
      lg: "h-14 px-5 text-base",
    };
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${v[variant]} ${s[size]} ${full ? "w-full" : ""} ${className}`}
        {...p}
      />
    );
  }
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...p }, ref) => (
    <input
      ref={ref}
      className={`h-12 w-full rounded-lg border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary ${className}`}
      {...p}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...p }, ref) => (
    <textarea
      ref={ref}
      className={`w-full min-h-[96px] rounded-lg border border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary ${className}`}
      {...p}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({ className = "", ...p }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`block text-sm font-medium text-foreground mb-1.5 ${className}`} {...p} />;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-card border border-border p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3 mt-1">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
