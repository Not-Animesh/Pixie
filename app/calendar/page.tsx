import { CalendarPage } from "@/components/calendar-page";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCalendarData } from "@/lib/calendar-data";

export const dynamic = "force-dynamic";

export default async function CalendarRoute() {
  const { items, categories } = await getCalendarData();
  return <DashboardShell><CalendarPage initialItems={items} initialCategories={categories} /></DashboardShell>;
}
