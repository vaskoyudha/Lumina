import "./playground.css";
import { PlaygroundTheme } from "@/app/(app)/simulasi/PlaygroundTheme";

export default function SimulationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlaygroundTheme>{children}</PlaygroundTheme>;
}
