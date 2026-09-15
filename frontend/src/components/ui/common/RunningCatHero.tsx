import { useEffect, useRef, useState, type RefObject } from "react";

// An original, hand-drawn (not based on any existing character) orange
// tabby cat that runs an endless zigzag across a multi-line headline: left
// to right along line 1, hops down and runs right to left along line 2,
// hops down and runs left to right along line 3, then hops back to the
// start. Speed per line is proportional to that line's actual measured
// width, so the pace feels consistent even though "Translate the",
// "World, One", and "Word at a Time" aren't the same length.
//
// USAGE — pass one ref per headline line (in reading order) pointing at
// each line's wrapping element; this component measures their real
// rendered text extents (not just their box, which may be wider than the
// visible glyphs if the line is centered) via the Range API, so it works
// regardless of how the lines are laid out.
//
//   const lineRefs = [useRef<HTMLElement>(null), useRef(null), useRef(null)];
//   <div className="relative">
//     <h1>
//       <span ref={lineRefs[0]}>Translate the</span>
//       <span ref={lineRefs[1]}>World, One</span>
//       <span ref={lineRefs[2]}>Word at a Time</span>
//     </h1>
//     <RunningCatHero lineRefs={lineRefs} />
//   </div>

interface LineRect {
  left: number;
  right: number;
  bottom: number;
}

interface RunningCatHeroProps {
  /** One ref per line, in reading order (top to bottom). */
  lineRefs: RefObject<HTMLElement | null>[];
  /** Pixels per second while running — controls overall pace. */
  speedPxPerSecond?: number;
  /** Seconds for each hop between lines. */
  hopSeconds?: number;
  /** Cat height in pixels. */
  heightPx?: number;
  /** Main coat color. */
  furColor?: string;
  /** Darker tabby-stripe/shading tone. Defaults to a darker shade of furColor if omitted. */
  stripeColor?: string;
  /** Belly/muzzle/paw-pad-surround color. */
  bellyColor?: string;
  /** How far the paws sit above each line's measured text-bottom, in pixels. */
  paddingAbovePx?: number;
  className?: string;
}

