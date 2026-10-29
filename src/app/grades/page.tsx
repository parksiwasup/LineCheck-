import { Metadata } from "next";
import { getGradeEvaluationDataAction } from "@/actions/grades";
import { GradesEvaluationClient } from "@/components/grades/grades-evaluation-client";

export const metadata: Metadata = {
  title: "ระบบประเมินผลและตัดเกรดกิจกรรมเข้าแถว (ผ./มผ.) | LineCheck+",
  description:
    "สรุปผลการตัดสินเกรดกิจกรรมเข้าแถวหน้าเสาธงตามระเบียบกระทรวงศึกษาธิการ สำหรับส่งฝ่ายทะเบียนวัดผล (ปพ.5)",
};

interface GradesPageProps {
  searchParams: Promise<{ classroom?: string; rate?: string }>;
}

export default async function GradesPage({ searchParams }: GradesPageProps) {
  const resolvedSearchParams = await searchParams;
  const classroom = resolvedSearchParams.classroom || "ALL";
  const rate = resolvedSearchParams.rate ? Number(resolvedSearchParams.rate) : 80;

  const data = await getGradeEvaluationDataAction(classroom, rate);

  return (
    <div className="w-full">
      <GradesEvaluationClient initialData={data} />
    </div>
  );
}
