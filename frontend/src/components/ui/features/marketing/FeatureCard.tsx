import { useRef, useState, type MouseEvent } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { EASE } from "@/lib/motion";

const iconVariant: Variants = {
  hidden: { scale: 0.8, rotate: 5 },
  visible: { scale: 1, rotate: 0, transition: { duration: 0.5, ease: EASE } },
};

export default function FeatureCard({
  icon: Icon,
  color,
  title,
  desc,
  variants,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  desc: string;
  variants: Variants;
}) {
  const { richMotionEnabled } = useMotionPrefs();
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRX = useSpring(rotateX, { stiffness: 150, damping: 20 });
  const springRY = useSpring(rotateY, { stiffness: 150, damping: 20 });

  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const glowSpringX = useSpring(glowX, { stiffness: 200, damping: 25 });
  const glowSpringY = useSpring(glowY, { stiffness: 200, damping: 25 });
  const glowBackground = useMotionTemplate`radial-gradient(120px circle at ${glowSpringX}% ${glowSpringY}%, var(--accent) 0%, transparent 70%)`;

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    glowX.set(px * 100);
    glowY.set(py * 100);
    if (richMotionEnabled) {
      rotateX.set((0.5 - py) * 6);
      rotateY.set((px - 0.5) * 6);
    }
  };

  const handleMouseLeave = () => {
    setHovering(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: springRX, rotateY: springRY, transformPerspective: 800, willChange: "transform" }}
      whileHover={{ y: -10, scale: 1.02, transition: { duration: 0.25, ease: EASE } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.09, ease: EASE } }}
      className="relative bg-card rounded-2xl border border-border p-6 overflow-hidden transition-[border-color,box-shadow,filter] duration-[250ms] hover:border-accent/30 hover:shadow-xl hover:brightness-[1.03]"
    >
      {richMotionEnabled && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: glowBackground, filter: "blur(80px)", opacity: hovering ? 0.1 : 0, transition: "opacity 0.25s ease-out" }}
        />
      )}
      <motion.div variants={iconVariant} whileHover={{ rotate: 8, scale: 1.08, transition: { duration: 0.25, ease: EASE } }} className={`relative w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
        <Icon size={18} className="text-white" />
      </motion.div>
      <h3 className="relative font-['Playfair_Display'] font-bold text-lg mb-2">{title}</h3>
      <p className="relative text-muted-foreground text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}
