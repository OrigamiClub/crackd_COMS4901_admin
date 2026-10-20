import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { STYLES, TOPICS } from "@/lib/humor-vocab";
import Person, { personName } from "@/components/person";
import Notice from "@/components/notice";
import type { Profile } from "@/lib/data";
import CrackForm from "../crack-form";
import DeleteButton from "../delete-button";
import { clearTags, deleteCrack, saveTags } from "../actions";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

// One crack: edit its image, caption and humor tags, see who liked it, or
// delete it.
export default async function CrackPage({ params, searchParams }: PageProps<"/cracks/[id]">) {
  const { supabase } = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [{ data: crack }, { data: likes }, { data: traits }] = await Promise.all([
    supabase.from("cracks").select("id, created_at, img_url, text, creator_id").eq("id", id).maybeSingle(),
    supabase.from("likes").select("liker, liked_at").eq("crack_id", id).order("liked_at", { ascending: false }),
    supabase.from("crack_traits").select("styles, topics, edited_by").eq("crack_id", id).maybeSingle(),
  ]);
  if (!crack) notFound();

  const peopleIds = [
    ...new Set(
      [crack.creator_id, traits?.edited_by, ...(likes ?? []).map((l) => l.liker)].filter(Boolean)
    ),
  ];
  const styles: string[] = traits?.styles ?? [];
  const topics: string[] = traits?.topics ?? [];
  const { data: people } = await supabase
    .from("profiles")
    .select("id, created_at, first_name, last_name, screen_name, profpic, is_superadmin")
    .in("id", peopleIds);
  const byId = new Map((people as Profile[] | null ?? []).map((p) => [p.id, p]));

  return (
    <>
      <header>
        <Link href="/cracks" className="text-sm underline opacity-75 hover:opacity-100">
          ← All cracks
        </Link>
        <h1 className="page-title">Crack #{crack.id}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm opacity-75">
          <span>Posted by</span>
          <Person profile={crack.creator_id ? byId.get(crack.creator_id) : null} size="size-5" />
          <span>· {dateTime(crack.created_at)}</span>
        </div>
      </header>

      <Notice value={(await searchParams).notice?.toString()} />

      <CrackForm crack={crack} />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col gap-3">
          <h2 className="section-title">
            Likes ({likes?.length ?? 0})
          </h2>
          {likes && likes.length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm">
              {likes.map((like) => (
                <li key={like.liker} className="flex items-center justify-between gap-3">
                  <Person profile={byId.get(like.liker)} />
                  <span className="text-xs whitespace-nowrap opacity-75">{dateTime(like.liked_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-75">No likes yet.</p>
          )}
        </div>

        <form action={saveTags} className="card flex flex-col gap-4">
          <input type="hidden" name="id" value={crack.id} />
          <div>
            <h2 className="section-title">Humor tags</h2>
            <p className="text-xs opacity-75">
              {!traits
                ? "Not tagged yet. Pick tags here, or let the meme board ask Gemini in the background."
                : traits.edited_by
                  ? `Edited by hand by ${personName(byId.get(traits.edited_by))}. Gemini won't overwrite these.`
                  : "Tagged by Gemini. Fix them here; hand-edited tags are kept."}
            </p>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium uppercase opacity-75">Styles</legend>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((style) => (
                <label
                  key={style.key}
                  style={{ "--chip": style.color } as React.CSSProperties}
                  className="cursor-pointer rounded-full border border-black/15 px-3 py-1 text-xs transition-colors select-none has-[:checked]:border-[var(--chip)] has-[:checked]:bg-[var(--chip)] has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-title dark:border-white/20"
                >
                  <input
                    type="checkbox"
                    name="styles"
                    value={style.key}
                    defaultChecked={styles.includes(style.key)}
                    className="sr-only"
                  />
                  {style.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium uppercase opacity-75">Topics</legend>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => (
                <label
                  key={topic.key}
                  className="cursor-pointer rounded-full border border-black/15 px-3 py-1 text-xs transition-colors select-none has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-title dark:border-white/20"
                >
                  <input
                    type="checkbox"
                    name="topics"
                    value={topic.key}
                    defaultChecked={topics.includes(topic.key)}
                    className="sr-only"
                  />
                  {topic.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-auto flex flex-wrap gap-2">
            <button type="submit" className="btn-secondary">
              Save tags
            </button>
            {traits && (
              <button type="submit" formAction={clearTags} className="btn-outline">
                Clear and let Gemini re-tag
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 border-red-700/30">
        <div>
          <h2 className="section-title">Delete this crack</h2>
          <p className="text-xs opacity-75">Removes it from the board along with its likes. This can&apos;t be undone.</p>
        </div>
        <form action={deleteCrack}>
          <input type="hidden" name="id" value={crack.id} />
          <DeleteButton />
        </form>
      </section>
    </>
  );
}
