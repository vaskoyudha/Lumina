import { ContentLoading } from "@/components/belajar/content-state";
import { WorkspaceFrame } from "@/components/shell/workspace-frame";

/**
 * The simulation catalog is a request-time PostgreSQL read. Rendering the
 * shared workspace chrome here keeps the sidebar on screen while that read
 * resolves, so only the level list waits for the database.
 */
export default function SimulasiLoading() {
  return (
    <WorkspaceFrame label="Simulasi">
      <ContentLoading />
    </WorkspaceFrame>
  );
}
