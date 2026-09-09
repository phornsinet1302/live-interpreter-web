import { useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform, type Variants } from "framer-motion";
import { ArrowLeftRight, Mic, BrainCircuit, Gauge, Languages } from "lucide-react";
import Navbar from "@/components/ui/layout/Navbar";
import Footer from "@/components/ui/layout/Footer";
import PlatformSection from "@/components/ui/features/marketing/PlatformSection";
import FeatureCard from "@/components/ui/features/marketing/FeatureCard";
import LanguageSelect from "@/components/ui/features/translation/LanguageSelect";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import BotanicalRight from "@/components/ui/common/BotanicalRight";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { EASE, fadeUp, revealVariants } from "@/lib/motion";
import { UserAccount } from "@/types";

const headlineLines = ["Translate the", "World, One", "Word at a Time"];

export default function AboutPage({
  user,
  isSignedIn,
  onLive,
  onQuickStart,
  onSignIn,
  onSignUp,
  onHistory,
  onDashboard,
  onSettings,
  onSignOut,
}: {
  user: UserAccount | null;
  isSignedIn: boolean;
  onLive: () => void;
  // Tapping the mic below picks up a real getUserMedia/SpeechRecognition
  // session on the Live page (see LiveTranslate's autoStart), which this
  // page can't hold itself without duplicating that whole hook — so this
  // just hands off the chosen languages and lets Live start listening the
  // instant it mounts, keeping the "one click, no second tap" feel.
  onQuickStart: (sourceLang: string, targetLang: string) => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onHistory: () => void;
  onDashboard: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}) {
  const [sourceLang, setSourceLang] = useState("English");
  const [targetLang, setTargetLang] = useState("Khmer");
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

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

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

      <Navbar user={user} isSignedIn={isSignedIn} onLive={onLive} onSignIn={onSignIn} onSignUp={onSignUp} onHistory={onHistory} onDashboard={onDashboard} onSettings={onSettings} onSignOut={onSignOut} />

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
              className="flex flex-col items-center gap-5 mt-7"
            >
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-['DM_Mono'] tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Speaking</p>
                  <LanguageSelect value={sourceLang} onChange={setSourceLang} />
                </div>
                <button
                  onClick={handleSwap}
                  className="flex items-center gap-1 text-muted-foreground/40 hover:text-accent pb-1 transition-colors duration-150"
                  aria-label="Swap languages"
                >
                  <div className="w-8 h-px bg-border" />
                  <ArrowLeftRight size={12} />
                  <div className="w-8 h-px bg-border" />
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-['DM_Mono'] tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Translating to</p>
                  <LanguageSelect value={targetLang} onChange={setTargetLang} />
                </div>
              </div>

              {/* Tapping this hands off to the Live page with autoStart, so
                  listening begins the instant it mounts there — this page
                  can't itself hold a getUserMedia/SpeechRecognition session
                  without duplicating that hook. */}
              <button
                onClick={() => onQuickStart(sourceLang, targetLang)}
                aria-label="Start speaking"
                className="w-16 h-16 rounded-full flex items-center justify-center focus:outline-none transition-transform duration-150 hover:scale-105 active:scale-95"
                style={{ background: "#C85A3A" }}
              >
                <Mic size={22} className="text-white" />
              </button>
              <p className="text-xs font-['DM_Mono'] text-muted-foreground tracking-[0.15em] uppercase -mt-2">
                Tap to speak
              </p>
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
