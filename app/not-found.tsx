import Link from "next/link";
import { AbulaStripe } from "@/components/AbulaStripe";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-24 text-center">
      <AbulaStripe className="mx-auto h-2 w-24 overflow-hidden rounded-full" />
      <h1 className="mt-6 font-display text-3xl">Not on the menu</h1>
      <p className="mt-2 text-muted">We couldn’t find that page.</p>
      <Link
        href="/"
        className="mt-8 inline-grid h-12 place-items-center rounded-full bg-brand px-6 font-bold text-ink"
      >
        See the menu
      </Link>
    </main>
  );
}
