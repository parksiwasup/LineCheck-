import { Metadata } from "next";
import {
  getStudentsDirectoryForCalendarAction,
  getStudentMonthlyCalendarAction,
} from "@/actions/calendar";
import { CalendarPageClient } from "@/components/attendance/calendar-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ปฏิทินการเข้าแถวรายบุคคล | LineCheck+",
  description:
    "ดูปฏิทินการเข้าแถวรายเดือนของนักเรียนแต่ละคน พร้อมสถานะมาเรียน พักโควตา วันขาด และผลสรุปเกณฑ์รายสัปดาห์",
};

interface CalendarPageProps {
  searchParams: Promise<{ student?: string; year?: string; month?: string }>;
}

export default async function StudentCalendarPage({
  searchParams,
}: CalendarPageProps) {
  const params = await searchParams;
  const directory = await getStudentsDirectoryForCalendarAction();

  const initialStudentCode =
    params.student || directory.students[0]?.studentId || "";
  const parsedYear = params.year ? Number(params.year) : undefined;
  const parsedMonth = params.month ? Number(params.month) : undefined;

  const initialRes = initialStudentCode
    ? await getStudentMonthlyCalendarAction(
        initialStudentCode,
        parsedYear,
        parsedMonth
      )
    : null;

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6">
      <CalendarPageClient
        classrooms={directory.classrooms}
        students={directory.students}
        initialStudentCode={initialStudentCode}
        initialCalendarData={initialRes?.data ?? null}
      />
    </div>
  );
}
