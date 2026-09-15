import { LoginForm } from "@/components/admin/LoginForm";
import { LogoTile } from "@/components/admin/ui";
import { displayUrl } from "@/lib/admin/format";
import { siteUrl } from "@/lib/site";

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error } = await searchParams;
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-admin-divider bg-accent-100 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <LogoTile name="Menu" logoUrl={null} size={36} />
          <span className="text-base font-extrabold">Menu admin</span>
        </div>
        <p className="max-w-[480px] text-[56px] leading-[1.05] font-extrabold tracking-[-0.02em]">
          Your menu.
          <br />
          Their WhatsApp.
          <br />
          <span className="text-accent">Zero commission.</span>
        </p>
        <p className="text-[13px] text-admin-muted">Admin · {displayUrl(siteUrl())}</p>
      </div>
      <div className="px-5 pt-12 pb-8 lg:grid lg:place-items-center lg:p-10">
        <div className="w-full lg:w-[400px]">
          <LoginForm linkFailed={error === "link"} />
        </div>
      </div>
    </main>
  );
}
