import type { ReactNode } from "react";

type PowderSurface = "light" | "dark";

const outerWrap =
  "framer-CaVRT framer-9C3FS framer-gF1Dm framer-tz6Zq framer-knjRQ framer-KVnNX framer-cqiiB framer-1t24cya";
const innerWrap =
  "framer-oJiFP framer-eMoyh framer-knjRQ framer-tz6Zq framer-9C3FS framer-gF1Dm framer-KVnNX framer-kj696b";

export function PowderLayer({
  surface = "light",
  tint = false,
  children,
}: {
  surface?: PowderSurface;
  tint?: boolean;
  children: ReactNode;
}) {
  const surfaceClass = surface === "dark" ? "pw-on-dark" : "pw-surface";
  return (
    <div
      className={`framer-site pw-theme ${surfaceClass}${tint ? " pw-tint" : ""}`}
    >
      <div className={outerWrap} style={{ width: "100%" }}>
        <div className={innerWrap} style={{ display: "contents" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
