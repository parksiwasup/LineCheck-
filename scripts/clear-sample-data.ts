import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearSampleData() {
  console.log("🧹 กำลังดำเนินการลบข้อมูลตัวอย่าง (นักเรียน, การเช็คชื่อ, และการแก้แถว)...");

  const [delAttendance, delRemedial, delStudents] = await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({}),
    prisma.remedialRecord.deleteMany({}),
    prisma.student.deleteMany({}),
  ]);

  console.log(`✅ ลบประวัติการเช็คชื่อเรียบร้อย: ${delAttendance.count} รายการ`);
  console.log(`✅ ลบประวัติการแก้แถวเรียบร้อย: ${delRemedial.count} รายการ`);
  console.log(`✅ ลบข้อมูลนักเรียนตัวอย่างเรียบร้อย: ${delStudents.count} คน`);

  const remainingUsers = await prisma.user.count();
  console.log(`ℹ️ คงเหลือบัญชีผู้ดูแล/ครูผู้สอนสำหรับเข้าสู่ระบบ: ${remainingUsers} บัญชี`);
  console.log("🎉 ฐานข้อมูลนักเรียนว่างเรียบร้อย 100% พร้อมสำหรับการนำเข้าไฟล์ Excel จริง!");
}

clearSampleData()
  .catch((err) => {
    console.error("❌ เกิดข้อผิดพลาดในการลบข้อมูล:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
