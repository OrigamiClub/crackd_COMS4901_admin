import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { loadAll } from "@/lib/data";
import { computeStats } from "@/lib/stats";
import { DayBars, Meter, StatCard } from "@/components/charts";
import Person, { personName } from "@/components/person";

const percent = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";

export default async function DashboardPage() {
  const { supabase } = await requireAdmin();
  const stats = computeStats(await loadAll(supabase));
  const { totals } = stats;
  const pickRated = stats.styles.filter((s) => s.pickRate !== null);
  const likeRated = [...stats.styles]
    .filter((s) => s.likesPerCrack !== null)
    .sort((a, b) => b.likesPerCrack! - a.likesPerCrack!);
  const maxLikesPerCrack = Math.max(0.01, ...likeRated.map((s) => s.likesPerCrack!));

  return (
    <>
      <header>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm opacity-75">
          How people use the board, and what the AI&apos;s jokes are doing.
        </p>
      </header>

      <section aria-label="Totals" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Users" value={totals.users} note={`${totals.activeLikers} have liked something`} />
        <StatCard label="Cracks" value={totals.cracks} note={`${totals.untagged} not yet tagged by Gemini`} />
        <StatCard
          label="Likes"
          value={totals.likes}
          note={`${totals.cracks > 0 ? (totals.likes / totals.cracks).toFixed(1) : 0} per crack`}
        />
        <StatCard
          label="AI caption batches"
          value={totals.generations}
          note={`${percent(totals.steered, totals.generations)} steered with a prompt`}
        />
        <StatCard
          label="AI → posted"
          value={percent(totals.used, totals.answered)}
          note={`${totals.used} of ${totals.answered} batches ended up on a crack`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card flex flex-col gap-3">
          <h2 className="section-title">Likes per day</h2>
          <DayBars data={stats.activity.likes} color="var(--title)" unit="likes" />
        </div>
        <div className="card flex flex-col gap-3">
          <h2 className="section-title">New cracks per day</h2>
          <DayBars data={stats.activity.cracks} color="var(--foreground)" unit="cracks" />
        </div>
        <div className="card flex flex-col gap-3">
          <h2 className="section-title">Gemini caption batches per day</h2>
          <DayBars data={stats.activity.generations} color="var(--sage)" unit="batches" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col gap-4">
          <div>
            <h2 className="section-title">Which AI humor style wins?</h2>
            <p className="text-xs opacity-75">
              Gemini offers three captions in different styles. This is how
              often posters pick each style when it&apos;s offered.
            </p>
          </div>
          {pickRated.length === 0 ? (
            <p className="text-sm opacity-75">No caption picks recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pickRated.map((s) => (
                <li key={s.key} className="grid grid-cols-[8rem_1fr_5.5rem] items-center gap-3 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <Meter
                    fraction={s.pickRate!}
                    color={s.color}
                    label={`${s.label}: picked ${s.chosen} of ${s.offered} times`}
                  />
                  <span className="text-right text-xs tabular-nums opacity-75">
                    {s.chosen} of {s.offered}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card flex flex-col gap-4">
          <div>
            <h2 className="section-title">Which style gets the most likes?</h2>
            <p className="text-xs opacity-75">
              Average likes per crack, by the styles Gemini tagged each crack with.
            </p>
          </div>
          {likeRated.length === 0 ? (
            <p className="text-sm opacity-75">No cracks tagged yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {likeRated.map((s) => (
                <li key={s.key} className="grid grid-cols-[8rem_1fr_5.5rem] items-center gap-3 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <Meter
                    fraction={s.likesPerCrack! / maxLikesPerCrack}
                    color={s.color}
                    label={`${s.label}: ${s.likesPerCrack!.toFixed(1)} likes per crack`}
                  />
                  <span className="text-right text-xs tabular-nums opacity-75">
                    {s.likesPerCrack!.toFixed(1)} · {s.cracks} {s.cracks === 1 ? "crack" : "cracks"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {stats.heatmap.length > 0 && (
        <section className="card flex flex-col gap-4">
          <div>
            <h2 className="section-title">What the board jokes about, and how</h2>
            <p className="text-xs opacity-75">
              Number of cracks for each humor style and topic, from Gemini&apos;s tags.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th scope="col" className="sr-only">Style</th>
                  {stats.usedTopics.map((topic) => (
                    <th key={topic.key} scope="col" className="max-w-24 px-1 pb-1 align-bottom font-medium">
                      {topic.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.heatmap.map((row) => (
                  <tr key={row.style.key}>
                    <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap">
                      {row.style.label}
                    </th>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.topic.key}
                        title={`${row.style.label} × ${cell.topic.label}: ${cell.value}`}
                        className="size-10 rounded text-center tabular-nums"
                        style={{
                          backgroundColor:
                            cell.value > 0
                              ? `color-mix(in srgb, ${row.style.color} ${20 + (cell.value / stats.heatmapMax) * 80}%, transparent)`
                              : "rgb(0 0 0 / 0.04)",
                          color: cell.value / stats.heatmapMax > 0.5 ? "white" : undefined,
                        }}
                      >
                        {cell.value || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card flex flex-col gap-3">
          <h2 className="section-title">Most liked cracks</h2>
          {stats.topCracks.length === 0 ? (
            <p className="text-sm opacity-75">No likes yet.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {stats.topCracks.map(({ crack, likes }) => (
                <li key={crack.id}>
                  <Link href={`/cracks/${crack.id}`} className="flex items-center gap-3 rounded-lg p-1 text-sm hover:bg-foreground/10">
                    {crack.img_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={crack.img_url} alt="" className="size-10 shrink-0 rounded object-cover" />
                    )}
                    <span className="line-clamp-2 flex-1">{crack.text ?? "Untitled"}</span>
                    <span className="text-xs whitespace-nowrap tabular-nums">♥ {likes}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="section-title">Funniest posters</h2>
          <p className="-mt-2 text-xs opacity-75">Likes received on their cracks</p>
          <Leaderboard rows={stats.topCreators} unit="likes" />
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="section-title">Most generous likers</h2>
          <Leaderboard rows={stats.topLikers} unit="likes" />
          {stats.twins && (
            <p className="mt-auto rounded-lg bg-foreground/10 p-3 text-xs">
              <span className="font-semibold">Taste twins:</span>{" "}
              {personName(stats.twins.a)} and {personName(stats.twins.b)} liked{" "}
              {stats.twins.shared} of the same {stats.twins.shared === 1 ? "crack" : "cracks"}.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function Leaderboard({
  rows,
  unit,
}: {
  rows: ReturnType<typeof computeStats>["topLikers"];
  unit: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm opacity-75">Nobody yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-2 text-sm">
      {rows.map((row, i) => (
        <li key={row.id} className="flex items-center gap-3">
          <span className="w-4 text-xs opacity-60">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <Person profile={row.profile} />
          </span>
          <span className="text-xs tabular-nums opacity-75">
            {row.value} {unit}
          </span>
        </li>
      ))}
    </ol>
  );
}
