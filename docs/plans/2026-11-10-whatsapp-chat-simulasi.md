# WhatsApp-Style Simulation Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simulation transcript card in `Runner.tsx` with a WhatsApp-shaped chat surface: header, doodle wallpaper, in/out bubbles with tails and timestamps, ticks, typing indicator, quick-reply pills and a disabled composer.

**Architecture:** Presentation-only change. All runner state, reveal clock, scoring, pause logic, tool tasks and save flow stay untouched. New simulation-scoped components live under `src/components/simulasi/chat/`; the palette is scoped in `whatsapp-chat.css` as `--wa-*` variables inside `.wa-chat`, so no shared AppNext token changes and no hex enters TSX. Timestamps are derived deterministically from the transcript index by a pure helper.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, lucide-react 1.x, Biome, Jest + React Testing Library.

**Spec:** Design approved in chat on 2026-11-10 (hybrid chrome: neutral WhatsApp surfaces, Lumina orange only for the sent bubble/actions). This plan is the spec record.

## Global Constraints

- Work on branch `codex/simulasi-whatsapp-chat`; never commit to `main` (AGENTS.md branch rule).
- `npm run verify` (typecheck + lint + test + build) must pass before any commit that claims completion.
- No hex values in TSX. All WhatsApp colors live in `src/components/simulasi/chat/whatsapp-chat.css` inside `.wa-chat`.
- Do not edit `src/components/ui/**` (shadcn registry). Do not change AppNext or landing tokens.
- Must work at 380px width with no horizontal scroll; interactive targets at least 44px.
- Icon-only controls require an accessible name; typing animation must respect `prefers-reduced-motion`.
- Preserve existing behavior and accessible names that tests rely on: `role="log"` + `aria-label="Percakapan latihan"`, `Tampilkan pesan sekarang`, `Periksa lampiran · FOTO_PAKET.apk`, the expanded text `Ini contoh, tidak ada unduhan.`, and every choice label as a button.
- Do not use the WhatsApp wordmark, logo, or its doodle wallpaper asset. The wallpaper is our own CSS pattern.
- No schema change: `src/lib/simulasi/types.ts` and `validate.ts` stay untouched.

---

### Task 0: Branch

**Files:** none

- [ ] **Step 1: Create the working branch**

```bash
git switch -c codex/simulasi-whatsapp-chat
```

Expected: `Switched to a new branch 'codex/simulasi-whatsapp-chat'`.

---

### Task 1: Derived message clock

**Files:**
- Create: `src/lib/simulasi/clock.ts`
- Test: `src/lib/simulasi/clock.test.ts`

**Interfaces:**
- Produces: `messageClock(index: number): string` — `HH.MM`, base `16.42`, one minute per index, wraps at midnight, negative indexes clamp to `16.42`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/simulasi/clock.test.ts
import { messageClock } from "@/lib/simulasi/clock";

