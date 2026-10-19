import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import CrackForm from "../crack-form";

export default async function NewCrackPage() {
  await requireAdmin();

  return (
    <>
      <header>
        <Link href="/cracks" className="text-sm underline opacity-75 hover:opacity-100">
          ← All cracks
        </Link>
        <h1 className="page-title">New crack</h1>
        <p className="text-sm opacity-75">Posted under your name on the meme board.</p>
      </header>
      <CrackForm />
    </>
  );
}
