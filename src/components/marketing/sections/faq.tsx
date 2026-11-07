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
      className="border-hairline border-t bg-white px-4 pt-28 pb-24 sm:px-8"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-hairline-strong bg-sand-150 px-3.5 py-1 font-semibold text-[11px] text-espresso-900 uppercase tracking-wider">
            <span>☺</span>
            <span>{faqCopy.badge}</span>
          </div>
          <h2 className="font-semibold text-3xl text-espresso-950 sm:text-4xl">
            {faqCopy.title}
          </h2>
          <p className="mt-1.5 text-ink-soft text-xs sm:text-sm">
            {faqCopy.body}
          </p>
        </div>

        <Tabs
          value={category}
          onValueChange={(value) => {
            setCategory(value as FaqCategory);
            setOpenIndex("0");
          }}
          className="items-center gap-0"
        >
          <TabsList
            aria-label="Kategori pertanyaan"
            className="mb-8 grid max-w-2xl grid-cols-2 gap-1.5 rounded-full border border-hairline bg-sand-150 p-1.5 sm:grid-cols-4"
          >
            {faqCategories.map((item, index) => (
              <TabsTrigger
                key={item}
                value={item}
                className="h-auto rounded-full px-4 py-2 font-medium text-espresso-900 text-xs transition-all hover:bg-white/60 [&[data-state=active]]:bg-espresso-800 [&[data-state=active]]:font-semibold [&[data-state=active]]:text-white [&[data-state=active]]:shadow-sm"
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
                className="space-y-2.5 rounded-3xl border border-hairline bg-sand-350 p-3 sm:p-4"
              >
                {faqData[item].map((entry, index) => (
                  <AccordionItem
                    key={entry.q}
                    value={String(index)}
                    className="faq-item group overflow-hidden rounded-2xl border border-hairline bg-white transition-all not-last:border-b-0 data-[state=open]:border-espresso-800 data-[state=open]:bg-espresso-800 data-[state=open]:text-white"
                  >
                    <AccordionTrigger className="faq-toggle items-center rounded-none px-5 py-4 font-semibold text-espresso-950 text-xs hover:no-underline sm:text-sm data-[state=open]:text-white [&_[data-slot=accordion-trigger-icon]]:hidden">
                      <span>{entry.q}</span>
                      <span className="faq-icon flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-espresso-800 text-white text-xs group-data-[state=open]:bg-white group-data-[state=open]:text-espresso-900">
                        {openIndex === String(index) ? "−" : "+"}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-4 text-ink-body text-xs leading-relaxed group-data-[state=open]:text-amberwarm-100/90">
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
