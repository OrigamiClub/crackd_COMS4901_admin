"use client";

import { useFormStatus } from "react-dom";

// Asks before deleting, since a deleted crack (and its likes) can't be
// brought back.
export default function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Delete this crack and all its likes? This can't be undone.")) {
          e.preventDefault();
        }
      }}
      className="btn border-red-700 text-red-700 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete crack"}
    </button>
  );
}
