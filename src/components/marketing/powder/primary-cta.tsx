"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import DotBorderButton from "@/components/marketing/dot-border-button";

/**
 * Powder hero primary CTA. `DotBorderButton` renders inside an iframe, so the
 * visible control is the black pill drawn by the effect while a real link sits
 * on top for keyboard users and crawlers. The iframe owns the pointer so the
 * hover animation still fires; its click posts an activate message and we route
 * from there.
 */
export function PowderPrimaryCta({
  label = "Mulai periksa",
  href = "/companion",
}: {
  label?: string;
  href?: string;
}) {
  const router = useRouter();

  return (
    <div className="relative mr-6 h-12 w-[157px]">
      <DotBorderButton
        label={label}
        tone="solid"
        onActivate={() => router.push(href)}
        className="absolute"
        style={{ width: "210px", height: "66px", left: "-26.5px", top: "-9px" }}
      />
      <Link
        href={href}
        aria-label={label}
        className="pointer-events-none absolute inset-0 rounded-full"
      />
    </div>
  );
}
