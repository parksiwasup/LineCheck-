import { formatDateISO } from "@/lib/utils";
import {
  getClassroomsAction,
  getDailyAttendanceAction,
} from "@/actions/attendance";
import { DailyCheckClient } from "@/components/attendance/daily-check-client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AttendanceCheckPage() {
  const session = await auth();
  const classrooms = await getClassroomsAction();

  let defaultClassroom = classrooms[0] ?? "ม.4/1";
  if (session?.user?.role === "TEACHER" && session.user.classrooms) {
    const assigned = session.user.classrooms
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (assigned.length > 0 && classrooms.includes(assigned[0])) {
      defaultClassroom = assigned[0];
    }
  }

  const todayIso = formatDateISO(new Date());
  const initialData = await getDailyAttendanceAction(defaultClassroom, todayIso);

  return (
    <DailyCheckClient
      initialClassrooms={classrooms}
      initialData={initialData}
      assignedClassrooms={session?.user?.classrooms ?? null}
      userRole={session?.user?.role ?? "TEACHER"}
    />
  );
}
