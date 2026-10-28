import { getDashboardAnalyticsAction } from "@/actions/dashboard";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const analyticsData = await getDashboardAnalyticsAction();

  return <DashboardClient data={analyticsData} />;
}
