"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type FaqCategory, faqCategories, faqCopy, faqData } from "@/lib/site";

export function Faq() {
  const [category, setCategory] = useState<FaqCategory>(faqCategories[0]);
  const [openIndex, setOpenIndex] = useState("0");

  return (
    <section
      id="section-faq"
      className="border-ls-line border-t bg-ls-surface px-4 pt-28 pb-24 sm:px-8"
    >
      <div className="mx-auto max-w-[1200px]">
        <div data-reveal className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-ls-line-strong bg-ls-card-alt px-3.5 py-1 font-semibold text-[11px] text-ls-ink-2 uppercase tracking-wider">
            <span>☺</span>
            <span>{faqCopy.badge}</span>
          </div>
          <h2 className="font-semibold text-3xl text-ls-ink sm:text-4xl">
            {faqCopy.title}
          </h2>
          <p className="mt-1.5 text-ls-ink-3 text-xs sm:text-sm">
            {faqCopy.body}
          </p>
        </div>

        <Tabs
          data-reveal
          value={category}
          onValueChange={(value) => {
            setCategory(value as FaqCategory);
            setOpenIndex("0");
          }}
          className="items-center gap-0"
        >
          <TabsList
            aria-label="Kategori pertanyaan"
            className="mb-8 grid max-w-2xl grid-cols-2 gap-1.5 rounded-full border border-ls-line bg-ls-card-alt p-1.5 sm:grid-cols-4"
          >
            {faqCategories.map((item, index) => (
              <TabsTrigger
                key={item}
                value={item}
                className="h-auto rounded-full px-4 py-2 font-medium text-ls-ink-2 text-xs transition-all hover:bg-ls-card/60 [&[data-state=active]]:border-ls-solid-line [&[data-state=active]]:bg-ls-solid [&[data-state=active]]:font-semibold [&[data-state=active]]:text-ls-solid-ink [&[data-state=active]]:shadow-sm"
              >
                {index === 0 ? `☺ ${item}` : item}
              </TabsTrigger>
            ))}
          </TabsList>

          {faqCategories.map((item) => (
            <TabsContent key={item} value={item} className="w-full">
              <Accordion
                type="single"
                collapsible
                value={openIndex}
                onValueChange={setOpenIndex}
                className="space-y-2.5 rounded-3xl border border-ls-line bg-ls-surface-alt p-3 sm:p-4"
              >
                {faqData[item].map((entry, index) => (
                  <AccordionItem
                    key={entry.q}
                    value={String(index)}
                    className="faq-item group overflow-hidden rounded-2xl border border-ls-line bg-ls-card transition-all not-last:border-b-0 data-[state=open]:border-ls-solid data-[state=open]:bg-ls-solid data-[state=open]:text-ls-solid-ink"
                  >
                    <AccordionTrigger className="faq-toggle items-center rounded-none px-5 py-4 font-semibold text-ls-ink text-xs hover:no-underline sm:text-sm data-[state=open]:text-ls-solid-ink [&_[data-slot=accordion-trigger-icon]]:hidden">
                      <span>{entry.q}</span>
                      <span className="faq-icon flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ls-solid text-ls-solid-ink text-xs group-data-[state=open]:bg-ls-card group-data-[state=open]:text-ls-ink">
                        {openIndex === String(index) ? "−" : "+"}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-4 text-ls-ink-2 text-xs leading-relaxed group-data-[state=open]:text-ls-solid-ink/85">
                      {entry.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
