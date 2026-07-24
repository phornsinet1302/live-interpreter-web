export default function Logo({
  size = "text-xl",
  light = false,
  className = "",
}: {
  size?: string;
  light?: boolean;
  className?: string;
}) {
  const textColor = light ? "text-white" : "text-foreground";

  return (
    <span
      className={`relative isolate inline-flex items-center font-['Baloo_2'] font-extrabold tracking-tight leading-none ${size} ${textColor} ${className}`}
    >
      <span>flu</span>
      <span className="relative inline-block">
        <span className="absolute -top-[0.32em] -right-[0.22em] z-0 w-[1.15em] h-[1.15em] rounded-full bg-accent" />
        <span className="relative z-10">ent</span>
      </span>
    </span>
  );
}
