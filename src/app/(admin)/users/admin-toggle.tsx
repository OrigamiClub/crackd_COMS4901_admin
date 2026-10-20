"use client";

import { useFormStatus } from "react-dom";

// Make admin / Remove admin, confirmed first since admins can see and
// change everything.
export default function AdminToggle({
  name,
  isAdmin,
}: {
  name: string;
  isAdmin: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        const question = isAdmin
          ? `Remove admin access from ${name}?`
          : `Make ${name} an admin? They'll be able to see all users and edit or delete any crack.`;
        if (!confirm(question)) e.preventDefault();
      }}
      className={`${isAdmin ? "btn-outline" : "btn-secondary"} h-8 whitespace-nowrap disabled:opacity-60`}
    >
      {pending ? "Saving…" : isAdmin ? "Remove admin" : "Make admin"}
    </button>
  );
}
