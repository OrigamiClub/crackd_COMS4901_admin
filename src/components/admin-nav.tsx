"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/users", label: "Users", icon: "👥" },
  { href: "/cracks", label: "Cracks", icon: "🖼️" },
  { href: "/likes", label: "Likes", icon: "♥" },
];

// Section links for the admin sidebar, with the current section marked.
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto lg:flex-col">
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-foreground text-white"
                : "hover:bg-foreground/10"
            }`}
          >
            <span aria-hidden className="w-5 text-center">
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
