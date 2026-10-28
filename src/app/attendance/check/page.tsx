import { formatDateISO } from "@/lib/utils";
import {
  getClassroomsAction,
  getDailyAttendanceAction,
} from "@/actions/attendance";
import { DailyCheckClient } from "@/components/attendance/daily-check-client";

export const dynamic = "force-dynamic";

export default async function AttendanceCheckPage() {
  const classrooms = await getClassroomsAction();
  const defaultClassroom = classrooms[0] ?? "ม.4/1";
  const todayIso = formatDateISO(new Date());

  const initialData = await getDailyAttendanceAction(defaultClassroom, todayIso);

  return (
    <DailyCheckClient
      initialClassrooms={classrooms}
      initialData={initialData}
    />
  );
}
