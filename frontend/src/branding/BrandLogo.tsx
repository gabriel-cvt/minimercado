import { useBranding } from "./branding";

export function BrandLogo({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  const settings = useBranding();

  return (
    <div
      className={`${compact ? "h-12 w-12" : "h-12 min-w-12 px-3"} flex items-center justify-center rounded-2xl bg-gradient-yellow shadow-elegant`}
      aria-label={settings.businessName}
    >
      <span
        className={`font-black leading-none ${compact ? "text-xl" : "text-lg"} ${inverse ? "text-foreground" : "text-primary"}`}
      >
        {settings.shortName}
      </span>
    </div>
  );
}
