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
    <div className="wa-quick">
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
      <button
        type="button"
        className="wa-composer__btn"
        aria-label="Emoji"
        disabled
      >
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
      <button
        type="button"
        className="wa-composer__btn"
        aria-label="Kirim"
        disabled
      >
        <Send aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

export function ChatTyping() {
  return (
    <div className="wa-row is-in" data-typing="true">
      <output
        className="wa-bubble wa-typing"
        aria-label="Pengirim sedang mengetik"
      >
        <span />
        <span />
        <span />
      </output>
    </div>
  );
}
