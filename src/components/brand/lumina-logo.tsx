import Image from "next/image";
import { cn } from "@/lib/utils";

/*
 * Brand lockups cut from the supplied mascot artwork: the background was
 * flood-filled out, so the mark sits on any surface. `color` is the brown
 * wordmark for light surfaces; `onDark` keeps the orange dot but paints the
 * glyphs cream so the lockup survives the black theme and the footer.
 */

const SRC = {
  color: "/brand/lumina-lockup.png",
  onDark: "/brand/lumina-lockup-light.png",
  mark: "/brand/lumina-mark.png",
} as const;

const RATIO = {
  lockup: { width: 640, height: 194 },
  mark: { width: 200, height: 197 },
} as const;

type Props = {
  variant?: "lockup" | "mark";
  tone?: "color" | "onDark";
  className?: string;
  priority?: boolean;
};

export function LuminaLogo({
  variant = "lockup",
  tone = "color",
  className,
  priority,
}: Props) {
  const src =
    variant === "mark" ? SRC.mark : tone === "onDark" ? SRC.onDark : SRC.color;
  const ratio = RATIO[variant];

  return (
    <Image
      src={src}
      alt="Lumina"
      width={ratio.width}
      height={ratio.height}
      priority={priority}
      className={cn("h-auto w-auto select-none", className)}
    />
  );
}

/*
 * The marketing header sits on a themed hero, so it needs both wordmarks.
 * The pair is swapped by the `[data-theme="black"]` rules in powder-theme.css;
 * rendering both keeps the swap CSS-only, with no theme state in React.
 */
export function ThemedLuminaLogo({
  className,
  priority,
}: Pick<Props, "className" | "priority">) {
  return (
    <>
      <LuminaLogo
        tone="color"
        className={cn("brand-logo-color", className)}
        priority={priority}
      />
      <LuminaLogo
        tone="onDark"
        className={cn("brand-logo-on-dark", className)}
        priority={priority}
      />
    </>
  );
}
