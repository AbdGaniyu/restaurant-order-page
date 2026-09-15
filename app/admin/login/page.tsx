import { AbulaStripe } from "@/components/AbulaStripe";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <AbulaStripe className="h-2 w-24 overflow-hidden rounded-full" />
      <h1 className="mt-6 font-display text-3xl">Menu admin</h1>
      <p className="mt-2 text-muted">Edit your menu, prices and hours, and see orders.</p>
      <LoginForm linkFailed={error === "link"} />
    </main>
  );
}
