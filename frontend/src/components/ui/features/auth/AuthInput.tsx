import { useState } from "react";
import { EyeOff, Eye } from "lucide-react";

export default function AuthInput({
  label,
  type,
  placeholder,
  value,
  onChange,
  hint,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-['DM_Mono'] tracking-[0.12em] uppercase text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-['DM_Sans'] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-accent transition-colors duration-200 pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground/60 font-['DM_Sans']">{hint}</p>}
    </div>
  );
}