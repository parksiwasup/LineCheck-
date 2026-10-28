import { getAdminBackofficeDataAction } from "@/actions/admin";
import { AdminBackofficeClient } from "@/components/admin/admin-backoffice-client";

export const dynamic = "force-dynamic";

export default async function AdminBackofficePage() {
  const initialData = await getAdminBackofficeDataAction();

  return <AdminBackofficeClient initialData={initialData} />;
}
