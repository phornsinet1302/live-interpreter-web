// RunningCatHero.tsx
//
// A small orange-and-white cat that trots endlessly across a hero <h1>,
// paws aligned to the text's bottom edge. Pure CSS + inline SVG — no image
// assets, no animation library, safe to render on the server (no hooks/
// state), and cheap to theme or resize via props.
//
// USAGE
// -----
//   <div className="relative inline-block">
//     <h1 className="text-5xl font-black">Translate the World, One Word at a Time</h1>
//     <RunningCatHero />
//   </div>
//
// The cat's wrapper is `absolute inset-x-0 bottom-0` relative to whatever
// wraps it — so the closest positioned ancestor should be the element whose
// bottom edge you want the paws to sit on (usually a `relative` wrapper
// around the <h1>, not the <h1> itself, since the <h1>'s own box can clip
// overflow in some browsers when line-wrapped).
//
// ADJUSTING SPEED, SIZE, AND COLOR
// ---------------------------------
// All three are props (see RunningCatHeroProps below) — no need to touch
// the CSS. Internally they just set CSS custom properties that the
// <style> block at the bottom reads, so there's nothing else to edit.

import type { CSSProperties } from "react";

interface RunningCatHeroProps {
  /** Seconds for one full left-to-right crossing. Lower = faster overall pace. Default 9s. */
  crossDurationSeconds?: number;
  /** Seconds for one stride (one full leg-cycle). Lower = quicker-looking legs. Default 0.45s. */
  strideSeconds?: number;
  /** Cat height in pixels at the "sm" breakpoint and up; scales down slightly below it. Default 56. */
  heightPx?: number;
  /** Main coat color. Default a warm orange. */
  furColor?: string;
  /** Belly/muzzle/paw-tip patch color. Default off-white. */
  bellyColor?: string;
  /** Nudge the paws up/down if your font's visual baseline isn't exactly the box's bottom edge (e.g. "-3px"). */
  baselineOffset?: string;
  /** Extra classes for the outer wrapper (e.g. to hide on small screens). */
  className?: string;
}

