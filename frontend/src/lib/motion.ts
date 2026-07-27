/** Shared motion primitives so every section eases and times the same way. */

export const EASE = [0.22, 1, 0.36, 1] as const;

export function fadeUp(opts: {
  y?: number;
  duration?: number;
  delay?: number;
  reduceMotion?: boolean;
  isMobile?: boolean;
  scale?: number;
} = {}) {
  const { y = 20, duration = 0.6, delay = 0, reduceMotion = false, isMobile = false, scale } = opts;
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.25, delay: 0 },
    };
  }
  const half = isMobile ? 0.5 : 1;
  return {
    initial: { opacity: 0, y: y * half, ...(scale !== undefined ? { scale: 1 - (1 - scale) * half } : {}) },
    animate: { opacity: 1, y: 0, ...(scale !== undefined ? { scale: 1 } : {}) },
    transition: { duration: duration * half, delay: delay * half, ease: EASE },
  };
}

/** For scroll-triggered reveals: pair with `initial="hidden" whileInView="visible"`. */
export function revealVariants(opts: { y?: number; duration?: number; reduceMotion?: boolean; isMobile?: boolean } = {}) {
  const { y = 40, duration = 0.7, reduceMotion = false, isMobile = false } = opts;
  const half = isMobile ? 0.5 : 1;
  return {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: y * half },
    visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.3 : duration * half, ease: EASE } },
  };
}
