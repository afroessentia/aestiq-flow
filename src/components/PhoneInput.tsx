import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/u";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { COUNTRIES, DEFAULT_CC } from "@/lib/countries";

export function parsePhone(stored: string | null | undefined): { cc: string; local: string } {
  const s = (stored || "").trim();
  if (!s) return { cc: DEFAULT_CC, local: "" };
  const digits = s.replace(/\D/g, "");
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  if (s.startsWith("+")) {
    for (const c of sorted) {
      if (digits.startsWith(c.code)) return { cc: c.code, local: digits.slice(c.code.length) };
    }
    return { cc: DEFAULT_CC, local: digits };
  }
  for (const c of sorted) {
    if (digits.startsWith(c.code) && digits.length > c.code.length + 7) {
      return { cc: c.code, local: digits.slice(c.code.length) };
    }
  }
  return { cc: DEFAULT_CC, local: digits };
}

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
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find((c) => c.code === parsed.cc) ?? COUNTRIES.find((c) => c.code === DEFAULT_CC)!;

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-12 inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground min-w-[110px]"
            aria-label="Selecionar país"
          >
            <span className="text-base leading-none">{selected.flag}</span>
            <span>+{selected.code}</span>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 ml-auto" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 pointer-events-auto" align="start">
          <Command
            filter={(val, search) => {
              const q = search.toLowerCase();
              return val.toLowerCase().includes(q) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Buscar país ou código..." />
            <CommandList>
              <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((c) => {
                  const val = `${c.name} ${c.code} ${c.iso}`;
                  return (
                    <CommandItem
                      key={c.iso}
                      value={val}
                      onSelect={() => {
                        onChange(buildPhone(c.code, parsed.local));
                        setOpen(false);
                      }}
                    >
                      <span className="mr-2">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-muted-foreground text-xs">+{c.code}</span>
                      <Check className={cn("ml-2 w-4 h-4", parsed.cc === c.code ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
