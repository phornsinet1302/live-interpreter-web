import { useCallback, useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform, type Variants } from "framer-motion";
import { ArrowLeftRight, Mic, Volume2, Copy, Check, BrainCircuit, Gauge, Languages } from "lucide-react";
import Navbar from "@/components/ui/layout/Navbar";
import Footer from "@/components/ui/layout/Footer";
import PlatformSection from "@/components/ui/features/marketing/PlatformSection";
import FeatureCard from "@/components/ui/features/marketing/FeatureCard";
import LanguageSelect from "@/components/ui/features/translation/LanguageSelect";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import BotanicalRight from "@/components/ui/common/BotanicalRight";
import MagneticButton from "@/components/ui/common/MagneticButton";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { EASE, fadeUp, revealVariants } from "@/lib/motion";
import { UserAccount } from "@/types";

const headlineLines = ["Translate the", "World, One", "Word at a Time"];

export default function AboutPage({
  user,
  onLive,
  onSignIn,
  onSignUp,
  onHistory,
  onProfile,
  onSignOut,
}: {
  user: UserAccount | null;
  onLive: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onHistory: () => void;
  onProfile: () => void;
  onSignOut: () => void;
}) {
  const [sourceLang, setSourceLang] = useState("English");
  const [targetLang, setTargetLang] = useState("Khmer");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const { reduceMotion, richMotionEnabled, isMobile } = useMotionPrefs();

  const heroRef = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20, mass: 0.5 });
  const bgX = useTransform(springX, [-1, 1], [-10, 10]);
  const bgY = useTransform(springY, [-1, 1], [-10, 10]);
  const plantsX = useTransform(springX, [-1, 1], [-15, 15]);
  const plantsY = useTransform(springY, [-1, 1], [-15, 15]);
  const headlineX = useTransform(springX, [-1, 1], [-5, 5]);
  const headlineY = useTransform(springY, [-1, 1], [-5, 5]);

  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glowSpringX = useSpring(glowX, { stiffness: 150, damping: 22 });
  const glowSpringY = useSpring(glowY, { stiffness: 150, damping: 22 });
  const [glowVisible, setGlowVisible] = useState(false);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!richMotionEnabled || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    mouseX.set(relX * 2 - 1);
    mouseY.set(relY * 2 - 1);
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
  };

  const whyRef = useRef<HTMLElement>(null);
  const { scrollYProgress: whyScrollProgress } = useScroll({ target: whyRef, offset: ["start end", "end start"] });
  const cardsScrollY = useTransform(whyScrollProgress, [0, 1], richMotionEnabled ? [40, -40] : [0, 0]);

  const handleSourceChange = (text: string) => {
    if (text.length <= 5000) {
      setSourceText(text);
      setCharCount(text.length);
      setTranslatedText("");
    }
  };

  const handleSwap = () => {
    const tmp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tmp);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
    setCharCount(translatedText.length);
  };

  const handleTranslate = useCallback(() => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setTimeout(() => {
      const samples: Record<string, string> = {
        Khmer: "សួស្តី សូមស្វាគមន៍មកកាន់ពិភពនៃលទ្ធភាពគ្មានដែនកំណត់។ ការបកប្រែភ្ជាប់វប្បធម៌ និងបើកទ្វារទៅរកទស្សនវិស័យថ្មីៗ។",
      };
      setTranslatedText(samples[targetLang] || `[${targetLang} translation of your text would appear here. Connect to a translation API to enable live translations.]`);
      setIsTranslating(false);
    }, 1100);
  }, [sourceText, targetLang]);

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const headlineContainer = {
    hidden: { opacity: 0, scale: reduceMotion ? 1 : 0.97 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: reduceMotion ? 0.25 : 0.8, ease: EASE, staggerChildren: reduceMotion ? 0 : 0.08, delayChildren: 0.05 },
    },
  };
  const lineVariant = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.2 : 0.5, ease: EASE } },
  };

  const half = isMobile ? 0.5 : 1;
  const sectionOrchestrator: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.25 * half } },
  };
  const labelVariant: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 * half, letterSpacing: "0.35em" },
    visible: { opacity: 1, y: 0, letterSpacing: "0.2em", transition: { duration: reduceMotion ? 0.25 : 0.7 * half, ease: EASE } },
  };
  const headingContainerVariant: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.15 * half } },
  };
  const headingPartVariant: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 25 * half, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: reduceMotion ? 0.25 : 0.8 * half, ease: EASE } },
  };
  const cardsContainerVariant: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: reduceMotion ? 0 : 0.4 * half, staggerChildren: reduceMotion ? 0 : 0.12 * half } },
  };
  const cardVariant: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 * half, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: reduceMotion ? 0.3 : 0.7 * half, ease: EASE } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-['DM_Sans'] overflow-x-hidden">
      <style>{`
        @keyframes floatPlant {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }
        .animate-float-plant-left { animation: floatPlant 6.8s ease-in-out infinite; }
        .animate-float-plant-right { animation: floatPlant 7.6s ease-in-out infinite; animation-delay: 0.4s; }

        @keyframes scrollDot {
          0% { transform: translateY(0); opacity: 1; }
          70% { opacity: 0; }
          100% { transform: translateY(10px); opacity: 0; }
        }
        .animate-scroll-dot { animation: scrollDot 2s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .animate-float-plant-left, .animate-float-plant-right, .animate-scroll-dot {
            animation: none !important;
          }
        }
      `}</style>

      <Navbar user={user} onLive={onLive} onSignIn={onSignIn} onSignUp={onSignUp} onHistory={onHistory} onProfile={onProfile} onSignOut={onSignOut} />

      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        onMouseEnter={() => richMotionEnabled && setGlowVisible(true)}
        onMouseLeave={() => setGlowVisible(false)}
        className="relative px-8 md:px-16 pt-14 pb-4 overflow-hidden"
      >
        <motion.div
          aria-hidden
          className="animate-bg-drift pointer-events-none absolute inset-0"
          style={{
            x: bgX,
            y: bgY,
            backgroundImage: "radial-gradient(640px circle at center, var(--accent) 0%, transparent 60%)",
            backgroundSize: "220% 220%",
            opacity: 0.07,
          }}
        />
        {richMotionEnabled && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute h-[500px] w-[500px] rounded-full"
            style={{
              x: glowSpringX,
              y: glowSpringY,
              translateX: "-50%",
              translateY: "-50%",
              background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
              filter: "blur(120px)",
              opacity: glowVisible ? 0.08 : 0,
              transition: "opacity 0.4s ease-out",
            }}
          />
        )}

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[220px_1fr_220px] items-end gap-0">
          <motion.div
            {...fadeUp({ scale: 0.9, duration: 0.8, delay: 0.5, reduceMotion, isMobile })}
            style={richMotionEnabled ? { x: plantsX, y: plantsY } : undefined}
            className="hidden md:block h-[340px] -mb-4"
          >
            <div className="animate-float-plant-left h-full w-full">
              <BotanicalLeft />
            </div>
          </motion.div>

          <div className="text-center py-4">
            <motion.p
              {...fadeUp({ y: 15, duration: 0.5, reduceMotion, isMobile })}
              className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-4"
            >
              English · Khmer · Neural translation
            </motion.p>

            <motion.h1
              variants={headlineContainer}
              initial="hidden"
              animate="visible"
              style={richMotionEnabled ? { x: headlineX, y: headlineY } : undefined}
              className="font-['Playfair_Display'] font-black text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-foreground mb-5"
            >
              {headlineLines.map((line, i) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span variants={lineVariant} className="block">
                    {i === 1 ? (
                      <>
                        <motion.span
                          className="text-shimmer italic inline-block"
                          animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
                          transition={reduceMotion ? undefined : { duration: 0.6, delay: 0.7, ease: EASE }}
                        >
                          World,
                        </motion.span>{" "}
                        One
                      </>
                    ) : (
                      line
                    )}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            <motion.p
              {...fadeUp({ y: 20, duration: 0.6, delay: 0.55, reduceMotion, isMobile })}
              className="text-muted-foreground text-base md:text-lg max-w-md mx-auto leading-relaxed"
            >
              Elegant, accurate, and instant translations powered by neural AI — crafted for writers, travelers, and explorers.
            </motion.p>

            <motion.div
              {...fadeUp({ y: 20, duration: 0.6, delay: 0.7, reduceMotion, isMobile })}
              className="flex items-center justify-center gap-3 mt-7"
            >
              <MagneticButton
                onClick={onLive}
                magneticStrength={0.2}
                className="bg-primary text-primary-foreground px-7 py-3 rounded-full text-sm font-semibold flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-[background-color,box-shadow,filter] duration-[250ms] hover:bg-accent hover:shadow-lg hover:brightness-105"
              >
                <Mic size={14} />
                Start translating
              </MagneticButton>
              <button className="border border-border text-foreground px-7 py-3 rounded-full text-sm font-medium transition-all duration-[250ms] outline-none focus-visible:ring-2 focus-visible:ring-accent/50 hover:bg-secondary hover:-translate-y-0.5">
                ▶ How it works
              </button>
            </motion.div>
          </div>

          <motion.div
            {...fadeUp({ scale: 0.9, duration: 0.8, delay: 0.5, reduceMotion, isMobile })}
            style={richMotionEnabled ? { x: plantsX, y: plantsY } : undefined}
            className="hidden md:block h-[340px] -mb-4"
          >
            <div className="animate-float-plant-right h-full w-full">
              <BotanicalRight />
            </div>
          </motion.div>
        </div>

        <div className="hidden md:flex justify-center pt-6 pb-1">
          <div className="opacity-50" aria-hidden>
            <div className="w-5 h-8 rounded-full border-2 border-foreground/50 flex justify-center pt-1.5">
              <span className="w-1 h-1.5 rounded-full bg-foreground/60 animate-scroll-dot" />
            </div>
          </div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={revealVariants({ reduceMotion, isMobile })}
        className="px-8 md:px-16 pb-16 pt-4"
      >
        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch border-b border-border">
              <div className="flex items-center gap-4 px-6 py-3.5 border-r border-border">
                <LanguageSelect value={sourceLang} onChange={setSourceLang} />
              </div>
              <div className="flex items-center justify-center px-4">
                <button onClick={handleSwap} className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:scale-110 transition-transform duration-200">
                  <ArrowLeftRight size={15} />
                </button>
              </div>
              <div className="flex items-center gap-4 px-6 py-3.5 border-l border-border">
                <LanguageSelect value={targetLang} onChange={setTargetLang} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[260px]">
              <div className="relative flex flex-col border-b md:border-b-0 md:border-r border-border">
                <textarea
                  value={sourceText}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  placeholder="Type or paste text here…"
                  className="flex-1 resize-none bg-transparent px-6 pt-5 pb-14 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[220px] font-['DM_Sans']"
                />
                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                  <span className="text-xs font-['DM_Mono'] text-muted-foreground/60">{charCount} / 5000</span>
                  <button
                    onClick={handleTranslate}
                    disabled={!sourceText.trim() || isTranslating}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-semibold hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                  >
                    {isTranslating ? (
                      <><span className="w-3 h-3 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />Translating…</>
                    ) : "Translate →"}
                  </button>
                </div>
              </div>
              <div className="relative flex flex-col bg-secondary/30">
                <div className="flex-1 px-6 pt-5 pb-14 text-[15px] leading-relaxed min-h-[220px] font-['DM_Sans']">
                  {translatedText ? (
                    <p className="text-foreground">{translatedText}</p>
                  ) : (
                    <p className="text-muted-foreground/40 italic">
                      {isTranslating ? "Translating your text…" : "Translation will appear here"}
                    </p>
                  )}
                </div>
                {translatedText && (
                  <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Volume2 size={13} />Listen
                    </button>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        ref={whyRef}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={sectionOrchestrator}
        className="relative overflow-hidden px-8 md:px-16 pb-20 bg-secondary/40 border-t border-border"
      >
        <div
          aria-hidden
          className="animate-bg-drift-cards pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(560px circle at center, var(--accent) 0%, transparent 60%)",
            backgroundSize: "220% 220%",
            opacity: 0.06,
          }}
        />
        <div className="relative max-w-5xl mx-auto pt-16">
          <motion.p variants={labelVariant} className="text-xs font-['DM_Mono'] uppercase text-accent mb-3 text-center">
            Why Fluent
          </motion.p>
          <motion.h2
            variants={headingContainerVariant}
            className="font-['Playfair_Display'] font-bold text-3xl md:text-4xl text-center mb-14 tracking-tight"
          >
            <motion.span variants={headingPartVariant} className="inline-block">
              Translation that feels
            </motion.span>{" "}
            <motion.span variants={headingPartVariant} className="inline-block">
              <motion.span
                className="text-shimmer-once italic"
                animate={reduceMotion ? undefined : { scale: [1, 1.05, 1] }}
                transition={reduceMotion ? undefined : { duration: 0.6, delay: 0.9, ease: EASE }}
              >
                human
              </motion.span>
            </motion.span>
          </motion.h2>
          <motion.div
            variants={cardsContainerVariant}
            style={{ y: cardsScrollY }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { icon: BrainCircuit, color: "bg-[#5C8A5A]", title: "Neural Accuracy", desc: "Context-aware AI that understands idioms, tone, and cultural nuance — not just words." },
              { icon: Gauge, color: "bg-accent", title: "Instant Results", desc: "Sub-second translations for up to 5,000 characters, powered by our low-latency inference pipeline." },
              { icon: Languages, color: "bg-[#3C6AB5]", title: "Khmer ↔ English", desc: "Purpose-built for Khmer and English, capturing tone, idiom, and cultural nuance that generic translators miss." },
            ].map((feature) => (
              <FeatureCard key={feature.title} {...feature} variants={cardVariant} />
            ))}
          </motion.div>
        </div>
      </motion.section>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={revealVariants({ reduceMotion, isMobile })}
      >
        <PlatformSection />
      </motion.div>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={revealVariants({ reduceMotion, isMobile, y: 24, duration: 0.5 })}
      >
        <Footer />
      </motion.div>
    </div>
  );
}
