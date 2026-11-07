import "./stacked-layer.css";

type StackedLayerProps = {
  index: number;
  children: React.ReactNode;
  /** Opt out of the rounded top. */
  overlap?: boolean;
};

/*
  The panel is a plain block. The "slide over the previous section" motion comes
  from that section being pinned by `.overlap-stack` while this panel scrolls up
  past it. Keeping this wrapper out of the scroll maths means the panel never
  leaves a gap at its own edges.
*/
export function StackedLayer({
  index,
  children,
  overlap = true,
}: StackedLayerProps) {
  return (
    <div
      className="stacked-layer"
      data-stacked={overlap ? "true" : "false"}
      style={{ zIndex: index + 2 }}
    >
      {children}
    </div>
  );
}
