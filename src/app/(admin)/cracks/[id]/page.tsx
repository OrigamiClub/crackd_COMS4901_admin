import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { styleInfo, TOPICS } from "@/lib/humor-vocab";
import Person from "@/components/person";
import Notice from "@/components/notice";
import type { Profile } from "@/lib/data";
import CrackForm from "../crack-form";
import DeleteButton from "../delete-button";
import { deleteCrack } from "../actions";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

// One crack: edit its image and caption, see who liked it, or delete it.
export default async function CrackPage({ params, searchParams }: PageProps<"/cracks/[id]">) {
  const { supabase } = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [{ data: crack }, { data: likes }, { data: traits }] = await Promise.all([
    supabase.from("cracks").select("id, created_at, img_url, text, creator_id").eq("id", id).maybeSingle(),
    supabase.from("likes").select("liker, liked_at").eq("crack_id", id).order("liked_at", { ascending: false }),
    supabase.from("crack_traits").select("styles, topics").eq("crack_id", id).maybeSingle(),
  ]);
  if (!crack) notFound();

  const peopleIds = [...new Set([crack.creator_id, ...(likes ?? []).map((l) => l.liker)].filter(Boolean))];
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

        <div className="card flex flex-col gap-3">
          <h2 className="section-title">Gemini&apos;s tags</h2>
          {traits ? (
            <div className="flex flex-wrap gap-1">
              {traits.styles.map((key: string) => {
                const style = styleInfo(key);
                return style ? (
                  <span key={key} className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: style.color }}>
                    {style.label}
                  </span>
                ) : null;
              })}
              {traits.topics.map((key: string) => (
                <span key={key} className="rounded-full border border-black/15 px-2 py-0.5 text-xs dark:border-white/20">
                  {TOPICS.find((t) => t.key === key)?.label ?? key}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-75">Not tagged yet. The meme board tags new cracks in the background.</p>
          )}
          <div className="mt-auto border-t border-black/10 pt-4 dark:border-white/15">
            <form action={deleteCrack}>
              <input type="hidden" name="id" value={crack.id} />
              <DeleteButton />
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
