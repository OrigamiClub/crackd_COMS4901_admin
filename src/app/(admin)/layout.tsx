import AdminNav from "@/components/admin-nav";
import { fullName, requireAdmin } from "@/lib/admin";

const MAIN_APP_URL =
  process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "https://crackd-coms-4901.vercel.app";

// Shell for every admin page: a sidebar with the sections and the signed-in
// admin, and the page on the right. Checks admin access itself, so the
// pages don't depend on the proxy alone.
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const { user, profile } = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="flex flex-col gap-6 border-b border-black/10 bg-foreground/5 p-5 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0 dark:border-white/15">
        <div>
          <p className="text-xl leading-tight font-light tracking-tight text-title">
            crackd admin
          </p>
          <a
            href={MAIN_APP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Open the meme board ↗
          </a>
        </div>
        <AdminNav />
        <div className="flex flex-col gap-3 lg:mt-auto">
          <div className="flex items-center gap-2 text-sm">
            {profile.profpic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profpic} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-white">
                🐹
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{fullName(profile)}</p>
              <p className="truncate text-xs opacity-75">{user.email}</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn-outline w-full">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-8 p-5 lg:p-10">{children}</main>
    </div>
  );
}
