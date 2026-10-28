import { Metadata } from "next";
import { StudentPortalClient } from "@/components/portal/student-portal-client";

export const metadata: Metadata = {
  title: "ระบบตรวจสอบเวลาเข้าแถวและแก้กิจกรรม | LineCheck+ Student Portal",
  description:
    "ตรวจสอบเปอร์เซ็นต์เวลาเข้าแถวหน้าเสาธง ประวัติวันที่ขาด และจำนวนชั่วโมงจิตอาสาที่ต้องแก้แถวสำหรับนักเรียนและผู้ปกครอง",
};

interface PortalPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialStudentId = resolvedSearchParams.id || "";

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6">
      <StudentPortalClient initialStudentId={initialStudentId} />
    </div>
  );
}
