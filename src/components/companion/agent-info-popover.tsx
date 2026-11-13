"use client";

import { Info } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  AGENT_REGISTRY,
  type DetectorAgent,
} from "@/components/companion/agents";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * The one place an agent's description lives when it is not printed inline.
 *
 * The chat trace opens this popover from the agent profile and the evidence
 * panel reuses the same body for its inline detail card, so the copy cannot
 * drift between surfaces: `AGENT_REGISTRY` is the single source. Triggers are
 * real buttons, not hover affordances, because touch and keyboard readers have
 * no hover.
 */
export function AgentProfileDetails({ agent }: { agent: DetectorAgent }) {
  const profile = AGENT_REGISTRY[agent];
  const Icon = profile.icon;

  return (
    <>
      <div className="flex items-start gap-2.5">
        <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-edge bg-brand-chip text-brand-strong">
          {profile.portrait ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="36px"
              src={profile.portrait}
            />
          ) : (
            <Icon aria-hidden className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-semibold text-[12.5px] text-txt">
              {profile.displayName}
            </p>
            <span className="rounded-full border border-line px-1.5 py-0.5 font-mono text-[9.5px] text-dim uppercase tracking-[0.08em]">
              {profile.label}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-dim leading-snug">
            {profile.purpose}
          </p>
        </div>
      </div>

      <div className="mt-2.5">
        <p className="font-mono text-[9px] text-dim uppercase tracking-[0.14em]">
          Ciri yang dicek
        </p>
        <ul className="mt-1 flex flex-wrap gap-1">
          {profile.mechanism.map((item) => (
            <li
              className="rounded border border-line px-1.5 py-0.5 text-[10px] text-txt/80"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      {profile.caveat ? (
        <p className="mt-2 border-edge-soft border-t pt-2 text-[10.5px] text-dim leading-snug">
          {profile.caveat}
        </p>
      ) : null}
    </>
  );
}

export function AgentInfoPopover({
  agent,
  children,
  align = "start",
  className,
  contentClassName,
  side = "right",
}: {
  agent: DetectorAgent;
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  contentClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const profile = AGENT_REGISTRY[agent];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={`Apa yang dilakukan ${profile.displayName}?`}
          className={cn(
            "group/info min-w-0 rounded-[10px] text-left outline-none transition-colors hover:bg-txt/[0.03] focus-visible:ring-2 focus-visible:ring-brand-strong",
            className,
          )}
          type="button"
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn("w-64", contentClassName)}
        side={side}
      >
        <AgentProfileDetails agent={agent} />
      </PopoverContent>
    </Popover>
  );
}

/** The small affordance that tells a reader the profile is clickable. */
export function AgentInfoHint({ className }: { className?: string }) {
  return (
    <Info
      aria-hidden
      className={cn(
        "size-3 shrink-0 text-dim transition-colors group-hover/info:text-brand-ink",
        className,
      )}
    />
  );
}
