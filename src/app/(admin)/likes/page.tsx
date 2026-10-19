import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { loadAll } from "@/lib/data";
import Person from "@/components/person";

const PAGE_SIZE = 50;

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

// Every like (the board's only kind of vote), newest first. Read-only:
// likes belong to the people who gave them.
export default async function LikesPage({ searchParams }: PageProps<"/likes">) {
  const { supabase } = await requireAdmin();
  const { likes, cracks, profiles } = await loadAll(supabase);
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const crackById = new Map(cracks.map((c) => [c.id, c]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const pages = Math.max(1, Math.ceil(likes.length / PAGE_SIZE));
  const shown = likes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selfLikes = likes.filter((l) => crackById.get(l.crack_id)?.creator_id === l.liker).length;

  return (
    <>
      <header>
        <h1 className="page-title">Likes</h1>
        <p className="text-sm opacity-75">
          {likes.length} likes from {new Set(likes.map((l) => l.liker)).size} people ·{" "}
          {selfLikes} on their own cracks · read-only
        </p>
      </header>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase opacity-75 dark:border-white/15">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Who</th>
              <th scope="col" className="px-4 py-3 font-medium">Liked</th>
              <th scope="col" className="px-4 py-3 font-medium">Posted by</th>
              <th scope="col" className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((like) => {
              const crack = crackById.get(like.crack_id);
              return (
                <tr key={`${like.crack_id}-${like.liker}`} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className="px-4 py-3">
                    <Person profile={profileById.get(like.liker)} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/cracks/${like.crack_id}`} className="flex items-center gap-3 hover:underline">
                      {crack?.img_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={crack.img_url} alt="" className="size-10 shrink-0 rounded object-cover" />
                      )}
                      <span className="line-clamp-1 max-w-xs">{crack?.text ?? `Crack #${like.crack_id}`}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Person profile={crack?.creator_id ? profileById.get(crack.creator_id) : null} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{dateTime(like.liked_at)}</td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center opacity-75">No likes yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`/likes?page=${page - 1}`} className="btn-outline">← Newer</Link>
          )}
          <span>Page {page} of {pages}</span>
          {page < pages && (
            <Link href={`/likes?page=${page + 1}`} className="btn-outline">Older →</Link>
          )}
        </nav>
      )}
    </>
  );
}
