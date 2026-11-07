import Image from "next/image";

import { stepsCopy } from "@/lib/site";

import "./triage-cards.css";

const orange = "rgb(255, 122, 0)";

const cardArt = [
  { image: "card-archive", tint: orange, dots: [orange, "#1c1c1c", "#1c1c1c"] },
  { image: "card-levelup", tint: orange, dots: [orange, orange, "#1c1c1c"] },
  { image: "card-spiders", tint: orange, dots: [orange, orange, orange] },
];

export function Triage() {
  return (
    <section
      id="section-triage"
      aria-labelledby="triage-cards-title"
      className="bg-sand-100 pb-24"
    >
      <h2 id="triage-cards-title" className="sr-only">
        Tiga langkah memeriksa pesan
      </h2>
      <div className="triage-stage mx-auto w-full max-w-6xl px-6">
        <div className="triage-grid">
          {stepsCopy.steps.map((step, index) => {
            const art = cardArt[index] ?? cardArt[0];
            return (
              <article key={step.no} className="triage-card">
                <div className="triage-fgTop">
                  <div className="triage-labelBox">
                    <p className="triage-label">{`— ${step.no}®`}</p>
                  </div>
                </div>
                <div className="triage-fgBottom">
                  <div className="triage-dots">
                    {art.dots.map((color, dotIndex) => (
                      <div
                        key={`${step.no}-${dotIndex}`}
                        className="triage-dot"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="triage-headingBox">
                  <p className="triage-heading">{step.title}.</p>
                </div>
                <div className="triage-pic">
                  <div className="triage-picInner">
                    <div className="triage-picImageWrap">
                      <Image
                        src={`/images/triage/${art.image}-1480.avif`}
                        alt=""
                        fill
                        sizes="(min-width: 1200px) 300px, (min-width: 720px) 33vw, 90vw"
                        className="triage-picImage"
                        unoptimized
                      />
                      <span
                        className="triage-picTint"
                        style={{ backgroundColor: art.tint }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <div className="triage-captionBox">
                    <p className="triage-caption">{step.body}</p>
                  </div>
                </div>
                <div className="triage-shadow">
                  <div className="triage-shadowInner" />
                </div>
                <div className="triage-light">
                  <div
                    className="triage-lightBarTop"
                    style={{ backgroundColor: orange }}
                  />
                  <div
                    className="triage-lightBarBottom"
                    style={{ backgroundColor: orange }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
