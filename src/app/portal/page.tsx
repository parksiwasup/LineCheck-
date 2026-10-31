import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { StudentPortalClient } from "@/components/portal/student-portal-client";

export const metadata: Metadata = {
  title: "ระบบตรวจสอบเวลาเข้าแถวและแก้กิจกรรม | LineCheck+ Student Portal",
  description:
    "ตรวจสอบเปอร์เซ็นต์เวลาเข้าแถวหน้าเสาธง ประวัติวันที่ขาด และคลินิกแก้แถวสำหรับนักเรียนและผู้ปกครอง",
};

interface PortalPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialStudentId = resolvedSearchParams.id || "";

  // ดึงรหัสนักเรียนจริงจากฐานข้อมูลเพื่อนำมาเป็นตัวอย่างรหัสคลิกด่วน
  const students = await prisma.student.findMany({
    take: 4,
    orderBy: { studentId: "asc" },
    select: { studentId: true },
  });
  const sampleIds = students.length > 0
    ? students.map((s) => s.studentId)
    : ["68219100001", "68219100002", "68219100003", "68219100005"];

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6">
      <StudentPortalClient initialStudentId={initialStudentId} sampleIds={sampleIds} />
    </div>
  );
}
