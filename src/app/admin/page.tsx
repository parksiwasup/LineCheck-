import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminBackofficeDataAction } from "@/actions/admin";
import { AdminBackofficeClient } from "@/components/admin/admin-backoffice-client";

export const dynamic = "force-dynamic";

export default async function AdminBackofficePage() {
  const session = await auth();

  // Route protection: requires authenticated session with ADMIN role
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard?error=admin_only");
  }

  const initialData = await getAdminBackofficeDataAction();

  return <AdminBackofficeClient initialData={initialData} />;
}
