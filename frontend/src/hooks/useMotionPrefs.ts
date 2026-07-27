import { useReducedMotion } from "framer-motion";
import { useIsMobile } from "@/components/ui/use-mobile";

/**
 * Central switch for the site's motion budget. Parallax and cursor-glow are
 * desktop-only flourishes; reduced-motion users get plain fades everywhere.
 */
export function useMotionPrefs() {
  const reduceMotion = !!useReducedMotion();
  const isMobile = useIsMobile();
  return {
    reduceMotion,
    isMobile,
    richMotionEnabled: !reduceMotion && !isMobile,
  };
}
