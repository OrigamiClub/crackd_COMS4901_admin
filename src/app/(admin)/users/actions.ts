"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

// Grants or removes admin status through set_superadmin(), which checks
// again in the database that the caller is an admin and isn't demoting
// themselves.
export async function setAdmin(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const target = formData.get("user_id")?.toString() ?? "";
  const makeAdmin = formData.get("make_admin") === "true";
  if (!target || target === user.id) {
    redirect("/users?notice=admin-failed");
  }

  const { error } = await supabase.rpc("set_superadmin", {
    target,
    make_admin: makeAdmin,
  });
  if (error) {
    console.error("Couldn't change admin status", error);
    redirect("/users?notice=admin-failed");
  }

  revalidatePath("/users");
  redirect(`/users?notice=${makeAdmin ? "admin-granted" : "admin-removed"}`);
}
