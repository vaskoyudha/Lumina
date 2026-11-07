import "react";

/*
  The ported Framer sections carry inline custom properties (`--token-*`,
  `--framer-text-color`, …) because that is how the published site ships them.
  React's CSSProperties has no index signature for those keys, so widen it for
  every component instead of casting at each of the ~500 call sites.
*/
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
    /* Framer's export emits the CSS `corner-shape` alias next to borderRadius. */
    cornerShape?: string | number;
  }
}
