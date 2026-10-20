// One-line confirmation after a change redirects back
// with ?notice=...
const MESSAGES: Record<string, { text: string; error?: boolean }> = {
  created: { text: "Crack posted." },
  updated: { text: "Changes saved." },
  deleted: { text: "Crack deleted." },
  "admin-granted": { text: "Admin access granted." },
  "admin-removed": { text: "Admin access removed." },
  "admin-failed": { text: "Couldn't change admin status. Is the latest admin migration applied?", error: true },
  "tags-saved": { text: "Tags saved." },
  "tags-cleared": { text: "Tags cleared. The meme board will ask Gemini to tag this crack again." },
  "tags-failed": { text: "Couldn't save the tags. Is the latest admin migration applied?", error: true },
  "delete-failed": { text: "Couldn't delete that crack. Is the admin migration applied?", error: true },
};

export default function Notice({ value }: { value: string | undefined }) {
  const message = value ? MESSAGES[value] : undefined;
  if (!message) return null;

  return (
    <p
      role="status"
      className={`cascade-in rounded-lg px-4 py-3 text-sm ${
        message.error ? "bg-red-700/10 text-red-700" : "bg-sage/15 text-sage"
      }`}
    >
      {message.text}
    </p>
  );
}
