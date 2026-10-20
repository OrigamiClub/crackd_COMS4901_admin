import { requireAdmin } from "@/lib/admin";
import { loadAll } from "@/lib/data";
import Person, { personName } from "@/components/person";
import Notice from "@/components/notice";
import { setAdmin } from "./actions";
import AdminToggle from "./admin-toggle";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

// Every profile with what they've done on the board. Profiles belong to
// their users, so the only change admins can make is granting or removing
// admin status.
export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const { supabase, user } = await requireAdmin();
  const { profiles, cracks, likes, captionRequests } = await loadAll(supabase);
  const params = await searchParams;
  const q = params.q?.toString().trim().toLowerCase() ?? "";

  const crackOwner = new Map(cracks.map((c) => [c.id, c.creator_id]));
  const count = (ids: (string | null | undefined)[]) => {
    const counts = new Map<string, number>();
    for (const id of ids) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  };
  const posted = count(cracks.map((c) => c.creator_id));
  const given = count(likes.map((l) => l.liker));
  const received = count(likes.map((l) => crackOwner.get(l.crack_id)));
  const batches = count(captionRequests.map((r) => r.user_id));

  const shown = profiles.filter((p) =>
    q
      ? `${personName(p)} ${p.screen_name ?? ""}`.toLowerCase().includes(q)
      : true
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="text-sm opacity-75">
            {profiles.length} {profiles.length === 1 ? "profile" : "profiles"} ·{" "}
            {profiles.filter((p) => p.is_superadmin).length} admins
          </p>
        </div>
        <form className="flex gap-2" role="search">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            aria-label="Search users by name"
            className="h-10 rounded-full border border-black/15 bg-transparent px-4 text-sm dark:border-white/20"
          />
          <button type="submit" className="btn-secondary">
            Search
          </button>
        </form>
      </header>

      <Notice value={params.notice?.toString()} />

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase opacity-75 dark:border-white/15">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">User</th>
              <th scope="col" className="px-4 py-3 font-medium">Joined</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Cracks posted</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Likes given</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Likes received</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">AI batches</th>
              <th scope="col" className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="px-4 py-3">
                  <Person profile={p} size="size-8" />
                  {p.screen_name && <p className="ml-10 text-xs opacity-60">@{p.screen_name}</p>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{date(p.created_at)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{posted.get(p.id) ?? 0}</td>
                <td className="px-4 py-3 text-right tabular-nums">{given.get(p.id) ?? 0}</td>
                <td className="px-4 py-3 text-right tabular-nums">{received.get(p.id) ?? 0}</td>
                <td className="px-4 py-3 text-right tabular-nums">{batches.get(p.id) ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    {p.is_superadmin ? (
                      <span className="rounded-full bg-title px-2 py-0.5 text-xs font-medium text-white">Admin</span>
                    ) : (
                      <span className="text-xs opacity-60">Member</span>
                    )}
                    {p.id === user.id ? (
                      <span className="text-xs opacity-60">You</span>
                    ) : (
                      <form action={setAdmin}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <input type="hidden" name="make_admin" value={String(!p.is_superadmin)} />
                        <AdminToggle name={personName(p)} isAdmin={p.is_superadmin} />
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center opacity-75">
                  No users match “{q}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
