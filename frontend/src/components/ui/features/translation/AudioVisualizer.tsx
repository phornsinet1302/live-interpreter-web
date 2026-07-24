import { BAR_HEIGHTS, BAR_DURATIONS, BAR_DELAYS } from "../../../../lib/api/utils/constant";

export default function AudioVisualizer({ listening }: { listening: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3.5px]" style={{ height: "44px" }}>
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          style={{
            width: "3px",
            height: `${h}px`,
            borderRadius: "9999px",
            backgroundColor: listening ? "#C85A3A" : "#C0B8AC",
            transformOrigin: "center",
            transform: listening ? undefined : "scaleY(0.12)",
            animation: listening
              ? `barPulse ${BAR_DURATIONS[i]}s ease-in-out ${BAR_DELAYS[i]}s infinite alternate`
              : "none",
            transition: "background-color 0.4s ease, transform 0.4s ease",
          }}
        />
      ))}
    </div>
  );
}