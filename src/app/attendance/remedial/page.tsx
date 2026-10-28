import { getClassroomsAction } from "@/actions/attendance";
import { getDeficitReportAction } from "@/actions/remedial";
import { RemedialManagementClient } from "@/components/attendance/remedial-management-client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RemedialReportPage() {
  const session = await auth();
  const [classrooms, initialReport] = await Promise.all([
    getClassroomsAction(),
    getDeficitReportAction(),
  ]);

  return (
    <RemedialManagementClient
      classrooms={classrooms}
      initialReport={initialReport}
      currentUser={
        session?.user
          ? {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              role: session.user.role,
              classrooms: session.user.classrooms,
            }
          : null
      }
    />
  );
}
