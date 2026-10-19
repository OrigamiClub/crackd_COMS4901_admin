// Small chart pieces drawn with plain HTML and CSS, so the dashboard needs
// no chart library.

export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs font-medium tracking-wide uppercase opacity-75">{label}</p>
      <p className="text-3xl font-light tabular-nums text-title">{value}</p>
      {note && <p className="text-xs opacity-75">{note}</p>}
    </div>
  );
}

const weekday = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "narrow" });
const shortDate = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// One bar per day. Each bar's tooltip and screen-reader text gives the
// exact count.
export function DayBars({
  data,
  color,
  unit,
}: {
  data: { day: string; value: number }[];
  color: string;
  unit: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-32 items-end gap-1" role="list">
        {data.map((d) => (
          <div
            key={d.day}
            role="listitem"
            title={`${shortDate(d.day)}: ${d.value} ${unit}`}
            className="flex h-full flex-1 flex-col justify-end"
          >
            <span className="sr-only">{`${shortDate(d.day)}: ${d.value} ${unit}`}</span>
            <div
              className="min-h-0.5 rounded-t"
              style={{
                height: `${(d.value / max) * 100}%`,
                backgroundColor: d.value > 0 ? color : "rgb(0 0 0 / 0.1)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 text-center text-[10px] opacity-60" aria-hidden>
        {data.map((d) => (
          <span key={d.day} className="flex-1">
            {weekday(d.day)}
          </span>
        ))}
      </div>
      <figcaption className="text-xs opacity-75">
        {total} {unit} in the last {data.length} days
      </figcaption>
    </figure>
  );
}

// A labeled horizontal bar, `fraction` from 0 to 1.
export function Meter({
  fraction,
  color,
  label,
}: {
  fraction: number;
  color: string;
  label: string;
}) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10" title={label}>
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.round(fraction * 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}
