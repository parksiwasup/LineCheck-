import { getClassroomsAction } from "@/actions/attendance";
import { getDeficitReportAction } from "@/actions/remedial";
import { RemedialManagementClient } from "@/components/attendance/remedial-management-client";

export const dynamic = "force-dynamic";

export default async function RemedialReportPage() {
  const [classrooms, initialReport] = await Promise.all([
    getClassroomsAction(),
    getDeficitReportAction(),
  ]);

  return (
    <RemedialManagementClient
      classrooms={classrooms}
      initialReport={initialReport}
    />
  );
}
