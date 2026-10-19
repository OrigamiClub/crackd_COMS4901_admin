import type { Profile } from "@/lib/data";

export function personName(profile: Profile | undefined | null) {
  if (!profile) return "Deleted user";
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  return name || profile.screen_name || "Unnamed user";
}

// A user's photo (or a hamster) and name, used in tables and leaderboards.
export default function Person({
  profile,
  size = "size-7",
}: {
  profile: Profile | undefined | null;
  size?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {profile?.profpic ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.profpic} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
      ) : (
        <span
          className={`${size} flex shrink-0 items-center justify-center rounded-full bg-foreground text-xs text-white`}
          aria-hidden
        >
          🐹
        </span>
      )}
      <span className="truncate">{personName(profile)}</span>
    </span>
  );
}