describe("messageClock", () => {
  it("starts at the narrative clock", () => {
    expect(messageClock(0)).toBe("16.42");
  });

  it("advances one minute per transcript entry", () => {
    expect(messageClock(1)).toBe("16.43");
    expect(messageClock(18)).toBe("17.00");
    expect(messageClock(60)).toBe("17.42");
  });

  it("wraps at midnight and clamps invalid input", () => {
    expect(messageClock(24 * 60)).toBe("16.42");
    expect(messageClock(-5)).toBe("16.42");
    expect(messageClock(3.9)).toBe("16.45");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/simulasi/clock.test.ts`
Expected: FAIL — `Cannot find module '@/lib/simulasi/clock'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/simulasi/clock.ts
const START_MINUTES = 16 * 60 + 42;
const MINUTES_PER_DAY = 24 * 60;

/**
 * Deterministic display clock for the simulation transcript.
 * The scenario stores no timestamps, so each revealed entry advances the
 * narrative clock by one minute. Kept pure so the render is stable in tests.
 */
export function messageClock(index: number): string {
  const offset = Number.isFinite(index) ? Math.max(0, Math.trunc(index)) : 0;
  const minutes = (START_MINUTES + offset) % MINUTES_PER_DAY;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}.${mm}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/simulasi/clock.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/simulasi/clock.ts src/lib/simulasi/clock.test.ts
git commit -m "feat(simulasi): derive a deterministic transcript clock"
```

---

### Task 2: Scoped chat styles, bubbles and system pills

**Files:**
- Create: `src/components/simulasi/chat/whatsapp-chat.css`
- Create: `src/components/simulasi/chat/chat-bubble.tsx`
- Test: `src/components/simulasi/chat/chat-bubble.test.tsx`

**Interfaces:**
- Consumes: `messageClock` from Task 1 (only in tests, to assert real values).
- Produces:
  - `ChatBubble({ direction, text, time, attachment?, ticks?, className? })`
  - `ChatSystem({ text, time })`
  - `type ChatAttachment = { name: string; detail: string; action?: ReactNode }`
  - CSS classes `.wa-row`, `.wa-bubble`, `.wa-text`, `.wa-meta`, `.wa-file`, `.wa-system`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/simulasi/chat/chat-bubble.test.tsx
import { render, screen } from "@testing-library/react";
import { ChatBubble, ChatSystem } from "@/components/simulasi/chat/chat-bubble";
import { messageClock } from "@/lib/simulasi/clock";

describe("ChatBubble", () => {
  it("renders an incoming bubble with sender-side styling and time", () => {
    render(
      <ChatBubble
        direction="incoming"
        text="Sore, Kak Raka."
        time={messageClock(0)}
      />,
    );

    expect(screen.getByText("Sore, Kak Raka.")).toBeInTheDocument();
    expect(screen.getByText("16.42")).toBeInTheDocument();
    expect(
      document.querySelector('[data-direction="incoming"]'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("wa-ticks")).not.toBeInTheDocument();
  });

  it("renders an outgoing bubble with orange-side styling and ticks", () => {
    render(
      <ChatBubble
        direction="outgoing"
        text="Cek pesanan lewat aplikasi."
        time={messageClock(2)}
        ticks
      />,
    );

    expect(screen.getByTestId("wa-ticks")).toBeInTheDocument();
    expect(
      document.querySelector('[data-direction="outgoing"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("16.44")).toBeInTheDocument();
  });

  it("renders an attachment card and its action inside the bubble", () => {
    render(
      <ChatBubble
        direction="incoming"
        text="Ini foto paketnya."
        time="16.43"
        attachment={{
          name: "FOTO_PAKET.apk",
          detail: "Aplikasi Android · 4,2 MB · contoh fiktif",
          action: <button type="button">Periksa lampiran</button>,
        }}
      />,
    );

    expect(screen.getByText("FOTO_PAKET.apk")).toBeInTheDocument();
    expect(screen.getByText(/4,2 MB/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /periksa lampiran/i }),
    ).toBeInTheDocument();
  });
});

describe("ChatSystem", () => {
  it("renders a centered system note with a time", () => {
    render(<ChatSystem text="Perangkat latihan: akses terbuka" time="16.45" />);
    expect(screen.getByRole("note")).toHaveTextContent("Perangkat latihan");
    expect(screen.getByText("16.45")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/simulasi/chat/chat-bubble.test.tsx`
Expected: FAIL — cannot resolve `@/components/simulasi/chat/chat-bubble`.

- [ ] **Step 3: Write the scoped stylesheet**

```css
/* src/components/simulasi/chat/whatsapp-chat.css
   Simulation-only WhatsApp-shaped surface. All colors stay inside .wa-chat.
   Not the WhatsApp asset: the wallpaper pattern is generated from gradients. */
.wa-chat {
  --wa-header: #f0f2f5;
  --wa-header-ink: #111b21;
  --wa-wallpaper: #efeae2;
  --wa-doodle: #d9d0c5;
  --wa-in: #ffffff;
  --wa-out: #fde6d8;
  --wa-out-ink: #4a1f0c;
  --wa-meta: #667781;
  --wa-system: #ffffffd9;
  --wa-border: #e5ddd5;
  --wa-composer: #f0f2f5;
  --wa-tick: #8696a0;

  position: relative;
  display: flex;
  min-height: 26rem;
  height: min(34rem, 68dvh);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--wa-border);
  border-radius: var(--appnext-r-lg, 20px);
  background: var(--wa-wallpaper);
  box-shadow: var(--appnext-shadow-ambient);
}

.wa-chat__header {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 59px;
  flex: 0 0 auto;
  padding: 0 10px;
  background: var(--wa-header);
  border-bottom: 1px solid var(--wa-border);
}

.wa-chat__back {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  color: #54656f;
}

.wa-chat__back:hover {
  background: rgb(0 0 0 / 5%);
}

.wa-chat__avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  background: #d9d0c5;
  color: #3b4a54;
  font-size: 14px;
  font-weight: 600;
}

.wa-chat__identity {
  min-width: 0;
  flex: 1 1 auto;
}

.wa-chat__name {
  overflow: hidden;
  color: var(--wa-header-ink);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wa-chat__status {
  overflow: hidden;
  color: var(--wa-meta);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wa-chat__fake {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgb(17 27 33 / 8%);
  color: #3b4a54;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.wa-chat__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
  color: #54656f;
}

.wa-reveal {
  min-height: 44px;
  margin-top: 4px;
  padding: 0 12px;
  border-radius: 9999px;
  background: rgb(255 255 255 / 80%);
  color: #027eb5;
  font-size: 12px;
}

.wa-reveal:hover {
  background: #ffffff;
}

.wa-chat__body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 12px 18px;
  background-color: var(--wa-wallpaper);
  background-image:
    radial-gradient(circle at 20% 30%, var(--wa-doodle) 0 1.5px, transparent 2px),
    radial-gradient(circle at 70% 65%, var(--wa-doodle) 0 1px, transparent 1.6px),
    linear-gradient(115deg, transparent 46%, var(--wa-doodle) 47%, transparent 48%);
  background-size: 46px 46px, 63px 63px, 120px 120px;
}

.wa-row {
  display: flex;
  margin: 2px 0;
  padding: 0 2px;
}

.wa-row.is-out {
  justify-content: flex-end;
}

.wa-bubble {
  position: relative;
  max-width: 78%;
  border-radius: 7.5px;
  padding: 6px 8px 6px 9px;
  background: var(--wa-in);
  box-shadow: 0 1px 0.5px rgb(11 20 26 / 13%);
  color: var(--wa-header-ink);
  font-size: 14.2px;
  line-height: 1.35;
}

.wa-row.is-in .wa-bubble {
  border-top-left-radius: 0;
}

.wa-row.is-out .wa-bubble {
  border-top-right-radius: 0;
  background: var(--wa-out);
  color: var(--wa-out-ink);
}

.wa-bubble::before {
  content: "";
  position: absolute;
  top: 0;
  width: 8px;
  height: 13px;
  background: inherit;
}

.wa-row.is-in .wa-bubble::before {
  left: -7px;
  clip-path: polygon(100% 0, 100% 100%, 0 0);
}

.wa-row.is-out .wa-bubble::before {
  right: -7px;
  clip-path: polygon(0 0, 0 100%, 100% 0);
}

.wa-text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.wa-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  margin-top: 2px;
  color: var(--wa-meta);
  font-size: 11px;
  line-height: 1;
}

.wa-meta svg {
  color: var(--wa-tick);
}

.wa-file {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 6px;
  padding: 8px 9px;
  border-radius: 7.5px;
  background: rgb(0 0 0 / 4%);
}

.wa-file__name {
  margin: 0;
  font-size: 13.5px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.wa-file__detail {
  margin: 1px 0 0;
  color: var(--wa-meta);
  font-size: 12px;
}

.wa-file__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.wa-file__actions button {
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid var(--wa-border);
  border-radius: 7.5px;
  background: var(--wa-in);
  color: var(--wa-header-ink);
  font-size: 13px;
  text-align: left;
}

.wa-file__actions button:hover {
  background: #f5f6f6;
}

.wa-file__note {
  margin: 0;
  padding: 7px 9px;
  border-radius: 7.5px;
  background: var(--wa-in);
  color: var(--wa-meta);
  font-size: 12.5px;
}

.wa-system {
  align-self: center;
  max-width: 85%;
  margin: 6px auto;
  padding: 5px 10px;
  border-radius: 7.5px;
  background: var(--wa-system);
  color: #54656f;
  font-size: 12.5px;
  line-height: 1.4;
  text-align: center;
  overflow-wrap: anywhere;
}

.wa-system__time {
  margin-left: 6px;
  color: var(--wa-meta);
  font-size: 11px;
}

.wa-chat__prompt {
  margin: 4px 0 0;
  padding: 4px 6px;
  color: var(--wa-header-ink);
  font-size: 13px;
  font-weight: 600;
  outline: none;
}

.wa-chat__prompt:focus-visible {
  outline: 2px solid var(--lumina-brand);
  outline-offset: 2px;
  border-radius: 6px;
}

@media (max-width: 480px) {
  .wa-chat {
    height: min(32rem, 72dvh);
  }

  .wa-bubble {
    max-width: 85%;
  }
}
```

- [ ] **Step 4: Write the bubble components**

```tsx
// src/components/simulasi/chat/chat-bubble.tsx
"use client";

import { CheckCheck, FileWarning } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./whatsapp-chat.css";

export type ChatAttachment = {
  name: string;
  detail: string;
  action?: ReactNode;
};

export function ChatBubble({
  direction,
  text,
  time,
  attachment,
  ticks = false,
  className,
}: {
  direction: "incoming" | "outgoing";
  text: string;
  time: string;
  attachment?: ChatAttachment;
  ticks?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("wa-row", direction === "outgoing" ? "is-out" : "is-in", className)}
      data-direction={direction}
    >
      <div className="wa-bubble">
        <p className="wa-text">{text}</p>
        {attachment && (
          <div className="wa-file">
            <FileWarning aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
            <div className="min-w-0">
              <p className="wa-file__name">{attachment.name}</p>
              <p className="wa-file__detail">{attachment.detail}</p>
            </div>
          </div>
        )}
        {attachment?.action && <div className="wa-file__actions">{attachment.action}</div>}
        <span className="wa-meta">
          <time>{time}</time>
          {ticks && (
            <CheckCheck aria-hidden="true" data-testid="wa-ticks" className="size-3.5" />
          )}
        </span>
      </div>
    </div>
  );
}

export function ChatSystem({ text, time }: { text: string; time: string }) {
  return (
    <div className="wa-system" role="note">
      {text}
      <span className="wa-system__time">{time}</span>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/simulasi/chat/chat-bubble.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/simulasi/chat/whatsapp-chat.css \
  src/components/simulasi/chat/chat-bubble.tsx \
  src/components/simulasi/chat/chat-bubble.test.tsx
git commit -m "feat(simulasi): add WhatsApp-style chat bubbles and scoped skin"
```

---

### Task 3: Chat surface (header + wallpaper body)

**Files:**
- Create: `src/components/simulasi/chat/chat-surface.tsx`
- Test: `src/components/simulasi/chat/chat-surface.test.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks except shared CSS.
- Produces:
  - `ChatSurface({ contactName, status, notice, bodyRef, children, footer })`
  - `bodyRef: RefObject<HTMLDivElement | null>` so the runner keeps its auto-scroll.
  - The body keeps `role="log"` and `aria-label="Percakapan latihan"`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/simulasi/chat/chat-surface.test.tsx
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { ChatSurface } from "@/components/simulasi/chat/chat-surface";

describe("ChatSurface", () => {
  it("renders the chat header, verification notice and transcript log", () => {
    const bodyRef = createRef<HTMLDivElement>();
    render(
      <ChatSurface
        contactName="Dimas · Pengantaran"
        status="online"
        notice="Nomor tidak tersimpan · identitas belum terverifikasi"
        bodyRef={bodyRef}
        footer={<div>composer</div>}
      >
        <p>Halo</p>
      </ChatSurface>,
    );

    expect(screen.getByText("Dimas · Pengantaran")).toBeInTheDocument();
    expect(screen.getByText("online")).toBeInTheDocument();
    expect(screen.getByText(/nomor tidak tersimpan/i)).toBeInTheDocument();
    expect(screen.getByRole("log", { name: /percakapan latihan/i })).toBeInTheDocument();
    expect(screen.getByText("Halo")).toBeInTheDocument();
    expect(screen.getByText("composer")).toBeInTheDocument();
  });

  it("announces typing in the header status", () => {
    const bodyRef = createRef<HTMLDivElement>();
    render(
      <ChatSurface contactName="Dimas" status="mengetik…" bodyRef={bodyRef}>
        <p>test</p>
      </ChatSurface>,
    );
    expect(screen.getByText("mengetik…")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/simulasi/chat/chat-surface.test.tsx`
Expected: FAIL — cannot resolve `chat-surface`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/simulasi/chat/chat-surface.tsx
"use client";

import { ArrowLeft, MoreVertical, Phone, Video } from "lucide-react";
import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import "./whatsapp-chat.css";

export function ChatSurface({
  contactName,
  status,
  notice,
  bodyRef,
  children,
  footer,
  className,
}: {
  contactName: string;
  status: string;
  notice?: string;
  bodyRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const initials = contactName.slice(0, 1).toUpperCase();

  return (
    <section
      className={cn("wa-chat", className)}
      aria-label={`Percakapan dengan ${contactName}`}
    >
      <header className="wa-chat__header">
        <Link
          href="/simulasi"
          aria-label="Kembali ke daftar simulasi"
          className="wa-chat__back"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <span aria-hidden="true" className="wa-chat__avatar">
          {initials}
        </span>
        <div className="wa-chat__identity">
          <p className="wa-chat__name">{contactName}</p>
          <p className="wa-chat__status" aria-live="polite">
            {status}
          </p>
        </div>
        <span className="wa-chat__fake">Fiktif</span>
        <span aria-hidden="true" className="wa-chat__actions">
          <Video className="size-5" />
          <Phone className="size-5" />
          <MoreVertical className="size-5" />
        </span>
      </header>
      <div
        ref={bodyRef}
        role="log"
        aria-label="Percakapan latihan"
        tabIndex={0}
        className="wa-chat__body flex flex-col"
      >
        {notice && (
          <div className="wa-system" role="note">
            {notice}
          </div>
        )}
        {children}
      </div>
      {footer}
    </section>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/simulasi/chat/chat-surface.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/simulasi/chat/chat-surface.tsx \
  src/components/simulasi/chat/chat-surface.test.tsx
git commit -m "feat(simulasi): add the WhatsApp-style chat surface shell"
```

---

### Task 4: Composer, quick replies and typing indicator

**Files:**
- Create: `src/components/simulasi/chat/chat-composer.tsx`
- Test: `src/components/simulasi/chat/chat-composer.test.tsx`

**Interfaces:**
- Consumes: `ScenarioChoice` from `@/lib/simulasi/types`; `whatsapp-chat.css` from Task 2.
- Produces:
  - `ChatQuickReplies({ prompt, promptRef, choices, disabled, onChoose })`
  - `ChatComposer({ hint })`
  - `ChatTyping()`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/simulasi/chat/chat-composer.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import {
  ChatComposer,
  ChatQuickReplies,
  ChatTyping,
} from "@/components/simulasi/chat/chat-composer";
import type { ScenarioChoice } from "@/lib/simulasi/types";

const choices: ScenarioChoice[] = [
  { label: "Cek pesanan sendiri", verdict: "benar", next: "a" },
  { label: "Pasang berkas", verdict: "salah", next: "b" },
];

describe("ChatQuickReplies", () => {
  it("renders each choice as a sendable reply and reports the pick", () => {
    const onChoose = jest.fn();
    const promptRef = createRef<HTMLHeadingElement>();
    render(
      <ChatQuickReplies
        prompt="Apa balasanmu?"
        promptRef={promptRef}
        choices={choices}
        disabled={false}
        onChoose={onChoose}
      />,
    );

    expect(screen.getByText("Apa balasanmu?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cek pesanan sendiri/i }));
    expect(onChoose).toHaveBeenCalledWith(choices[0]);
  });

  it("disables the pills while paused", () => {
    const promptRef = createRef<HTMLHeadingElement>();
    render(
      <ChatQuickReplies
        prompt="Apa balasanmu?"
        promptRef={promptRef}
        choices={choices}
        disabled
        onChoose={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /pasang berkas/i })).toBeDisabled();
  });
});

describe("ChatComposer", () => {
  it("renders a disabled WhatsApp-style composer", () => {
    render(<ChatComposer hint="Pilih balasan di atas" />);
    expect(screen.getByPlaceholderText("Pilih balasan di atas")).toBeDisabled();
    expect(screen.getByRole("button", { name: /kirim/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /emoji/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /lampirkan berkas/i }),
    ).toBeDisabled();
  });
});

describe("ChatTyping", () => {
  it("renders an accessible typing bubble", () => {
    render(<ChatTyping />);
    expect(
      screen.getByLabelText(/pengirim sedang mengetik/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/simulasi/chat/chat-composer.test.tsx`
Expected: FAIL — cannot resolve `chat-composer`.

- [ ] **Step 3: Add composer and typing CSS**

Append to `src/components/simulasi/chat/whatsapp-chat.css`:

```css
.wa-quick {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px 6px;
  border-top: 1px solid var(--wa-border);
  background: var(--wa-composer);
}

.wa-quick__reply {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 9px 14px;
  border: 1px solid #d1d7db;
  border-radius: 9999px;
  background: var(--wa-in);
  color: var(--wa-header-ink);
  font-size: 14px;
  text-align: left;
}

.wa-quick__reply:hover:not(:disabled) {
  background: #f5f6f6;
}

.wa-quick__reply:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.wa-quick__letter {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: var(--wa-header);
  color: var(--wa-meta);
  font-size: 11px;
  font-weight: 600;
}

.wa-composer {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-top: 1px solid var(--wa-border);
  background: var(--wa-composer);
}

.wa-composer__input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 40px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: var(--wa-in);
  color: var(--wa-header-ink);
  font-size: 14px;
}

.wa-composer__input::placeholder {
  color: var(--wa-meta);
}

.wa-composer__btn {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 9999px;
  color: #54656f;
}

.wa-composer__btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.wa-typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
}

.wa-typing span {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #8696a0;
  animation: wa-blink 1.2s infinite;
}

.wa-typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.wa-typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes wa-blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wa-typing span {
    animation: none;
    opacity: 0.6;
  }
}
```

- [ ] **Step 4: Write the components**

```tsx
// src/components/simulasi/chat/chat-composer.tsx
"use client";

import { Paperclip, Send, Smile } from "lucide-react";
import type { RefObject } from "react";
import type { ScenarioChoice } from "@/lib/simulasi/types";
import "./whatsapp-chat.css";

export function ChatQuickReplies({
  prompt,
  promptRef,
  choices,
  disabled,
  onChoose,
}: {
  prompt: string;
  promptRef: RefObject<HTMLHeadingElement | null>;
  choices: ScenarioChoice[];
  disabled: boolean;
  onChoose: (choice: ScenarioChoice) => void;
}) {
  return (
    <div className="wa-quick" aria-label="Pilihan balasan">
      <h2 ref={promptRef} tabIndex={-1} className="wa-chat__prompt">
        {prompt}
      </h2>
      {choices.map((choice, index) => (
        <button
          key={choice.label}
          type="button"
          className="wa-quick__reply"
          disabled={disabled}
          onClick={() => onChoose(choice)}
        >
          <span aria-hidden="true" className="wa-quick__letter">
            {String.fromCharCode(65 + index)}
          </span>
          <span className="min-w-0">{choice.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ChatComposer({ hint }: { hint: string }) {
  return (
    <div className="wa-composer">
      <button type="button" className="wa-composer__btn" aria-label="Emoji" disabled>
        <Smile aria-hidden="true" className="size-5" />
      </button>
      <input
        className="wa-composer__input"
        placeholder={hint}
        aria-label="Tulis pesan (nonaktif)"
        disabled
        readOnly
      />
      <button
        type="button"
        className="wa-composer__btn"
        aria-label="Lampirkan berkas"
        disabled
      >
        <Paperclip aria-hidden="true" className="size-5" />
      </button>
      <button type="button" className="wa-composer__btn" aria-label="Kirim" disabled>
        <Send aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

export function ChatTyping() {
  return (
    <div className="wa-row is-in" data-typing="true">
      <div className="wa-bubble wa-typing" aria-label="Pengirim sedang mengetik">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/simulasi/chat/chat-composer.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/simulasi/chat/chat-composer.tsx \
  src/components/simulasi/chat/chat-composer.test.tsx \
  src/components/simulasi/chat/whatsapp-chat.css
git commit -m "feat(simulasi): add composer, quick replies and typing bubble"
```

---

### Task 5: Integrate the surface into the runner

**Files:**
- Modify: `src/app/(chat)/simulasi/[id]/Runner.tsx` (replace the in-progress conversation card, currently around lines 1141-1311; keep tool task, collection and rationale blocks)
- Modify: `src/app/(chat)/simulasi/[id]/Runner.test.tsx` (add assertions; keep all existing tests)

**Interfaces:**
- Consumes: `messageClock`, `ChatSurface`, `ChatBubble`, `ChatSystem`, `ChatQuickReplies`, `ChatComposer`, `ChatTyping`.
- Produces: no new exports; the page contract is unchanged.

- [ ] **Step 1: Add failing integration assertions**

Append to the `describe` in `Runner.test.tsx`:

```tsx
it("renders the simulation as a WhatsApp-style conversation", () => {
  render(<Runner content={SIMULATION_FIXTURE} />);
  reachFirstDecision();

  expect(
    screen.getByRole("log", { name: /percakapan latihan/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/nomor tidak tersimpan · identitas belum terverifikasi/i),
  ).toBeInTheDocument();
  expect(document.querySelector('[data-direction="incoming"]')).toBeInTheDocument();
  expect(screen.getByText("16.42")).toBeInTheDocument();
  expect(
    screen.getByPlaceholderText(/pilih balasan di atas/i),
  ).toBeDisabled();
});

it("sends a chosen reply as an orange outgoing bubble", () => {
  render(<Runner content={SIMULATION_FIXTURE} />);
  reachFirstDecision();
  click(/cek pesanan lewat aplikasi belanja sendiri/i);

  const outgoing = document.querySelector('[data-direction="outgoing"]');
  expect(outgoing).toBeInTheDocument();
  expect(outgoing).toHaveTextContent(/cek pesanan lewat aplikasi belanja sendiri/i);
  expect(screen.getAllByTestId("wa-ticks").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- "src/app/(chat)/simulasi/[id]/Runner.test.tsx"`
Expected: FAIL — no `data-direction` bubbles, no wallpaper header, no `Pilih balasan di atas` placeholder.

- [ ] **Step 3: Add the imports**

At the top of `Runner.tsx`, add:

```tsx
import {
  ChatComposer,
  ChatQuickReplies,
  ChatTyping,
} from "@/components/simulasi/chat/chat-composer";
import { ChatBubble, ChatSystem } from "@/components/simulasi/chat/chat-bubble";
import { ChatSurface } from "@/components/simulasi/chat/chat-surface";
import { messageClock } from "@/lib/simulasi/clock";
```

Remove `MessageSquare` from the lucide import if it is no longer referenced.

- [ ] **Step 4: Replace the in-progress conversation card**

Replace the `<Card className="rounded-card ...">` block that starts with the `MessageSquare` header and ends after the `active.type === "choice"` section. First, immediately before the `return (` of the in-progress branch, add:

```tsx
const awaitingMessage =
  started && !paused && !ended && active.type === "message";
const typing = awaitingMessage && active.speaker === MISSION.contact;
```

Then replace the returned card with:

```tsx
<ChatSurface
  contactName={MISSION.contact}
  status={typing ? "mengetik…" : "online"}
  notice={MISSION.contactDetail}
  bodyRef={transcriptRef}
  footer={
    <>
      {active.type === "choice" && (
        <ChatQuickReplies
          prompt={active.prompt}
          promptRef={promptRef}
          choices={active.choices}
          disabled={paused}
          onChoose={choose}
        />
      )}
      <ChatComposer
        hint={
          active.type === "choice"
            ? "Pilih balasan di atas"
            : "Menunggu pesan berikutnya"
        }
      />
    </>
  }
>
  {transcript.map((entry, index) =>
    entry.kind === "reply" ? (
      <ChatBubble
        key={`reply-${entry.id}`}
        direction="outgoing"
        text={entry.text}
        time={messageClock(index)}
        ticks
      />
    ) : entry.node.speaker === MISSION.contact ? (
      <ChatBubble
        key={entry.node.id}
        direction="incoming"
        text={entry.node.text}
        time={messageClock(index)}
        attachment={
          entry.node.attachment
            ? {
                name: entry.node.attachment.name,
                detail: entry.node.attachment.detail,
                action: (
                  <>
                    <button
                      type="button"
                      disabled={paused}
                      aria-expanded={attachmentOpen.includes(entry.node.id)}
                      onClick={() =>
                        setAttachmentOpen(toggle(attachmentOpen, entry.node.id))
                      }
                    >
                      Periksa lampiran · {entry.node.attachment.name}
                    </button>
                    {attachmentOpen.includes(entry.node.id) && (
                      <p className="wa-file__note">
                        {entry.node.attachment.detail}. Ini contoh, tidak ada
                        unduhan.
                      </p>
                    )}
                  </>
                ),
              }
            : undefined
        }
      />
    ) : (
      <ChatSystem
        key={entry.node.id}
        text={`${entry.node.speaker}: ${entry.node.text}`}
        time={messageClock(index)}
      />
    ),
  )}
  {awaitingMessage && <ChatTyping />}
  {active.type === "message" && (
    <div className="mt-1 flex justify-center">
      <button
        type="button"
        disabled={paused}
        className="wa-reveal"
        onClick={() => reveal(active)}
      >
        Tampilkan pesan sekarang
      </button>
    </div>
  )}
</ChatSurface>
```

Notes for the implementer:
- `typing` controls only the header status (`mengetik…`); `awaitingMessage` controls the dots, so system nodes still show a pending bubble like the old `Catatan latihan sedang disiapkan…` line.
- Leave the `latest?.rationale` Alert, `{tool}` and `{collection}` blocks where they are, after the chat surface. The tool card keeps its existing Lumina Card styling; do not nest it inside the wallpaper.

- [ ] **Step 5: Run the runner tests**

Run: `npm test -- "src/app/(chat)/simulasi/[id]/Runner.test.tsx"`
Expected: PASS (all existing tests plus the two new ones).

- [ ] **Step 6: Fix any regressions and commit**

If a name or text assertion fails, restore the exact accessible name rather than weakening the test.

```bash
git add "src/app/(chat)/simulasi/[id]/Runner.tsx" \
  "src/app/(chat)/simulasi/[id]/Runner.test.tsx"
git commit -m "feat(simulasi): render the mission as a WhatsApp-style chat"
```

---

### Task 6: Responsive, accessibility and full gate

**Files:**
- Modify: `src/components/simulasi/chat/whatsapp-chat.css` (only if the 380px pass finds overflow)
- Modify: `Runner.tsx` (only if the 380px pass finds overflow)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 2: Format and typecheck**

Run: `npm run lint:fix && npm run typecheck`
Expected: no Biome errors; `tsc --noEmit` exits 0.

- [ ] **Step 3: Manual 380px check**

Run the dev server: `npm run dev`, open `/simulasi/l1-kurir-apk` (or the seeded id), start the mission, set the viewport to 380px. Verify:
- no horizontal scrollbar;
- header name truncates, not wraps;
- bubbles stay under 85% width;
- composer and quick replies stay above the fold;
- `Tampilkan pesan sekarang` is reachable;
- with `prefers-reduced-motion: reduce`, typing dots are static.

- [ ] **Step 4: Run the release gate**

Run: `npm run verify`
Expected: typecheck, lint, tests and production build all pass.

- [ ] **Step 5: Commit any polish**

```bash
git add -A
git commit -m "fix(simulasi): tighten WhatsApp chat at 380px and a11y"
```

---

## Self-Review

- **Spec coverage:** hybrid palette (Task 2), header/wallpaper (Task 3), bubbles/tails/ticks (Task 2), timestamps derived (Task 1), quick replies + composer (Task 4), typing indicator (Task 4), runner integration (Task 5), 380px/a11y/gate (Task 6).
- **No placeholders:** every step contains the code or command it needs.
- **Type consistency:** `messageClock(index: number): string`; `ChatSurface` takes `bodyRef: RefObject<HTMLDivElement | null>`; `ChatQuickReplies` takes `promptRef: RefObject<HTMLParagraphElement | null>`; `ScenarioChoice` is imported, never redefined.
- **Known intentional trade-off:** the header back link always points to `/simulasi`; practice simulations opened from `/belajar/pola-*` also return to the simulation list, matching the existing page-level back button behavior closely enough and avoiding a new prop through `Runner`.