export default function RunningCatHero({
  lineRefs,
  speedPxPerSecond = 90,
  hopSeconds = 0.5,
  heightPx = 34,
  furColor = "#E8873A",
  stripeColor = "#B85F22",
  bellyColor = "#FFF7EC",
  paddingAbovePx = 2,
  className = "",
}: RunningCatHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<HTMLDivElement>(null);
  const [lineRects, setLineRects] = useState<LineRect[] | null>(null);
  const [ready, setReady] = useState(false);

  // Measures each line's ACTUAL rendered glyph ink (not any wrapping
  // element's own box) relative to this component's own container.
  //
  // This matters twice over: a centered line's wrapper can be much wider
  // than its visible glyphs (so selecting the wrapper misjudges left/right),
  // and — the subtler bug — a `display:block` wrapper's own box is inflated
  // by line-height (half-leading above and below its text), so adjacent
  // lines' wrapper boxes stay flush against each other with zero gap
  // between them no matter how much line-height increases; only the real
  // text nodes' own rendered position reflects that spacing. Walking down
  // to the actual Text nodes and ranging across those (rather than
  // `range.selectNodeContents(wrapperEl)`) gets the true ink extent either
  // way.
  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const rects: LineRect[] = [];
      for (const ref of lineRefs) {
        const el = ref.current;
        if (!el) return; // not mounted yet — try again on next observed resize
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) textNodes.push(node as Text);
        if (textNodes.length === 0) return;
        const range = document.createRange();
        range.setStart(textNodes[0], 0);
        const last = textNodes[textNodes.length - 1];
        range.setEnd(last, last.length);
        const r = range.getBoundingClientRect();
        rects.push({
          left: r.left - containerRect.left,
          right: r.right - containerRect.left,
          bottom: r.bottom - containerRect.top,
        });
      }
      if (rects.length === lineRefs.length) {
        setLineRects(rects);
        setReady(true);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    // Fonts loading in late (Google Fonts) can shift text metrics after the
    // very first measurement — re-measure once fonts are confirmed ready.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineRefs.length]);

  // Drives the zigzag path with requestAnimationFrame, writing directly to
  // the runner's transform each frame (skipping React state) for a smooth
  // 60fps loop. Segments alternate run/hop; each run's duration is that
  // line's width / speedPxPerSecond, so pace-per-pixel stays constant.
  useEffect(() => {
    if (!lineRects || lineRects.length < 2) return;
    const runner = runnerRef.current;
    if (!runner) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      const first = lineRects[0];
      runner.style.transform = `translate3d(${first.left}px, ${first.bottom - heightPx - paddingAbovePx}px, 0) scaleX(1)`;
      return;
    }

    type Segment =
      | { kind: "run"; y: number; from: number; to: number; duration: number; faceRight: boolean }
      | { kind: "hop"; x: number; from: number; to: number; duration: number; faceRight: boolean };

    const segments: Segment[] = [];
    let goingRight = true;
    for (let i = 0; i < lineRects.length; i++) {
      const line = lineRects[i];
      const y = line.bottom - heightPx - paddingAbovePx;
      const width = Math.max(1, line.right - line.left);
      const duration = width / speedPxPerSecond;
      segments.push(
        goingRight
          ? { kind: "run", y, from: line.left, to: line.right - heightPx * 0.9, duration, faceRight: true }
          : { kind: "run", y, from: line.right - heightPx * 0.9, to: line.left, duration, faceRight: false }
      );
      const next = lineRects[i + 1] ?? lineRects[0];
      const hopX = goingRight ? line.right - heightPx * 0.9 : line.left;
      const nextHopX = i + 1 < lineRects.length ? hopX : lineRects[0].left;
      segments.push({
        kind: "hop",
        x: goingRight ? hopX : nextHopX,
        from: y,
        to: (i + 1 < lineRects.length ? next.bottom : lineRects[0].bottom) - heightPx - paddingAbovePx,
        duration: hopSeconds,
        faceRight: goingRight,
      });
      if (i + 1 < lineRects.length) goingRight = !goingRight;
    }

    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
    let rafId: number;
    const start = performance.now();

    const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

    const tick = (now: number) => {
      const elapsed = ((now - start) / 1000) % totalDuration;
      let t = elapsed;
      for (const seg of segments) {
        if (t <= seg.duration) {
          const progress = seg.duration > 0 ? t / seg.duration : 1;
          if (seg.kind === "run") {
            const x = seg.from + (seg.to - seg.from) * progress;
            runner.style.transform = `translate3d(${x}px, ${seg.y}px, 0) scaleX(${seg.faceRight ? 1 : -1})`;
          } else {
            // Hop: a small arc (sine bump) up and back down while moving to
            // the next line's baseline. Capped to a fraction of the actual
            // vertical gap being crossed (lines can sit close together at
            // tight leading) so the arc never overshoots back up into the
            // line above instead of staying in the whitespace between lines.
            const eased = easeInOutSine(progress);
            const y = seg.from + (seg.to - seg.from) * eased;
            const gap = Math.abs(seg.to - seg.from);
            const arcHeight = Math.min(heightPx * 0.22, gap * 0.4);
            const arc = Math.sin(Math.PI * progress) * arcHeight;
            runner.style.transform = `translate3d(${seg.x}px, ${y - arc}px, 0) scaleX(${seg.faceRight ? 1 : -1})`;
          }
          break;
        }
        t -= seg.duration;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [lineRects, heightPx, paddingAbovePx, speedPxPerSecond, hopSeconds]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-visible ${className}`}
      style={
        {
          "--cat-fur": furColor,
          "--cat-stripe": stripeColor,
          "--cat-belly": bellyColor,
          visibility: ready ? "visible" : "hidden",
        } as React.CSSProperties
      }
    >
      <div ref={runnerRef} className="absolute left-0 top-0 h-[var(--cat-h)] w-auto" style={{ "--cat-h": `${heightPx}px` } as React.CSSProperties}>
        <div className="cat-shadow absolute bottom-0 left-1/2 h-[12%] w-[65%] -translate-x-1/2 rounded-full bg-black/15 blur-[1.5px]" />

        <svg className="cat-body relative h-[var(--cat-h)] w-auto" viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* back legs */}
          <g className="leg leg-back-a" style={{ transformOrigin: "38px 52px" }}>
            <rect x="34" y="52" width="9" height="24" rx="4.5" fill="var(--cat-fur)" />
            <ellipse cx="38.5" cy="76" rx="5" ry="3.5" fill="#F2A6A0" opacity="0.85" />
          </g>
          <g className="leg leg-back-b" style={{ transformOrigin: "52px 52px" }}>
            <rect x="48" y="52" width="9" height="24" rx="4.5" fill="var(--cat-fur)" />
            <ellipse cx="52.5" cy="76" rx="5" ry="3.5" fill="#F2A6A0" opacity="0.85" />
          </g>

          {/* tail: thicker base tapering toward a rounded tip, one stripe */}
          <g className="tail" style={{ transformOrigin: "28px 48px" }}>
            <path d="M28,48 C12,44 2,28 10,10 C13,4 20,2 22,7 C16,18 18,32 34,42 Z" fill="var(--cat-fur)" />
            <path d="M24,40 C15,32 13,22 17,13" stroke="var(--cat-stripe)" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <circle cx="15" cy="9" r="5.5" fill="var(--cat-fur)" />
          </g>

          {/* torso + head + front legs, bobs together */}
          <g className="torso">
            {/* body silhouette */}
            <path
              d="M22,58 C14,44 20,26 46,20 C62,16 80,17 92,24 C100,19 110,19 114,26 C117,31 111,36 104,35 C110,42 109,52 98,58 C82,67 40,67 26,61 C23,60 21,60 22,58 Z"
              fill="var(--cat-fur)"
            />
            {/* belly patch */}
            <ellipse cx="64" cy="53" rx="26" ry="13" fill="var(--cat-belly)" />
            {/* back stripes (tabby markings) */}
            <path d="M40,24 C44,29 44,34 40,38" stroke="var(--cat-stripe)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
            <path d="M56,20 C60,26 60,32 55,37" stroke="var(--cat-stripe)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
            <path d="M72,20 C76,26 75,32 70,37" stroke="var(--cat-stripe)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />

            {/* head */}
            <circle cx="112" cy="30" r="18" fill="var(--cat-fur)" />
            {/* ears (outer + inner) */}
            <path d="M99,16 C97,6 100,1 106,3 C110,5 111,13 108,18 Z" fill="var(--cat-fur)" />
            <path d="M101,13 C100,8 102,5 105,6 C107,7 107,11 105,14 Z" fill="#FFC9B8" />
            <path d="M122,16 C126,7 124,1 118,3 C114,5 112,13 116,18 Z" fill="var(--cat-fur)" />
            <path d="M120,13 C122,8 121,5 118,6 C116,7 116,11 118,14 Z" fill="#FFC9B8" />
            {/* small forehead stripe marks */}
            <path d="M108,10 L109,15 M112,9 L112,15 M116,10 L115,15" stroke="var(--cat-stripe)" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
            {/* cheek fluff */}
            <circle cx="98" cy="35" r="6" fill="var(--cat-fur)" />
            <circle cx="126" cy="35" r="6" fill="var(--cat-fur)" />
            {/* muzzle */}
            <ellipse cx="112" cy="39" rx="9.5" ry="7" fill="var(--cat-belly)" />
            {/* eyes with a tiny highlight for life/sparkle */}
            <ellipse cx="104" cy="28" rx="2.6" ry="3.2" fill="#2B1B12" />
            <ellipse cx="120" cy="28" rx="2.6" ry="3.2" fill="#2B1B12" />
            <circle cx="105" cy="26.5" r="0.9" fill="#fff" />
            <circle cx="121" cy="26.5" r="0.9" fill="#fff" />
            {/* nose + content mouth */}
            <path d="M110,35.5 L114,35.5 L112,38 Z" fill="#E8837A" />
            <path d="M112,38 C111,40 108,40.5 106.5,39" stroke="#2B1B12" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M112,38 C113,40 116,40.5 117.5,39" stroke="#2B1B12" strokeWidth="1.1" strokeLinecap="round" />
            {/* whiskers */}
            <path d="M95,36 h-11 M95,39 h-12 M129,36 h11 M129,39 h12" stroke="#fff" strokeOpacity="0.9" strokeWidth="0.9" strokeLinecap="round" />

            {/* front legs (inside torso so they bob with the body) */}
            <g className="leg leg-front-a" style={{ transformOrigin: "78px 54px" }}>
              <rect x="74" y="54" width="9" height="24" rx="4.5" fill="var(--cat-fur)" />
              <ellipse cx="78.5" cy="78" rx="5" ry="3.5" fill="#F2A6A0" opacity="0.85" />
            </g>
            <g className="leg leg-front-b" style={{ transformOrigin: "92px 54px" }}>
              <rect x="88" y="54" width="9" height="24" rx="4.5" fill="var(--cat-fur)" />
              <ellipse cx="92.5" cy="78" rx="5" ry="3.5" fill="#F2A6A0" opacity="0.85" />
            </g>
          </g>
        </svg>
      </div>

      <style>{`
        .torso {
          animation: cat-bob 0.4s ease-in-out infinite;
          transform-box: fill-box;
        }
        @keyframes cat-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        .leg { transform-box: fill-box; }
        .leg-front-a, .leg-back-b { animation: cat-stride-a 0.4s ease-in-out infinite; }
        .leg-front-b, .leg-back-a { animation: cat-stride-b 0.4s ease-in-out infinite; }
        @keyframes cat-stride-a {
          0%, 100% { transform: rotate(-26deg); }
          50%      { transform: rotate(26deg); }
        }
        @keyframes cat-stride-b {
          0%, 100% { transform: rotate(26deg); }
          50%      { transform: rotate(-26deg); }
        }
        .tail {
          transform-box: fill-box;
          animation: cat-tail 1s ease-in-out infinite;
        }
        @keyframes cat-tail {
          0%, 100% { transform: rotate(-6deg); }
          50%      { transform: rotate(14deg); }
        }
        .cat-shadow { animation: cat-shadow-pulse 0.4s ease-in-out infinite; }
        @keyframes cat-shadow-pulse {
          0%, 100% { opacity: 0.22; transform: translateX(-50%) scaleX(1); }
          50%      { opacity: 0.12; transform: translateX(-50%) scaleX(0.75); }
        }
        @media (prefers-reduced-motion: reduce) {
          .torso, .leg, .tail, .cat-shadow { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
