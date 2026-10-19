import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { loadAll } from "@/lib/data";
import { styleInfo } from "@/lib/humor-vocab";
import Person from "@/components/person";
import Notice from "@/components/notice";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });

// Every crack (the AI-captioned memes), newest first, with search.
export default async function CracksPage({ searchParams }: PageProps<"/cracks">) {
  const { supabase } = await requireAdmin();
  const { cracks, likes, profiles, traits } = await loadAll(supabase);
  const params = await searchParams;
  const q = params.q?.toString().trim() ?? "";

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const traitsById = new Map(traits.map((t) => [t.crack_id, t]));
  const likeCount = new Map<number, number>();
  for (const like of likes) likeCount.set(like.crack_id, (likeCount.get(like.crack_id) ?? 0) + 1);

  const shown = q
    ? cracks.filter((c) => (c.text ?? "").toLowerCase().includes(q.toLowerCase()))
    : cracks;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Cracks</h1>
          <p className="text-sm opacity-75">
            {cracks.length} AI-captioned memes. Create, edit or delete any of them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form className="flex gap-2" role="search">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search captions"
              aria-label="Search cracks by caption"
              className="h-10 rounded-full border border-black/15 bg-transparent px-4 text-sm dark:border-white/20"
            />
            <button type="submit" className="btn-secondary">
              Search
            </button>
          </form>
          <Link href="/cracks/new" className="btn-primary">
            + New crack
          </Link>
        </div>
      </header>

      <Notice value={params.notice?.toString()} />

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase opacity-75 dark:border-white/15">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Crack</th>
              <th scope="col" className="px-4 py-3 font-medium">Styles</th>
              <th scope="col" className="px-4 py-3 font-medium">Posted by</th>
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Likes</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((crack) => (
              <tr key={crack.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {crack.img_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={crack.img_url} alt="" className="size-12 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="size-12 shrink-0 rounded bg-black/10" />
                    )}
                    <span className="line-clamp-2 max-w-sm">{crack.text ?? "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(traitsById.get(crack.id)?.styles ?? []).map((key) => {
                      const style = styleInfo(key);
                      return style ? (
                        <span
                          key={key}
                          className="rounded-full px-2 py-0.5 text-xs whitespace-nowrap text-white"
                          style={{ backgroundColor: style.color }}
                        >
                          {style.label}
                        </span>
                      ) : null;
                    })}
                    {!traitsById.has(crack.id) && <span className="text-xs opacity-60">Not tagged yet</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Person profile={crack.creator_id ? profileById.get(crack.creator_id) : null} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{date(crack.created_at)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{likeCount.get(crack.id) ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/cracks/${crack.id}`} className="btn-outline inline-flex h-8">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center opacity-75">
                  {q ? `No captions match “${q}”.` : "No cracks yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
