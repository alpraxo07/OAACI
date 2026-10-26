import { requireStaffPage } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaffPage();
  return (
    <div className="min-h-dvh md:border-r md:border-border">
      <div className="sticky top-14 z-20 border-b border-border bg-bg/90 backdrop-blur md:top-0">
        <div className="flex h-14 items-center px-4">
          <h1 className="font-display text-xl font-semibold">Admin</h1>
          <span className="ml-2 rounded bg-primary-soft px-1.5 py-0.5 text-xs text-primary-text">{me.role === "ADMIN" ? "Admin" : "Moderator"}</span>
        </div>
        <AdminNav isAdmin={me.role === "ADMIN"} />
      </div>
      <div className="mx-auto max-w-5xl p-4">{children}</div>
    </div>
  );
}
