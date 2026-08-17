import { DashboardShell } from "@/components/dashboard-shell";
import { KanbanPage } from "@/components/kanban-page";
import { getKanbanData } from "@/lib/kanban-data";

export const dynamic = "force-dynamic";

export default async function KanbanRoute() {
  const boards = await getKanbanData();
  return (
    <DashboardShell>
      <KanbanPage initialBoards={boards} />
    </DashboardShell>
  );
}
