"use client";

import { useState, type ComponentType } from "react";
import {
  ArrowUpRight, Bot, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, FileText, FolderKanban, LayoutDashboard, Menu, MoreHorizontal,
  Plus, Settings, Sparkles, StickyNote, WandSparkles, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavigationItem = { label: string; icon: ComponentType<{ className?: string }>; color: string; active?: boolean };

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  { label: "Workspace", items: [
    { label: "Dashboard", icon: LayoutDashboard, color: "text-sky-600", active: true },
    { label: "AI Assistant", icon: Bot, color: "text-violet-600" },
    { label: "Calendar", icon: CalendarDays, color: "text-rose-500" },
    { label: "Task / Kanban", icon: FolderKanban, color: "text-amber-600" },
  ] },
  { label: "Create", items: [
    { label: "Notes", icon: StickyNote, color: "text-orange-500" },
    { label: "Whiteboard", icon: WandSparkles, color: "text-teal-600" },
    { label: "Pages / Spaces", icon: FileText, color: "text-indigo-600" },
    { label: "AI Template Builder", icon: Sparkles, color: "text-fuchsia-600" },
  ] },
  { label: "Preferences", items: [{ label: "Settings", icon: Settings, color: "text-slate-500" }] },
];

function Sidebar({ collapsed, onCollapse, mobile, onClose }: { collapsed: boolean; onCollapse: () => void; mobile?: boolean; onClose?: () => void }) {
  return (
    <aside className={cn("flex h-full flex-col border-r border-stone-200/80 bg-[#fffdf9] px-3 py-4 shadow-[6px_0_24px_rgba(90,72,50,0.025)]", mobile ? "w-[278px]" : collapsed ? "w-[76px]" : "w-[244px]")}>
      <div className="flex h-9 items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-200"><Sparkles className="h-4 w-4" /></div>
          <span className={cn("overflow-hidden whitespace-nowrap text-[15px] font-bold tracking-[-0.02em] text-stone-800 transition-all duration-200", collapsed && !mobile ? "w-0 opacity-0" : "w-auto opacity-100")}>Pixie</span>
        </div>
        {mobile ? <button aria-label="Close navigation" onClick={onClose} className="icon-button"><X className="h-4 w-4" /></button> : <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onCollapse} className="icon-button">{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>}
      </div>

      <nav className="mt-7 flex-1 space-y-5" aria-label="Main navigation">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className={cn("mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 transition-opacity", collapsed && !mobile && "opacity-0")}>{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return <button key={item.label} title={collapsed && !mobile ? item.label : undefined} onClick={onClose} className={cn("group flex h-9 w-full items-center rounded-lg px-2 text-left text-[13px] font-medium transition-colors", item.active ? "bg-violet-50 text-violet-800 shadow-[0_1px_1px_rgba(109,40,217,0.06)]" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900", collapsed && !mobile && "justify-center px-0")}><Icon className={cn("h-[17px] w-[17px] shrink-0", item.color)} /><span className={cn("ml-3 overflow-hidden whitespace-nowrap transition-all duration-200", collapsed && !mobile ? "w-0 opacity-0" : "w-auto opacity-100")}>{item.label}</span></button>;
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-stone-200/80 pt-3">
        <button title={collapsed && !mobile ? "Pixie workspace" : undefined} className={cn("flex w-full items-center rounded-xl p-1.5 text-left hover:bg-stone-100", collapsed && !mobile && "justify-center")}>
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-700">P</div>
          <div className={cn("ml-2.5 min-w-0 transition-all duration-200", collapsed && !mobile ? "w-0 opacity-0" : "w-auto opacity-100")}><p className="truncate text-xs font-semibold text-stone-700">Pixie workspace</p><p className="text-[10px] text-stone-400">Personal plan</p></div>
          {!collapsed && !mobile && <MoreHorizontal className="ml-auto h-4 w-4 text-stone-400" />}
        </button>
      </div>
    </aside>
  );
}

export function DashboardShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const tasks = ["Review workspace structure", "Draft weekly goals", "Collect research references"];
  const recent = [{ title: "Product ideas", type: "Whiteboard", color: "bg-teal-100 text-teal-600" }, { title: "Launch checklist", type: "Page", color: "bg-sky-100 text-sky-600" }];

  return <div className="min-h-screen bg-[#f8f7f3] text-stone-800">
    <div className="fixed inset-y-0 left-0 z-30 hidden md:block"><Sidebar collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} /></div>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-stone-900/20" /><div className="relative h-full w-fit shadow-2xl"><Sidebar collapsed={false} onCollapse={() => undefined} mobile onClose={() => setMobileOpen(false)} /></div></div>}
    <main className={cn("min-h-screen transition-[margin] duration-200", collapsed ? "md:ml-[76px]" : "md:ml-[244px]")}>
      <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 sm:py-7 lg:px-10">
        <header className="mb-8 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="icon-button md:hidden"><Menu className="h-5 w-5" /></button><div><p className="text-xs font-medium text-stone-400">Monday, August 17</p><h1 className="mt-0.5 text-2xl font-bold tracking-[-0.035em] text-stone-800 sm:text-[28px]">Good morning, Animesh <span aria-hidden="true">✦</span></h1></div></div><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Create new</span></button></header>
        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr]">
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-[#fdfaff] to-sky-50 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-violet-700 shadow-sm"><Sparkles className="h-3.5 w-3.5" /> Today&apos;s focus</div><h2 className="max-w-md text-xl font-bold tracking-[-0.025em] text-stone-800 sm:text-2xl">Finish the product planning board</h2><p className="mt-2 max-w-lg text-sm leading-6 text-stone-500">You&apos;re making steady progress. Reserve one focused hour to turn today&apos;s ideas into a clear plan.</p></div><div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600 sm:grid"><Clock3 className="h-6 w-6" /></div></div><div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-100"><div className="h-full w-[68%] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" /></div><span className="text-xs font-semibold text-violet-700">68%</span></div></div>
          <div className="rounded-2xl border border-stone-200 bg-[#fffdf9] p-5 shadow-[0_6px_22px_rgba(77,66,52,0.04)]"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-stone-800">Today&apos;s rhythm</h2><CalendarDays className="h-4 w-4 text-rose-500" /></div><div className="mt-4 space-y-3"><div className="flex items-center gap-3"><span className="w-10 text-[11px] font-medium text-stone-400">10:00</span><span className="h-8 w-1 rounded-full bg-sky-400" /><span className="text-xs font-medium text-stone-700">Planning session</span></div><div className="flex items-center gap-3"><span className="w-10 text-[11px] font-medium text-stone-400">14:30</span><span className="h-8 w-1 rounded-full bg-amber-400" /><span className="text-xs font-medium text-stone-700">Deep work block</span></div></div></div>
        </section>
        <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-stone-200 bg-[#fffdf9] p-5 shadow-[0_6px_22px_rgba(77,66,52,0.04)] sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-stone-400">My tasks</p><h2 className="mt-0.5 text-lg font-bold tracking-[-0.02em]">Keep moving forward</h2></div><button className="text-xs font-semibold text-violet-600 hover:text-violet-800">View board <ArrowUpRight className="ml-0.5 inline h-3.5 w-3.5" /></button></div><div className="mt-5 space-y-2">{tasks.map((task, index) => <div key={task} className="flex items-center gap-3 rounded-xl border border-stone-100 px-3 py-3 transition hover:border-violet-100 hover:bg-violet-50/30"><CheckCircle2 className={cn("h-4 w-4", index === 0 ? "text-emerald-500" : "text-stone-300")} /><span className={cn("flex-1 text-xs font-medium", index === 0 ? "text-stone-400 line-through" : "text-stone-700")}>{task}</span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", index === 1 ? "bg-rose-50 text-rose-600" : "bg-stone-100 text-stone-500")}>{index === 1 ? "High" : "Today"}</span></div>)}</div></div>
          <div className="rounded-2xl border border-stone-200 bg-[#fffdf9] p-5 shadow-[0_6px_22px_rgba(77,66,52,0.04)] sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-stone-400">Recent work</p><h2 className="mt-0.5 text-lg font-bold tracking-[-0.02em]">Pick up where you left off</h2></div><MoreHorizontal className="h-5 w-5 text-stone-400" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{recent.map((item) => <button key={item.title} className="flex items-center gap-3 rounded-xl border border-stone-100 p-3 text-left transition hover:border-violet-100 hover:bg-violet-50/30"><div className={cn("grid h-9 w-9 place-items-center rounded-lg", item.color)}><FileText className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-xs font-semibold text-stone-700">{item.title}</p><p className="mt-0.5 text-[10px] text-stone-400">{item.type} · Edited today</p></div></button>)}</div></div>
        </section>
      </div>
    </main>
  </div>;
}
