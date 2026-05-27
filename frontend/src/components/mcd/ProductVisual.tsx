import type { ApiProductIcon } from "@/lib/api";
import { PRODUCT_ICON_OPTIONS } from "@/components/mcd/product-icon-options";

export function ProductVisual({
  icon,
  className = "",
  compact = false,
}: {
  icon?: ApiProductIcon;
  className?: string;
  compact?: boolean;
}) {
  const option =
    PRODUCT_ICON_OPTIONS.find((available) => available.value === icon) ?? PRODUCT_ICON_OPTIONS[0];
  const Icon = option.Icon;

  return (
    <div
      className={`flex items-center justify-center ${option.color} ${className}`}
      aria-hidden="true"
    >
      <Icon className={compact ? "w-7 h-7" : "w-14 h-14"} />
    </div>
  );
}
