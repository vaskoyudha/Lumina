import { ContentLoading } from "@/components/belajar/content-state";
import { WorkspaceFrame } from "@/components/shell/workspace-frame";

/**
 * The catalog is a request-time PostgreSQL read. Rendering the shared workspace
 * chrome here keeps the sidebar on screen while that read resolves, so a
 * navigation swaps the content column instead of blanking down to a bare
 * skeleton.
 */
export default function BelajarLoading() {
  return (
    <WorkspaceFrame label="Belajar">
      <ContentLoading />
    </WorkspaceFrame>
  );
}
