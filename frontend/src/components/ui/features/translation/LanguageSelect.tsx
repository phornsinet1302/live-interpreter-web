import { ChevronDown } from "lucide-react";
import { LANGUAGES } from "../../../../lib/api/utils/constant";

export default function LanguageSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none bg-transparent font-['DM_Sans'] font-medium text-foreground text-sm pr-6 pl-0 py-1 border-none outline-none cursor-pointer disabled:opacity-50"
      >
        {LANGUAGES.map((lang) => (
          // The closed <select> is intentionally bg-transparent so it blends
          // into the page, but its open dropdown is a separate native popup
          // that doesn't inherit that — without an explicit background here
          // each <option> render text-foreground (near-white in dark mode)
          // on the browser's default white popup, which is unreadable.
          <option key={lang} value={lang} className="bg-background text-foreground">
            {lang}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}