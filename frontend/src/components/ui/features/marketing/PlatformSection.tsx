import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Globe, Smartphone, PanelsTopLeft, Apple, Play, Chrome, Copy, Volume2 } from "lucide-react";
import QRCode from "@/components/ui/common/QRCode";
import Logo from "@/components/ui/common/Logo";
import MagneticButton from "@/components/ui/common/MagneticButton";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { EASE } from "@/lib/motion";

const ctaClasses =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-[background-color,box-shadow,filter] duration-[250ms] hover:shadow-md hover:brightness-105";

export default function PlatformSection() {
  const [activeTab, setActiveTab] = useState<"web" | "app" | "extension">("web");
  const { reduceMotion, isMobile } = useMotionPrefs();
  const half = isMobile ? 0.5 : 1;
  const tabs = [
    { id: "web" as const, label: "Website" },
    { id: "app" as const, label: "Mobile App" },
    { id: "extension" as const, label: "Browser Extension" },
  ];

  const fadeItem = (y = 16, delay = 0): Variants => ({
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: y * half },
    visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.25 : 0.6 * half, delay: reduceMotion ? 0 : delay, ease: EASE } },
  });
  const iconVariant: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, rotate: -8 },
    visible: { opacity: 1, scale: 1, rotate: 0, transition: { duration: reduceMotion ? 0.2 : 0.5, ease: EASE } },
  };
  const listContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06, delayChildren: reduceMotion ? 0 : 0.15 } },
  };
  const listItem: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 * half },
    visible: { opacity: 1, x: 0, transition: { duration: reduceMotion ? 0.15 : 0.35, ease: EASE } },
  };
  const mockupInitial = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 * half, scale: 0.97 };
  const mockupAnimate = { opacity: 1, y: 0, scale: 1 };
  const mockupTransition = { duration: reduceMotion ? 0.25 : 0.5, delay: reduceMotion ? 0 : 0.15, ease: EASE };

  const [titleLocked, setTitleLocked] = useState(false);

  return (
    <section className="relative overflow-hidden px-8 md:px-16 py-24 bg-background border-t border-border">
      <div
        aria-hidden
        className="animate-bg-drift-cards pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(560px circle at center, var(--accent) 0%, transparent 60%)",
          backgroundSize: "220% 220%",
          opacity: 0.06,
        }}
      />
      <div className="relative max-w-5xl mx-auto">
        <div style={{ perspective: reduceMotion ? undefined : 1000 }} className="mb-14">
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0.4, rotateX: 15, scale: 1 }}
            whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, rotateX: 0, scale: 1.05 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: reduceMotion ? 0.3 : 0.9, ease: EASE }}
            onViewportEnter={() => !reduceMotion && setTitleLocked(true)}
            onViewportLeave={() => setTitleLocked(false)}
            style={{ transformStyle: "preserve-3d" }}
            className="text-center"
          >
            <p className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3">
              Available everywhere
            </p>
            <h2 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl leading-tight tracking-tight">
              <span className={`title-shimmer-sweep ${titleLocked ? "is-active" : ""}`}>Fluent on every</span>
              <br />
              <motion.span
                className="text-shimmer-once italic"
                animate={titleLocked && !reduceMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.5, ease: EASE }}
              >
                platform
              </motion.span>
            </h2>
            <p className="text-muted-foreground text-sm md:text-base mt-4 max-w-md mx-auto leading-relaxed">
              One account, three surfaces. Translate on the web, carry it in your pocket, or keep it a keystroke away.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeItem(16, 0.3)}
          className="flex items-center justify-center mb-12"
        >
          <div className="relative flex items-center bg-secondary rounded-full p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-5 py-2 rounded-full text-sm font-['DM_Sans'] font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="platform-tab-pill"
                    className="absolute inset-0 bg-primary rounded-full shadow-sm"
                    transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 350, damping: 32 }}
                  />
                )}
                <span className={`relative z-10 transition-colors duration-[250ms] ${activeTab === tab.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 * half, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 * half, scale: 0.985 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: EASE }}
          >
            {activeTab === "web" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <motion.div initial="hidden" animate="visible" variants={iconVariant} className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center mb-5">
                    <Globe size={20} className="text-primary-foreground" />
                  </motion.div>
                  <h3 className="font-['Playfair_Display'] font-black text-2xl md:text-3xl leading-tight tracking-tight mb-3">
                    Full power,<br />no install needed.
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
                    Access the complete Fluent suite from any browser. Type, paste, or speak — your translation history syncs across all devices when signed in.
                  </p>
                  <motion.ul initial="hidden" animate="visible" variants={listContainer} className="space-y-2.5 mb-8">
                    {["Text & voice translation", "English ↔ Khmer", "Saved translation history", "Works on any device"].map((item) => (
                      <motion.li key={item} variants={listItem} className="flex items-center gap-2.5 text-sm text-foreground/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {item}
                      </motion.li>
                    ))}
                  </motion.ul>
                  <MagneticButton magneticStrength={0.15} className={`bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent ${ctaClasses}`}>
                    Open Fluent →
                  </MagneticButton>
                </div>
                <motion.div
                  initial={mockupInitial}
                  animate={mockupAnimate}
                  transition={mockupTransition}
                  whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.25, ease: EASE } }}
                  className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden transition-shadow duration-[250ms] hover:shadow-lg"
                >
                  <div className="relative flex items-center gap-1.5 px-4 py-3 border-b border-border bg-secondary/50">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5534B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5A63B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3C9D5C]" />
                    <span className="absolute left-1/2 -translate-x-1/2 text-xs font-['DM_Mono'] text-muted-foreground/70 bg-background/60 border border-border rounded-md px-3 py-0.5">
                      fluent.app
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <Logo size="text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-secondary/40 rounded-xl p-3">
                        <p className="text-[10px] font-['DM_Mono'] tracking-wider uppercase text-muted-foreground mb-1.5">English</p>
                        <p className="text-sm leading-snug">"The world is full of wonders."</p>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-3">
                        <p className="text-[10px] font-['DM_Mono'] tracking-wider uppercase text-accent mb-1.5">Khmer</p>
                        <p className="text-sm italic text-accent leading-snug">"ពិភពលោកពោរពេញទៅដោយអច្ឆរិយភាព។"</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button className={`bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-accent ${ctaClasses}`}>
                        Translate →
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
            {activeTab === "app" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <motion.div initial="hidden" animate="visible" variants={iconVariant} className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center mb-5">
                    <Smartphone size={20} className="text-accent-foreground" />
                  </motion.div>
                  <h3 className="font-['Playfair_Display'] font-black text-2xl md:text-3xl leading-tight tracking-tight mb-3">
                    Translation in<br />your pocket.
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
                    The Fluent app brings real-time voice translation offline-ready to iOS and Android. Point your camera at text, or speak — it just works.
                  </p>
                  <motion.ul initial="hidden" animate="visible" variants={listContainer} className="space-y-2.5 mb-8">
                    {["Offline mode — no data needed", "Camera text translation", "Live voice conversation mode", "Syncs with your web account"].map((item) => (
                      <motion.li key={item} variants={listItem} className="flex items-center gap-2.5 text-sm text-foreground/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        {item}
                      </motion.li>
                    ))}
                  </motion.ul>
                  <div className="flex items-center gap-3">
                    <MagneticButton magneticStrength={0.15} className={`bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent flex items-center gap-2 ${ctaClasses}`}>
                      <Apple size={15} /> App Store
                    </MagneticButton>
                    <button className={`border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-secondary hover:-translate-y-0.5 flex items-center gap-2 ${ctaClasses}`}>
                      <Play size={13} /> Google Play
                    </button>
                  </div>
                </div>
                <motion.div
                  initial={mockupInitial}
                  animate={mockupAnimate}
                  transition={mockupTransition}
                  whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.25, ease: EASE } }}
                  className="bg-card border border-border rounded-2xl shadow-sm p-8 flex flex-col items-center text-center transition-shadow duration-[250ms] hover:shadow-lg"
                >
                  <p className="text-[10px] font-['DM_Mono'] tracking-[0.2em] uppercase text-muted-foreground mb-5">Scan to download</p>
                  <div className="bg-white p-3 rounded-xl border border-border mb-5">
                    <QRCode size={140} />
                  </div>
                  <div className="w-full border-t border-border pt-4 mt-1">
                    <p className="text-xs text-muted-foreground mb-2">iOS & Android</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3C9D5C]" />
                      Free · 4.9 ★ · 50k+ downloads
                    </p>
                  </div>
                </motion.div>
              </div>
            )}
            {activeTab === "extension" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <motion.div initial="hidden" animate="visible" variants={iconVariant} className="w-11 h-11 rounded-xl bg-[#3C6AB5] flex items-center justify-center mb-5">
                    <PanelsTopLeft size={20} className="text-white" />
                  </motion.div>
                  <h3 className="font-['Playfair_Display'] font-black text-2xl md:text-3xl leading-tight tracking-tight mb-3">
                    Translate any<br />page, instantly.
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
                    The Fluent browser extension lets you highlight any text on any webpage and get an instant translation in a clean popover — no switching tabs.
                  </p>
                  <motion.ul initial="hidden" animate="visible" variants={listContainer} className="space-y-2.5 mb-8">
                    {["Highlight-to-translate on any page", "Right-click context menu", "Popover with phonetics & examples", "Chrome, Firefox & Edge"].map((item) => (
                      <motion.li key={item} variants={listItem} className="flex items-center gap-2.5 text-sm text-foreground/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3C6AB5] flex-shrink-0" />
                        {item}
                      </motion.li>
                    ))}
                  </motion.ul>
                  <div className="flex flex-wrap items-center gap-3">
                    <MagneticButton magneticStrength={0.15} className={`bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent flex items-center gap-2 ${ctaClasses}`}>
                      <Chrome size={15} /> Add to Chrome
                    </MagneticButton>
                    <button className={`border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-secondary hover:-translate-y-0.5 ${ctaClasses}`}>
                      Firefox Add-on
                    </button>
                    <button className={`border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-secondary hover:-translate-y-0.5 ${ctaClasses}`}>
                      Edge Extension
                    </button>
                  </div>
                </div>
                <motion.div
                  initial={mockupInitial}
                  animate={mockupAnimate}
                  transition={mockupTransition}
                  className="relative"
                >
                  <motion.div
                    whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.25, ease: EASE } }}
                    className="bg-card border border-border rounded-2xl shadow-sm p-6 pb-44 transition-shadow duration-[250ms] hover:shadow-lg"
                  >
                    <p className="text-sm leading-relaxed text-foreground/90">
                      The ancient city was built at the confluence of two rivers, its{" "}
                      <mark className="bg-accent/20 text-foreground rounded px-1 py-0.5">architecture reflecting centuries</mark>{" "}
                      of cultural exchange and artistic tradition passed down through generations.
                    </p>
                  </motion.div>
                  <motion.div
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0.2 : 0.4, delay: reduceMotion ? 0 : 0.35, ease: EASE }}
                    className="absolute bottom-8 -right-4 w-[58%] bg-popover border border-border rounded-xl shadow-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-1 text-[10px] font-['DM_Mono'] tracking-wider uppercase text-accent">
                        <Globe size={11} /> Fluent
                      </span>
                      <span className="text-[10px] font-['DM_Mono'] text-muted-foreground">EN → KM</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">architecture reflecting centuries</p>
                    <p className="font-['Playfair_Display'] italic text-accent text-base mb-3">"ស្ថាបត្យកម្មឆ្លុះបញ្ចាំងសតវត្សរ៍"</p>
                    <div className="flex items-center gap-2">
                      <button className="border border-border rounded-full px-3 py-1 text-xs flex items-center gap-1 hover:bg-secondary transition-colors">
                        <Copy size={11} /> Copy
                      </button>
                      <button className="border border-border rounded-full px-3 py-1 text-xs flex items-center gap-1 hover:bg-secondary transition-colors">
                        <Volume2 size={11} /> Listen
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
