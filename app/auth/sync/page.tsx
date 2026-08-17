import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Persists the signed-in Clerk user without relying on a Clerk webhook.
 * Both sign-in and sign-up flows redirect here after authentication.
 */
export default async function SyncAuthenticatedUserPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const name = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ") || clerkUser.username || null;
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null;

  await db
    .insert(users)
    .values({
      clerkUserId: userId,
      name,
      email,
      imageUrl: clerkUser.imageUrl,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        name,
        email,
        imageUrl: clerkUser.imageUrl,
        updatedAt: new Date(),
      },
    });

  redirect("/");
}
