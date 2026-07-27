import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
>;

interface MagneticButtonProps extends NativeButtonProps {
  children: ReactNode;
  /** 0 disables the cursor-follow pull; keep small so it stays subtle. */
  magneticStrength?: number;
}

export default function MagneticButton({
  children,
  className,
  magneticStrength = 0.2,
  onMouseMove,
  onMouseLeave,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const { richMotionEnabled } = useMotionPrefs();

  return (
    <motion.button
      ref={ref}
      className={className}
      onMouseMove={(e) => {
        onMouseMove?.(e);
        if (!richMotionEnabled || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        setOffset({
          x: (e.clientX - (rect.left + rect.width / 2)) * magneticStrength,
          y: (e.clientY - (rect.top + rect.height / 2)) * magneticStrength,
        });
      }}
      onMouseLeave={(e) => {
        onMouseLeave?.(e);
        setOffset({ x: 0, y: 0 });
      }}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.4 }}
      whileHover={{ scale: 1.03, y: offset.y - 3 }}
      whileTap={{ scale: 0.97 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
