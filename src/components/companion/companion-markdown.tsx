"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const SAFE_PROTOCOLS = new Set(["http", "https", "mailto"]);

function safeUrl(url: string): string {
  const value = url.trim();
  if (!value) return "";
  if (value.startsWith("#") || value.startsWith("/")) return value;
  const colon = value.indexOf(":");
  if (colon === -1) return value;
  return SAFE_PROTOCOLS.has(value.slice(0, colon).toLowerCase()) ? value : "";
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-5 mb-2 font-sans font-semibold text-[20px] text-ink leading-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 mb-2 font-sans font-semibold text-[18px] text-ink leading-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1.5 font-sans font-semibold text-[16px] text-ink leading-snug first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1 font-sans font-semibold text-[15px] text-ink leading-snug first:mt-0">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="mt-3 mb-1 font-sans font-semibold text-[14px] text-ink leading-snug first:mt-0">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="mt-3 mb-1 font-sans font-semibold text-[13px] text-ink uppercase leading-snug tracking-wide first:mt-0">
      {children}
    </h6>
  ),
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="line-through opacity-70">{children}</del>
  ),
  a: ({ href, children }) => {
    const safe = href ? safeUrl(href) : "";
    if (!safe) return <span>{children}</span>;
    const external = /^(https?:|mailto:)/i.test(safe);
    return (
      <a
        href={safe}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="font-medium text-ink underline decoration-edge underline-offset-2 transition-colors hover:decoration-ink"
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 ps-5 marker:text-dim last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 ps-5 marker:text-dim last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="ps-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-s-2 border-edge ps-3 text-dim italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-edge border-t" />,
  code: ({ className, children }) => {
    const raw = String(children).replace(/\n$/, "");
    const block =
      Boolean(className?.startsWith("language-")) || raw.includes("\n");
    if (block) {
      return (
        <code className="block font-mono text-[13px] leading-relaxed text-[#e5e7eb]">
          {raw}
        </code>
      );
    }
    return (
      <code className="rounded bg-chip px-1.5 py-0.5 font-mono text-[0.875em] text-ink">
        {raw}
      </code>
    );
  },
  pre: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-edge bg-[#1f2937] p-4">
      <pre className="whitespace-pre font-mono text-[13px] leading-relaxed text-[#e5e7eb]">
        {children}
      </pre>
    </div>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-edge">
      <table className="w-full border-collapse text-[14px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-chip">{children}</thead>,
  th: ({ children }) => (
    <th className="border-edge border-b px-3 py-2 text-start font-semibold text-ink">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-edge border-b px-3 py-2 text-dim">{children}</td>
  ),
  tr: ({ children }) => <tr className="last:[&>td]:border-b-0">{children}</tr>,
  img: () => null,
  input: ({ type, checked }) =>
    type === "checkbox" ? (
      <input
        type="checkbox"
        checked={Boolean(checked)}
        readOnly
        className="me-1.5 size-3.5 rounded border-edge align-middle accent-ink"
      />
    ) : null,
};

export const CompanionMarkdown = memo(function CompanionMarkdown({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  return (
    <div
      className={cn(
        "companion-prose max-w-[92%] font-serif text-[16px] text-txt leading-[1.75]",
        streaming && "is-streaming",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={safeUrl}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
