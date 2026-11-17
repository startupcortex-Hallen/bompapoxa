import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  label?: string;
  hint?: string;
  error?: string | null;
  obrigatorio?: boolean;
};

export function Field({
  label,
  hint,
  error,
  obrigatorio,
  htmlFor,
  children,
  className,
}: BaseProps & { htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-xs font-medium text-muted-foreground">
          {label}
          {obrigatorio ? <span className="ml-1 text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Input({
  label,
  hint,
  error,
  obrigatorio,
  className,
  id,
  ...props
}: ComponentProps<"input"> & BaseProps) {
  const gerado = useId();
  const inputId = id ?? gerado;
  return (
    <Field label={label} hint={hint} error={error} obrigatorio={obrigatorio} htmlFor={inputId}>
      <input
        id={inputId}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60",
          error && "border-danger focus:border-danger focus:ring-danger/15",
          className,
        )}
        {...props}
      />
    </Field>
  );
}

export function Textarea({
  label,
  hint,
  error,
  obrigatorio,
  className,
  id,
  ...props
}: ComponentProps<"textarea"> & BaseProps) {
  const gerado = useId();
  const inputId = id ?? gerado;
  return (
    <Field label={label} hint={hint} error={error} obrigatorio={obrigatorio} htmlFor={inputId}>
      <textarea
        id={inputId}
        className={cn(
          "min-h-24 w-full rounded-lg border border-input bg-card px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
          error && "border-danger focus:border-danger focus:ring-danger/15",
          className,
        )}
        {...props}
      />
    </Field>
  );
}

export function Select({
  label,
  hint,
  error,
  obrigatorio,
  className,
  id,
  children,
  ...props
}: ComponentProps<"select"> & BaseProps) {
  const gerado = useId();
  const inputId = id ?? gerado;
  return (
    <Field label={label} hint={hint} error={error} obrigatorio={obrigatorio} htmlFor={inputId}>
      <select
        id={inputId}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
        checked ? "border-primary bg-primary" : "border-border bg-secondary",
      )}
    >
      <span
        className={cn(
          "inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}
