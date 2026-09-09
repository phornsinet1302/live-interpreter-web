import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Languages, ListChecks, MessagesSquare, Percent, RotateCcw, Settings } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { UserAccount } from "@/types";
import Logo from "@/components/ui/common/Logo";
import { backendOrigin } from "@/lib/api/utils/authFetch";
import {
  getDashboardStats,
  getHistoryUsage,
  getLanguageStats,
  getSummaryUsage,
  getTranslationStats,
  type DashboardStats,
  type HistoryUsageStats,
  type LanguageStats,
  type SummaryUsageStats,
  type TranslationStats,
} from "@/lib/api/analytics";

// Single sequential hue for every chart here — both are magnitude
// comparisons (volume over time, ranked language pairs), not identity
// comparisons, so one hue is the correct (and simplest) choice; see the
// dataviz skill's "choosing a form" guidance.
const CHART_COLOR = "#C85A3A";

type Period = "day" | "week" | "month";

function formatCount(n: number): string {
  return n >= 1000 ? Intl.NumberFormat("en", { notation: "compact" }).format(n) : n.toLocaleString();
}

function formatPeriodLabel(key: string, period: Period): string {
  if (period === "day") {
    const d = new Date(`${key}T00:00:00Z`);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (period === "month") {
    const [year, month] = key.split("-");
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  // "2026-W37" — weeks don't map to a single Date cleanly, so just tidy the label.
  return key.replace("-W", " · W");
}

function StatTile({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col gap-3 min-w-0">
      <div className="w-8 h-8 rounded-full bg-accent/12 flex items-center justify-center text-accent flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-['DM_Sans'] font-semibold text-foreground leading-tight truncate">{value}</p>
        <p className="text-[11px] font-['DM_Mono'] tracking-[0.12em] uppercase text-muted-foreground mt-1">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground/80 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs font-['DM_Sans']">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="text-foreground font-semibold">{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

export default function DashboardPage({
  user,
  onBack,
  onSettings,
}: {
  user: UserAccount;
  onBack: () => void;
  onSettings: () => void;
}) {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [translations, setTranslations] = useState<TranslationStats | null>(null);
  const [languages, setLanguages] = useState<LanguageStats | null>(null);
  const [summaryUsage, setSummaryUsage] = useState<SummaryUsageStats | null>(null);
  const [historyUsage, setHistoryUsage] = useState<HistoryUsageStats | null>(null);
  const [period, setPeriod] = useState<Period>("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [d, t, l, s, h] = await Promise.all([
          getDashboardStats(),
          getTranslationStats(),
          getLanguageStats(),
          getSummaryUsage(),
          getHistoryUsage(),
        ]);
        if (cancelled) return;
        setDashboard(d);
        setTranslations(t);
        setLanguages(l);
        setSummaryUsage(s);
        setHistoryUsage(h);
      } catch {
        if (!cancelled) setError("Couldn't load your analytics — please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const volumeData = useMemo(() => {
    if (!translations) return [];
    const source = period === "day" ? translations.byDay : period === "week" ? translations.byWeek : translations.byMonth;
    const keyField = period === "day" ? "day" : period === "week" ? "week" : "month";
    return source.map((row) => ({
      key: formatPeriodLabel((row as Record<string, string | number>)[keyField] as string, period),
      count: row.count,
    }));
  }, [translations, period]);

  const languageData = useMemo(() => {
    if (!languages) return [];
    return languages.pairs
      .slice(0, 8)
      .map((p) => ({ pair: `${p.sourceLanguage} → ${p.targetLanguage}`, count: p.count }));
  }, [languages]);

  const hasAnyData = (dashboard?.totalConversations ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-['DM_Sans']">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <nav className="flex items-center justify-between px-8 md:px-16 py-5 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-40">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} />
          Back
        </button>
        <Logo size="text-lg" />
        <div className="flex items-center gap-4">
          <button onClick={onSettings} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Settings size={15} />
            Settings
          </button>
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-['DM_Mono'] overflow-hidden">
            {user.avatarUrl ? (
              <img src={`${backendOrigin()}${user.avatarUrl}`} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-14">
        <div className="mb-10" style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
          <p className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3">Your usage</p>
          <h1 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl leading-[1.05] mb-3">
            Analytics<br /><em className="italic">dashboard</em>
          </h1>
          <p className="text-muted-foreground text-sm">
            How much you've translated, which languages you use most, and how AI features factor in.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-16 justify-center">
            <span className="flex items-center gap-1">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </span>
            Loading your analytics…
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-destructive" role="alert">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              <RotateCcw size={13} /> Try again
            </button>
          </div>
        )}

        {!loading && !error && !hasAnyData && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <MessagesSquare size={22} className="text-muted-foreground" />
            </div>
            <p className="font-['Playfair_Display'] font-bold text-xl mb-2">No data yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Finish a live translation session and sign in to save it — your stats will show up here.
            </p>
          </div>
        )}

        {!loading && !error && hasAnyData && dashboard && summaryUsage && historyUsage && (
          <>
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
              style={{ animation: "fadeSlideUp 0.35s ease-out" }}
            >
              <StatTile
                icon={<MessagesSquare size={15} />}
                label="Total translations"
                value={formatCount(dashboard.totalMessages)}
              />
              <StatTile
                icon={<Percent size={15} />}
                label="Avg. translation accuracy"
                value={dashboard.averageConfidence != null ? `${Math.round(dashboard.averageConfidence * 100)}%` : "—"}
                sublabel="Model-reported confidence"
              />
              <StatTile
                icon={<ListChecks size={15} />}
                label="AI summaries used"
                value={`${summaryUsage.conversationsSummarized}/${summaryUsage.totalConversations}`}
                sublabel="Conversations summarized"
              />
              <StatTile
                icon={<Languages size={15} />}
                label="Saved sessions"
                value={String(historyUsage.totalConversations)}
                sublabel={`${historyUsage.endedConversations} completed`}
              />
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-6 mb-8" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <p className="font-['Playfair_Display'] font-bold text-base text-foreground">Translation volume</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sentences translated over time</p>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-border p-1">
                  {(["day", "week", "month"] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-['DM_Mono'] tracking-wide capitalize transition-colors ${
                        period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p}ly
                    </button>
                  ))}
                </div>
              </div>
              {volumeData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No translations in this range yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={volumeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(28,22,18,0.08)" />
                    <XAxis
                      dataKey="key"
                      tick={{ fontSize: 11, fill: "#7A6F62" }}
                      axisLine={{ stroke: "rgba(28,22,18,0.12)" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#7A6F62" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(28,22,18,0.04)" }} />
                    <Bar dataKey="count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-6" style={{ animation: "fadeSlideUp 0.45s ease-out" }}>
              <p className="font-['Playfair_Display'] font-bold text-base text-foreground mb-0.5">Most translated languages</p>
              <p className="text-xs text-muted-foreground mb-6">Source → target pairs, ranked by sentences translated</p>
              {languageData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No language data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, languageData.length * 44)}>
                  <BarChart
                    data={languageData}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid horizontal={false} stroke="rgba(28,22,18,0.08)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#7A6F62" }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="pair"
                      width={150}
                      tick={{ fontSize: 12, fill: "#1C1612" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(28,22,18,0.04)" }} />
                    <Bar dataKey="count" fill={CHART_COLOR} radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
