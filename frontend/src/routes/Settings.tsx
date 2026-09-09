import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { UserAccount, NotificationPreferences } from "@/types";
import Logo from "@/components/ui/common/Logo";
import { LANGUAGES } from "@/lib/api/utils/constant";
import { backendOrigin } from "@/lib/api/utils/authFetch";
import { updateProfile, uploadAvatar, type UpdateProfileInput } from "@/lib/api/users";
import { createReminder, cancelReminder, listReminders, ReminderError, type ReminderItem } from "@/lib/api/reminders";

const NOTIFICATION_FIELD_MAP: Record<keyof NotificationPreferences, keyof UpdateProfileInput> = {
  exportCompleted: "notifyExportCompleted",
  translationCompleted: "notifyTranslationCompleted",
  systemUpdates: "notifySystemUpdates",
  reminders: "notifyReminders",
};

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/40 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full shrink-0 transition-colors duration-200 ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

export default function SettingsPage({
  user,
  onBack,
  onUserUpdate,
}: {
  user: UserAccount;
  onBack: () => void;
  onUserUpdate: (user: UserAccount) => void;
}) {
  const { setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  // preferredLanguage can hold a legacy/generic value (e.g. the "en" default
  // from before this UI existed) that isn't one of this app's language
  // names — fall back to the first option rather than binding <select> to a
  // value it doesn't have, which only *looks* right by browser default.
  const [language, setLanguage] = useState(LANGUAGES.includes(user.preferredLanguage) ? user.preferredLanguage : LANGUAGES[0]);
  const [theme, setThemeChoice] = useState(user.theme);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [schedulingReminder, setSchedulingReminder] = useState(false);

  useEffect(() => {
    listReminders()
      .then((res) => setReminders(res.data.filter((r) => !r.firedAt)))
      .catch(() => {})
      .finally(() => setRemindersLoading(false));
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(file);
      onUserUpdate(updated);
      toast.success("Profile picture updated");
    } catch {
      toast.error("Couldn't upload that image — try a smaller file.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ name, preferredLanguage: language, theme });
      onUserUpdate(updated);
      setTheme(theme);
      toast.success("Profile updated");
    } catch {
      toast.error("Couldn't save changes — please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleNotification = async (key: keyof NotificationPreferences, value: boolean) => {
    const previous = user.notifications;
    onUserUpdate({ ...user, notifications: { ...previous, [key]: value } });
    try {
      const updated = await updateProfile({ [NOTIFICATION_FIELD_MAP[key]]: value });
      onUserUpdate(updated);
    } catch {
      onUserUpdate({ ...user, notifications: previous });
      toast.error("Couldn't save that preference.");
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderMessage || !reminderTime) return;
    setReminderError(null);
    setSchedulingReminder(true);
    try {
      const iso = new Date(reminderTime).toISOString();
      const reminder = await createReminder(reminderMessage, iso);
      setReminders((prev) => [...prev, reminder].sort((a, b) => a.remindAt.localeCompare(b.remindAt)));
      setReminderMessage("");
      setReminderTime("");
      toast.success("Reminder scheduled");
    } catch (err) {
      setReminderError(err instanceof ReminderError ? err.message : "Couldn't schedule the reminder.");
    } finally {
      setSchedulingReminder(false);
    }
  };

  const handleCancelReminder = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await cancelReminder(id).catch(() => {});
  };

  const avatarSrc = user.avatarUrl ? `${backendOrigin()}${user.avatarUrl}` : null;
  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div className="min-h-screen bg-background text-foreground font-['DM_Sans']">
      <nav className="flex items-center justify-between px-8 md:px-16 py-5 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-40">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} />
          Back
        </button>
        <Logo size="text-lg" />
        <div className="w-8" />
      </nav>

      <div className="max-w-2xl mx-auto px-6 md:px-12 py-14">
        <div className="mb-10">
          <p className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3">Your account</p>
          <h1 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl leading-[1.05] mb-3">
            Settings
          </h1>
        </div>

        {/* Profile */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 mb-8">
          <p className="font-['Playfair_Display'] font-bold text-base text-foreground mb-6">Profile</p>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-['DM_Mono'] font-medium overflow-hidden">
                {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : initials}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Change profile picture"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/80 transition-colors disabled:opacity-50"
              >
                <Camera size={12} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <p className="text-xs text-muted-foreground">
              {uploadingAvatar ? "Uploading…" : "JPG, PNG, or GIF. Up to 5MB."}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-['DM_Mono'] tracking-[0.12em] uppercase text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-['DM_Mono'] tracking-[0.12em] uppercase text-muted-foreground">Email</label>
              <p className="text-sm text-muted-foreground py-2.5">{user.email}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-['DM_Mono'] tracking-[0.12em] uppercase text-muted-foreground">
                Language preference
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground/70">Used as the default "speaking" language in Live Translate.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-['DM_Mono'] tracking-[0.12em] uppercase text-muted-foreground">Theme</label>
              <div className="flex items-center gap-1 rounded-full border border-border p-1 w-fit">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setThemeChoice(t)}
                    className={`px-4 py-1.5 rounded-full text-xs font-['DM_Mono'] tracking-wide capitalize transition-colors ${
                      theme === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="mt-6 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent disabled:opacity-50 transition-colors duration-200"
          >
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </section>

        {/* Notification settings */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 mb-8">
          <p className="font-['Playfair_Display'] font-bold text-base text-foreground mb-2">Notification settings</p>
          <p className="text-xs text-muted-foreground mb-2">Choose which notifications you want to receive.</p>
          <div>
            <ToggleRow
              label="Export completed"
              description="When a PDF/DOCX/TXT export finishes generating."
              checked={user.notifications.exportCompleted}
              onChange={(v) => toggleNotification("exportCompleted", v)}
            />
            <ToggleRow
              label="Translation completed"
              description="When a live translation session ends."
              checked={user.notifications.translationCompleted}
              onChange={(v) => toggleNotification("translationCompleted", v)}
            />
            <ToggleRow
              label="Reminders"
              description="Scheduled reminders you set below."
              checked={user.notifications.reminders}
              onChange={(v) => toggleNotification("reminders", v)}
            />
            <ToggleRow
              label="System updates"
              description="Announcements from the Fluent team."
              checked={user.notifications.systemUpdates}
              onChange={(v) => toggleNotification("systemUpdates", v)}
            />
          </div>
        </section>

        {/* Reminders */}
        <section className="rounded-3xl border border-border/60 bg-card p-6">
          <p className="font-['Playfair_Display'] font-bold text-base text-foreground mb-2">Reminders</p>
          <p className="text-xs text-muted-foreground mb-5">Schedule a notification for a future time.</p>

          <form onSubmit={handleCreateReminder} className="flex flex-col sm:flex-row gap-3 mb-5">
            <input
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              placeholder="Remind me to…"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
            />
            <input
              type="datetime-local"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={schedulingReminder || !reminderMessage || !reminderTime}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent disabled:opacity-50 transition-colors duration-200 whitespace-nowrap"
            >
              Schedule
            </button>
          </form>
          {reminderError && (
            <p className="text-sm text-destructive mb-4" role="alert">{reminderError}</p>
          )}

          {remindersLoading ? (
            <p className="text-sm text-muted-foreground">Loading reminders…</p>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming reminders.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {reminders.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 bg-secondary/40 border border-border/50 rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{r.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.remindAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleCancelReminder(r.id)}
                    aria-label="Cancel reminder"
                    className="p-1.5 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