export default function RunningCatHero({
  crossDurationSeconds = 9,
  strideSeconds = 0.45,
  heightPx = 56,
  furColor = "#E8873A",
  bellyColor = "#FFF7EC",
  baselineOffset = "0px",
  className = "",
}: RunningCatHeroProps) {
  return (
    <div
      aria-hidden="true"
      // pointer-events-none so the cat never blocks selecting/clicking the
      // headline underneath it — the whole point of layering it on top.
      className={`pointer-events-none absolute inset-x-0 bottom-0 overflow-visible ${className}`}
      style={
        {
          "--cat-cross-duration": `${crossDurationSeconds}s`,
          "--cat-stride-duration": `${strideSeconds}s`,
          "--cat-height": `${heightPx}px`,
          "--cat-fur": furColor,
          "--cat-belly": bellyColor,
          "--cat-baseline-offset": baselineOffset,
        } as CSSProperties
      }
    >
      {/* Runner: this is the element that travels left -> right. Its own
          height defines the cat's on-screen size; width is derived from the
          SVG's aspect ratio via `w-auto`. */}
      <div className="cat-runner absolute bottom-0 h-[var(--cat-height,56px)] w-auto sm:h-[var(--cat-height,56px)]">
        {/* Soft contact shadow — purely decorative, sits under the paws and
            pulses faintly so the cat reads as grounded rather than floating. */}
        <div className="cat-shadow absolute bottom-0 left-1/2 h-[10%] w-[70%] -translate-x-1/2 rounded-full bg-black/15 blur-[2px]" />

        {/* The cat itself. Facing right, since it's walking left -> right —
            flip with `scaleX(-1)` on this svg if you reverse the direction. */}
        <svg
          className="cat-body relative h-full w-auto"
          viewBox="0 0 120 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* --- back legs (drawn first so they're behind the body) --- */}
          <g className="leg leg-back-a" style={{ transformOrigin: "34px 40px" }}>
            <rect x="30" y="40" width="8" height="22" rx="4" fill="var(--cat-fur)" />
            <rect x="30" y="56" width="8" height="8" rx="4" fill="var(--cat-belly)" />
          </g>
          <g className="leg leg-back-b" style={{ transformOrigin: "46px 40px" }}>
            <rect x="42" y="40" width="8" height="22" rx="4" fill="var(--cat-fur)" />
            <rect x="42" y="56" width="8" height="8" rx="4" fill="var(--cat-belly)" />
          </g>

          {/* --- tail --- */}
          <g className="tail" style={{ transformOrigin: "22px 34px" }}>
            <path
              d="M22 34 C10 30, 4 18, 12 8"
              stroke="var(--cat-fur)"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>

          {/* --- body + bob (the whole torso/head/front-legs group bobs together) --- */}
          <g className="torso">
            {/* body */}
            <ellipse cx="55" cy="34" rx="30" ry="16" fill="var(--cat-fur)" />
            <ellipse cx="58" cy="42" rx="20" ry="9" fill="var(--cat-belly)" />

            {/* head */}
            <circle cx="92" cy="24" r="15" fill="var(--cat-fur)" />
            {/* ears */}
            <path d="M83 12 L79 -1 L91 8 Z" fill="var(--cat-fur)" />
            <path d="M84 9 L82 2 L89 7 Z" fill="var(--cat-belly)" />
            <path d="M101 12 L106 0 L94 8 Z" fill="var(--cat-fur)" />
            <path d="M100 9 L103 2 L96 7 Z" fill="var(--cat-belly)" />
            {/* muzzle */}
            <ellipse cx="98" cy="29" rx="7" ry="5.5" fill="var(--cat-belly)" />
            {/* face details */}
            <circle cx="88" cy="21" r="1.6" fill="#2B1B12" />
            <circle cx="97" cy="19" r="1.6" fill="#2B1B12" />
            <path d="M99 26 q1.5 2 3 0" stroke="#2B1B12" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M91 30 h-9 M91.5 32 h-8 M105 30 h9 M104.5 32 h8" stroke="#2B1B12" strokeOpacity="0.35" strokeWidth="0.8" strokeLinecap="round" />

            {/* front legs live inside .torso so they bob with the body, but
                animate their own rotation independently */}
            <g className="leg leg-front-a" style={{ transformOrigin: "68px 42px" }}>
              <rect x="64" y="42" width="8" height="22" rx="4" fill="var(--cat-fur)" />
              <rect x="64" y="58" width="8" height="8" rx="4" fill="var(--cat-belly)" />
            </g>
            <g className="leg leg-front-b" style={{ transformOrigin: "80px 42px" }}>
              <rect x="76" y="42" width="8" height="22" rx="4" fill="var(--cat-fur)" />
              <rect x="76" y="58" width="8" height="8" rx="4" fill="var(--cat-belly)" />
            </g>
          </g>
        </svg>
      </div>

      {/* Scoped animation definitions. A plain <style> tag works in both
          Server and Client Components and needs no Tailwind config changes —
          delete this block and move it into globals.css if you'd rather. */}
      <style>{`
        /* Horizontal crossing: starts just off-screen left, ends just off-
           screen right, then jumps back to the start — the classic
           "runs off, reappears" loop. Duration is the ONLY thing you need
           to change to speed this up/down (see crossDurationSeconds prop). */
        .cat-runner {
          left: -14%;
          animation: cat-cross var(--cat-cross-duration, 9s) linear infinite;
          transform: translateY(var(--cat-baseline-offset, 0px));
        }
        @keyframes cat-cross {
          from { left: -14%; }
          to   { left: 108%; }
        }

        /* Body bob: a quick up/down "bounce" tied to the stride, so each
           step visibly lands. */
        .torso {
          animation: cat-bob var(--cat-stride-duration, 0.45s) ease-in-out infinite;
          transform-box: fill-box;
        }
        @keyframes cat-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }

        /* Diagonal leg pairs move opposite each other, like a real trot:
           front-a with back-b, front-b with back-a. */
        .leg { transform-box: fill-box; }
        .leg-front-a, .leg-back-b {
          animation: cat-stride-a var(--cat-stride-duration, 0.45s) ease-in-out infinite;
        }
        .leg-front-b, .leg-back-a {
          animation: cat-stride-b var(--cat-stride-duration, 0.45s) ease-in-out infinite;
        }
        @keyframes cat-stride-a {
          0%, 100% { transform: rotate(-24deg); }
          50%      { transform: rotate(24deg); }
        }
        @keyframes cat-stride-b {
          0%, 100% { transform: rotate(24deg); }
          50%      { transform: rotate(-24deg); }
        }

        /* Tail wag — a bit slower than the legs so it doesn't look robotic. */
        .tail {
          transform-box: fill-box;
          animation: cat-tail calc(var(--cat-stride-duration, 0.45s) * 2.4) ease-in-out infinite;
        }
        @keyframes cat-tail {
          0%, 100% { transform: rotate(-6deg); }
          50%      { transform: rotate(16deg); }
        }

        /* Contact shadow pulses opposite the bob, so it "flattens" as a paw
           lands and "shrinks" mid-stride. */
        .cat-shadow {
          animation: cat-shadow-pulse var(--cat-stride-duration, 0.45s) ease-in-out infinite;
        }
        @keyframes cat-shadow-pulse {
          0%, 100% { opacity: 0.22; transform: translateX(-50%) scaleX(1); }
          50%      { opacity: 0.12; transform: translateX(-50%) scaleX(0.75); }
        }

        /* Respect reduced-motion: freeze on a neutral pose instead of
           forcing the animation off entirely mid-stride (which can look
           broken) — just stop looping. */
        @media (prefers-reduced-motion: reduce) {
          .cat-runner, .torso, .leg, .tail, .cat-shadow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
