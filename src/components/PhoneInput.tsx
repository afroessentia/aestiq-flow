import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/u";

export const COUNTRY_CODES = [
  { code: "55", flag: "🇧🇷", label: "Brasil" },
  { code: "351", flag: "🇵🇹", label: "Portugal" },
  { code: "34", flag: "🇪🇸", label: "Espanha" },
  { code: "1", flag: "🇺🇸", label: "EUA" },
  { code: "54", flag: "🇦🇷", label: "Argentina" },
];

const DEFAULT_CC = "55";

/** Parse stored "+5511974877829" into { cc: "55", local: "11974877829" } */
export function parsePhone(stored: string | null | undefined): { cc: string; local: string } {
  const s = (stored || "").trim();
  if (!s) return { cc: DEFAULT_CC, local: "" };
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+")) {
    for (const c of COUNTRY_CODES) {
      if (digits.startsWith(c.code)) return { cc: c.code, local: digits.slice(c.code.length) };
    }
    return { cc: DEFAULT_CC, local: digits };
  }
  // Legacy: bare number with no '+'. If starts with a known CC and is long enough, split; else assume BR.
  for (const c of COUNTRY_CODES) {
    if (digits.startsWith(c.code) && digits.length > c.code.length + 7) {
      return { cc: c.code, local: digits.slice(c.code.length) };
    }
  }
  return { cc: DEFAULT_CC, local: digits };
}

/** Build "+<cc><local-digits>" for storage / wa.me. */
export function buildPhone(cc: string, local: string): string {
  const localDigits = (local || "").replace(/\D/g, "");
  if (!localDigits) return "";
  return `+${cc}${localDigits}`;
}

interface Props {
  value: string | null | undefined;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, placeholder = "11 99999-9999" }: Props) {
  const parsed = useMemo(() => parsePhone(value), [value]);
  return (
    <div className="flex gap-2">
      <Select value={parsed.cc} onValueChange={(cc) => onChange(buildPhone(cc, parsed.local))}>
        <SelectTrigger className="w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.flag} +{c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        inputMode="tel"
        placeholder={placeholder}
        value={parsed.local}
        onChange={(e) => onChange(buildPhone(parsed.cc, e.target.value))}
        className="flex-1"
      />
    </div>
  );
}
