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
  const allClassrooms = await getClassroomsAction();

  let allowedClassrooms = allClassrooms;
  if (session?.user?.role === "TEACHER" && session.user.classrooms?.trim()) {
    const assigned = session.user.classrooms
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (assigned.length > 0) {
      allowedClassrooms = allClassrooms.filter((c) => assigned.includes(c));
      if (allowedClassrooms.length === 0) {
        allowedClassrooms = assigned;
      }
    }
  }

  let defaultClassroom = allowedClassrooms[0] ?? "ม.4/1";
  const todayIso = formatDateISO(new Date());
  const initialData = await getDailyAttendanceAction(defaultClassroom, todayIso);

  return (
    <DailyCheckClient
      initialClassrooms={allowedClassrooms}
      initialData={initialData}
      assignedClassrooms={session?.user?.classrooms ?? null}
      userRole={session?.user?.role ?? "TEACHER"}
    />
  );
}
