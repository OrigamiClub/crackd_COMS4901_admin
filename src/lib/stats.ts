import { STYLES, TOPICS } from "@/lib/humor-vocab";
import type { AllData, CaptionOption, Crack, Profile } from "@/lib/data";

const TIME_ZONE = "America/New_York";

// "2026-10-19" in New York time, so a day's bars match the campus day.
export function dayKey(iso: string | Date) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

function lastDays(count: number) {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }
  return days;
}

function countByDay(dates: string[], days: string[]) {
  const counts = new Map(days.map((day) => [day, 0]));
  for (const date of dates) {
    const day = dayKey(date);
    if (counts.has(day)) counts.set(day, counts.get(day)! + 1);
  }
  return days.map((day) => ({ day, value: counts.get(day)! }));
}

function optionStyle(option: CaptionOption | string) {
  return typeof option === "string" ? null : option.style;
}

export function computeStats({ profiles, cracks, likes, captionRequests, traits }: AllData) {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const crackById = new Map(cracks.map((c) => [c.id, c]));
  const likesByCrack = new Map<number, number>();
  for (const like of likes) {
    likesByCrack.set(like.crack_id, (likesByCrack.get(like.crack_id) ?? 0) + 1);
  }

  // Headline numbers.
  const answered = captionRequests.filter((r) => r.options && r.options.length > 0);
  const used = captionRequests.filter((r) => r.chosen_index !== null);
  const steered = captionRequests.filter((r) => r.direction);
  const activeLikers = new Set(likes.map((l) => l.liker)).size;

  // The last two weeks, day by day.
  const days = lastDays(14);
  const activity = {
    likes: countByDay(likes.map((l) => l.liked_at), days),
    cracks: countByDay(cracks.map((c) => c.created_at), days),
    generations: countByDay(captionRequests.map((r) => r.created_at), days),
  };

  // Which humor style wins when Gemini offers three: how often each style
  // is offered, and how often the poster picks it.
  const offered = new Map<string, number>();
  const chosen = new Map<string, number>();
  for (const request of captionRequests) {
    if (!request.options || request.chosen_index === null) continue;
    request.options.forEach((option, index) => {
      const style = optionStyle(option);
      if (!style) return;
      offered.set(style, (offered.get(style) ?? 0) + 1);
      if (index === request.chosen_index) {
        chosen.set(style, (chosen.get(style) ?? 0) + 1);
      }
    });
  }

  // Which style earns the most likes once it's on the board.
  const styleCracks = new Map<string, number>();
  const styleLikes = new Map<string, number>();
  for (const trait of traits) {
    for (const style of trait.styles) {
      styleCracks.set(style, (styleCracks.get(style) ?? 0) + 1);
      styleLikes.set(style, (styleLikes.get(style) ?? 0) + (likesByCrack.get(trait.crack_id) ?? 0));
    }
  }

  const styles = STYLES.map((style) => {
    const timesOffered = offered.get(style.key) ?? 0;
    const timesChosen = chosen.get(style.key) ?? 0;
    const onBoard = styleCracks.get(style.key) ?? 0;
    return {
      ...style,
      offered: timesOffered,
      chosen: timesChosen,
      pickRate: timesOffered > 0 ? timesChosen / timesOffered : null,
      cracks: onBoard,
      likesPerCrack: onBoard > 0 ? (styleLikes.get(style.key) ?? 0) / onBoard : null,
    };
  })
    .filter((s) => s.offered > 0 || s.cracks > 0)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1) || b.cracks - a.cracks);

  // What the board jokes about, and in what style: style x topic counts.
  const usedStyles = STYLES.filter((s) => styleCracks.has(s.key));
  const usedTopics = TOPICS.filter((t) => traits.some((tr) => tr.topics.includes(t.key)));
  const heatmap = usedStyles.map((style) => ({
    style,
    cells: usedTopics.map((topic) => ({
      topic,
      value: traits.filter(
        (tr) => tr.styles.includes(style.key) && tr.topics.includes(topic.key)
      ).length,
    })),
  }));
  const heatmapMax = Math.max(1, ...heatmap.flatMap((row) => row.cells.map((c) => c.value)));

  // People.
  const topCracks = [...cracks]
    .map((crack) => ({ crack, likes: likesByCrack.get(crack.id) ?? 0 }))
    .filter((c) => c.likes > 0)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5);

  const tally = (ids: (string | null)[]) => {
    const counts = new Map<string, number>();
    for (const id of ids) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()]
      .map(([id, value]) => ({ profile: profileById.get(id), id, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };
  const topCreators = tally(
    likes.map((l) => crackById.get(l.crack_id)?.creator_id ?? null)
  );
  const topLikers = tally(likes.map((l) => l.liker));

  // Taste twins: the two people who liked the most of the same cracks.
  const likersByCrack = new Map<number, string[]>();
  for (const like of likes) {
    likersByCrack.set(like.crack_id, [...(likersByCrack.get(like.crack_id) ?? []), like.liker]);
  }
  const pairCounts = new Map<string, number>();
  for (const likers of likersByCrack.values()) {
    const sorted = [...likers].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}|${sorted[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }
  const twinsEntry = [...pairCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const twins = twinsEntry
    ? {
        a: profileById.get(twinsEntry[0].split("|")[0]),
        b: profileById.get(twinsEntry[0].split("|")[1]),
        shared: twinsEntry[1],
      }
    : null;

  return {
    totals: {
      users: profiles.length,
      cracks: cracks.length,
      likes: likes.length,
      activeLikers,
      generations: captionRequests.length,
      answered: answered.length,
      used: used.length,
      steered: steered.length,
      untagged: cracks.length - traits.length,
    },
    activity,
    styles,
    heatmap,
    heatmapMax,
    usedTopics,
    topCracks,
    topCreators,
    topLikers,
    twins,
  };
}

export type Person = Profile | undefined;
export type RankedCrack = { crack: Crack; likes: number };
