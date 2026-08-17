"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { calendarItems, categories, users } from "@/db/schema";

export type CalendarKind = "task" | "reminder";

export type CalendarItemRecord = {
  id: number;
  title: string;
  notes: string | null;
  kind: CalendarKind;
  scheduledDate: string | null;
  scheduledTime: string | null;
  isDraft: boolean;
  categoryId: number | null;
};

export type CategoryRecord = { id: number; name: string; color: string; isBuiltIn: boolean };

const defaults = [
  { name: "Work", color: "#8b5cf6" },
  { name: "Personal", color: "#f97316" },
  { name: "Health", color: "#10b981" },
  { name: "Learning", color: "#0ea5e9" },
  { name: "Errands", color: "#ec4899" },
];

async function currentDbUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Please sign in to manage your calendar.");
  const existing = await db.query.users.findFirst({ where: eq(users.clerkUserId, userId) });
  if (existing) return existing;
  const clerkUser = await currentUser();
  const name = clerkUser ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || null : null;
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const [created] = await db.insert(users).values({ clerkUserId: userId, name, email, imageUrl: clerkUser?.imageUrl ?? null }).returning();
  return created;
}

async function seedCategories(userId: number) {
  for (const category of defaults) {
    await db.insert(categories).values({ userId, ...category, isBuiltIn: true }).onConflictDoNothing();
  }
}

export async function getCalendarData() {
  const user = await currentDbUser();
  await seedCategories(user.id);
  const [itemRows, categoryRows] = await Promise.all([
    db.select().from(calendarItems).where(eq(calendarItems.userId, user.id)).orderBy(calendarItems.scheduledDate, calendarItems.scheduledTime, calendarItems.createdAt),
    db.select().from(categories).where(eq(categories.userId, user.id)).orderBy(categories.isBuiltIn, categories.name),
  ]);
  return {
    items: itemRows.map((item): CalendarItemRecord => ({ ...item, kind: item.kind as CalendarKind })),
    categories: categoryRows.map((category): CategoryRecord => ({ id: category.id, name: category.name, color: category.color, isBuiltIn: category.isBuiltIn })),
  };
}

export async function createCalendarItem(input: { title: string; notes?: string; kind: CalendarKind; scheduledDate?: string | null; scheduledTime?: string | null; categoryId?: number | null; isDraft?: boolean }) {
  const user = await currentDbUser();
  const title = input.title.trim();
  if (!title) throw new Error("A title is required.");
  if (input.categoryId) {
    const category = await db.query.categories.findFirst({ where: and(eq(categories.id, input.categoryId), eq(categories.userId, user.id)) });
    if (!category) throw new Error("Invalid category.");
  }
  const [item] = await db.insert(calendarItems).values({
    userId: user.id, title, notes: input.notes?.trim() || null, kind: input.kind,
    scheduledDate: input.isDraft ? null : input.scheduledDate || null,
    scheduledTime: input.isDraft ? null : input.scheduledTime || null,
    categoryId: input.categoryId || null, isDraft: Boolean(input.isDraft),
  }).returning();
  return { ...item, kind: item.kind as CalendarKind } satisfies CalendarItemRecord;
}

export async function moveCalendarItem(id: number, scheduledDate: string | null) {
  const user = await currentDbUser();
  const [item] = await db.update(calendarItems).set({ scheduledDate, isDraft: !scheduledDate, updatedAt: new Date() }).where(and(eq(calendarItems.id, id), eq(calendarItems.userId, user.id))).returning();
  if (!item) throw new Error("Calendar item not found.");
  return { ...item, kind: item.kind as CalendarKind } satisfies CalendarItemRecord;
}

export async function updateCalendarItem(id: number, input: { title: string; notes?: string; kind: CalendarKind; scheduledDate?: string | null; scheduledTime?: string | null; categoryId?: number | null; isDraft?: boolean }) {
  const user = await currentDbUser();
  const title = input.title.trim();
  if (!title) throw new Error("A title is required.");
  if (input.categoryId) {
    const category = await db.query.categories.findFirst({ where: and(eq(categories.id, input.categoryId), eq(categories.userId, user.id)) });
    if (!category) throw new Error("Invalid category.");
  }
  const isDraft = Boolean(input.isDraft);
  const [item] = await db.update(calendarItems).set({
    title, notes: input.notes?.trim() || null, kind: input.kind, categoryId: input.categoryId || null,
    scheduledDate: isDraft ? null : input.scheduledDate || null,
    scheduledTime: isDraft ? null : input.scheduledTime || null,
    isDraft, updatedAt: new Date(),
  }).where(and(eq(calendarItems.id, id), eq(calendarItems.userId, user.id))).returning();
  if (!item) throw new Error("Calendar item not found.");
  return { ...item, kind: item.kind as CalendarKind } satisfies CalendarItemRecord;
}

export async function deleteCalendarItem(id: number) {
  const user = await currentDbUser();
  await db.delete(calendarItems).where(and(eq(calendarItems.id, id), eq(calendarItems.userId, user.id)));
}

export async function createCategory(input: { name: string; color: string }) {
  const user = await currentDbUser();
  const name = input.name.trim();
  if (!name) throw new Error("A category name is required.");
  const [category] = await db.insert(categories).values({ userId: user.id, name, color: input.color, isBuiltIn: false }).returning();
  return { id: category.id, name: category.name, color: category.color, isBuiltIn: category.isBuiltIn } satisfies CategoryRecord;
}

export async function updateCategory(id: number, input: { name: string; color: string }) {
  const user = await currentDbUser();
  const [category] = await db.update(categories).set({ name: input.name.trim(), color: input.color, updatedAt: new Date() }).where(and(eq(categories.id, id), eq(categories.userId, user.id))).returning();
  if (!category) throw new Error("Category not found.");
  return { id: category.id, name: category.name, color: category.color, isBuiltIn: category.isBuiltIn } satisfies CategoryRecord;
}

export async function deleteCategory(id: number) {
  const user = await currentDbUser();
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, user.id)));
}
