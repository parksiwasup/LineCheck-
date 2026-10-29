import { PrismaClient, Role, StudentStatus, AttendanceStatus, RemedialStatus } from "@prisma/client";
import { subDays, startOfDay, isWeekend } from "date-fns";

const prisma = new PrismaClient();

function getPastSchoolDays(count: number): Date[] {
  const days: Date[] = [];
  let current = startOfDay(new Date());
  // Ensure we use UTC midnight so @db.Date matches consistently
  while (days.length < count) {
    if (!isWeekend(current)) {
      const utcDate = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
      days.push(utcDate);
    }
    current = subDays(current, 1);
  }
  return days.reverse();
}

async function main() {
  console.log("🌱 Starting database seed for LineCheck+...");

  // 1. Seed Users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@school.ac.th" },
    update: {
      name: "อ.ดร.เกรียงไกร ฝ่ายปกครอง",
      role: Role.ADMIN,
      classrooms: null,
      password: "password123",
    },
    create: {
      name: "อ.ดร.เกรียงไกร ฝ่ายปกครอง",
      email: "admin@school.ac.th",
      password: "password123",
      role: Role.ADMIN,
      classrooms: null,
    },
  });

  const teacher1User = await prisma.user.upsert({
    where: { email: "teacher1@school.ac.th" },
    update: {
      name: "ครูสมชาย ที่ปรึกษา (ดูแล ม.4/1, ม.4/2)",
      role: Role.TEACHER,
      classrooms: "ม.4/1,ม.4/2",
      password: "password123",
    },
    create: {
      name: "ครูสมชาย ที่ปรึกษา (ดูแล ม.4/1, ม.4/2)",
      email: "teacher1@school.ac.th",
      password: "password123",
      role: Role.TEACHER,
      classrooms: "ม.4/1,ม.4/2",
    },
  });

  const teacher2User = await prisma.user.upsert({
    where: { email: "teacher2@school.ac.th" },
    update: {
      name: "ครูวิภาดา ที่ปรึกษา (ดูแล ม.5/1, ม.6/1)",
      role: Role.TEACHER,
      classrooms: "ม.5/1,ม.6/1",
      password: "password123",
    },
    create: {
      name: "ครูวิภาดา ที่ปรึกษา (ดูแล ม.5/1, ม.6/1)",
      email: "teacher2@school.ac.th",
      password: "password123",
      role: Role.TEACHER,
      classrooms: "ม.5/1,ม.6/1",
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@school.ac.th" },
    update: {
      name: "ครูสมศรี ที่ปรึกษา (ดูแล ม.4/1)",
      role: Role.TEACHER,
      classrooms: "ม.4/1",
      password: "password123",
    },
    create: {
      name: "ครูสมศรี ที่ปรึกษา (ดูแล ม.4/1)",
      email: "teacher@school.ac.th",
      password: "password123",
      role: Role.TEACHER,
      classrooms: "ม.4/1",
    },
  });

  // 2. Seed Students across classrooms
  const studentsData = [
    // ม.4/1
    { studentId: "66001", title: "นาย", firstName: "ธนกร", lastName: "วงศ์สวัสดิ์", classroom: "ม.4/1", profile: "good" },
    { studentId: "66002", title: "นางสาว", firstName: "พิมชนก", lastName: "เลิศล้ำ", classroom: "ม.4/1", profile: "good" },
    { studentId: "66003", title: "นาย", firstName: "กิตติพงศ์", lastName: "เจริญสุข", classroom: "ม.4/1", profile: "deficit" },
    { studentId: "66004", title: "นางสาว", firstName: "ชญานิษฐ์", lastName: "ศรีสุวรรณ", classroom: "ม.4/1", profile: "good" },
    { studentId: "66005", title: "นาย", firstName: "ณัฐวุฒิ", lastName: "ทองดี", classroom: "ม.4/1", profile: "deficit" },
    { studentId: "66006", title: "นางสาว", firstName: "แพรวา", lastName: "รัตนโชติ", classroom: "ม.4/1", profile: "good" },
    { studentId: "66007", title: "นาย", firstName: "ภูวดล", lastName: "อินทร์แปลง", classroom: "ม.4/1", profile: "late" },
    { studentId: "66008", title: "นางสาว", firstName: "กมลชนก", lastName: "บุญมี", classroom: "ม.4/1", profile: "good" },

    // ม.4/2
    { studentId: "66009", title: "นาย", firstName: "ศิวัช", lastName: "ชัยมงคล", classroom: "ม.4/2", profile: "good" },
    { studentId: "66010", title: "นางสาว", firstName: "นภัสสร", lastName: "เกียรติขจร", classroom: "ม.4/2", profile: "deficit" },
    { studentId: "66011", title: "นาย", firstName: "ปุณณวิช", lastName: "วัฒนากูล", classroom: "ม.4/2", profile: "good" },
    { studentId: "66012", title: "นางสาว", firstName: "อริสรา", lastName: "พงษ์พานิช", classroom: "ม.4/2", profile: "good" },
    { studentId: "66013", title: "นาย", firstName: "เจษฎา", lastName: "สายชล", classroom: "ม.4/2", profile: "deficit" },
    { studentId: "66014", title: "นางสาว", firstName: "รมิดา", lastName: "สุขเกษม", classroom: "ม.4/2", profile: "good" },

    // ม.5/1
    { studentId: "65001", title: "นาย", firstName: "อภิสิทธิ์", lastName: "ตั้งใจเรียน", classroom: "ม.5/1", profile: "good" },
    { studentId: "65002", title: "นางสาว", firstName: "สุพิชชา", lastName: "งามวิไล", classroom: "ม.5/1", profile: "deficit" },
    { studentId: "65003", title: "นาย", firstName: "วรเมธ", lastName: "หิรัญญะ", classroom: "ม.5/1", profile: "good" },
    { studentId: "65004", title: "นางสาว", firstName: "ภัทรานิษฐ์", lastName: "โสภณ", classroom: "ม.5/1", profile: "good" },
    { studentId: "65005", title: "นาย", firstName: "ธีรภัทร", lastName: "นพคุณ", classroom: "ม.5/1", profile: "deficit" },

    // ม.6/1
    { studentId: "64001", title: "นาย", firstName: "พีรพัฒน์", lastName: "อัครเดช", classroom: "ม.6/1", profile: "good" },
    { studentId: "64002", title: "นางสาว", firstName: "ญาดา", lastName: "วรรณวิจิตร", classroom: "ม.6/1", profile: "good" },
    { studentId: "64003", title: "นาย", firstName: "ชานนท์", lastName: "พิทักษ์ไทย", classroom: "ม.6/1", profile: "deficit" },
    { studentId: "64004", title: "นางสาว", firstName: "ปภาวรินท์", lastName: "จันทรา", classroom: "ม.6/1", profile: "good" },
    { studentId: "64005", title: "นาย", firstName: "กันตภณ", lastName: "แสงทอง", classroom: "ม.6/1", profile: "good" },
  ];

  const schoolDays = getPastSchoolDays(10);

  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { studentId: s.studentId },
      update: {
        title: s.title,
        firstName: s.firstName,
        lastName: s.lastName,
        classroom: s.classroom,
        status: StudentStatus.ACTIVE,
      },
      create: {
        studentId: s.studentId,
        title: s.title,
        firstName: s.firstName,
        lastName: s.lastName,
        classroom: s.classroom,
        status: StudentStatus.ACTIVE,
      },
    });

    // Clear old records for clean seeding
    await prisma.attendanceRecord.deleteMany({ where: { studentId: student.id } });
    await prisma.remedialRecord.deleteMany({ where: { studentId: student.id } });

    const absentDates: Date[] = [];

    for (let i = 0; i < schoolDays.length; i++) {
      const date = schoolDays[i];
      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      let remark: string | null = null;

      if (s.profile === "deficit") {
        // Make them absent 4 or 5 days out of 10 (50%-60% attendance -> below 80%)
        if (i === 1 || i === 3 || i === 5 || i === 7 || (s.studentId.endsWith("3") && i === 8)) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถวโดยไม่แจ้งเหตุผล";
          absentDates.push(date);
        } else if (i === 4) {
          status = AttendanceStatus.LATE;
          remark = "มาสายหลังเคารพธงชาติ";
        }
      } else if (s.profile === "late") {
        if (i === 2 || i === 6) {
          status = AttendanceStatus.LATE;
          remark = "รถติด";
        } else if (i === 8) {
          status = AttendanceStatus.LEAVE;
          remark = "ลาป่วยมีใบรับรองแพทย์";
        }
      } else {
        // Good profile: 90-100% present
        if (i === 2 && Number(s.studentId) % 4 === 0) {
          status = AttendanceStatus.LEAVE;
          remark = "ลากิจส่วนตัว";
        } else if (i === 5 && Number(s.studentId) % 7 === 0) {
          status = AttendanceStatus.LATE;
        }
      }

      await prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          date,
          status,
          recordedById: teacherUser.id,
          remark,
        },
      });
    }

    // Create sample remedial records for deficit students
    if (s.profile === "deficit" && absentDates.length >= 2) {
      if (s.studentId === "66003" || s.studentId === "66010") {
        await prisma.remedialRecord.create({
          data: {
            studentId: student.id,
            targetDate: absentDates[0],
            activityTitle: "จิตอาสาทำความสะอาดลานอเนกประสงค์",
            description: "ช่วยกวาดใบไม้และจัดเก้าอี้หอประชุมตอนเย็น 1 ชั่วโมง",
            hoursEarned: 1,
            proofUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400",
            status: RemedialStatus.PENDING,
          },
        });
      }
      if (s.studentId === "66005" || s.studentId === "65002") {
        await prisma.remedialRecord.create({
          data: {
            studentId: student.id,
            targetDate: absentDates[0],
            activityTitle: "ช่วยงานห้องสมุดจัดหมวดหมู่หนังสือ",
            description: "จัดเรียงหนังสือหมวดวิทยาศาสตร์และซ่อมปกหนังสือชำรุด",
            hoursEarned: 1.5,
            status: RemedialStatus.APPROVED,
            approvedById: adminUser.id,
          },
        });
        await prisma.remedialRecord.create({
          data: {
            studentId: student.id,
            targetDate: absentDates[1],
            activityTitle: "บำเพ็ญประโยชน์คัดแยกขยะรีไซเคิล",
            description: "คัดแยกขวดพลาสติกหลังเลิกเรียนบริเวณโรงอาหาร",
            hoursEarned: 1,
            status: RemedialStatus.PENDING,
          },
        });
      }
      if (s.studentId === "66013") {
        await prisma.remedialRecord.create({
          data: {
            studentId: student.id,
            targetDate: absentDates[0],
            activityTitle: "รดน้ำต้นไม้แปลงเกษตรโรงเรียน",
            description: "หลักฐานภาพถ่ายไม่ชัดเจน กรุณาส่งใหม่อีกครั้ง",
            hoursEarned: 1,
            status: RemedialStatus.REJECTED,
            approvedById: adminUser.id,
          },
        });
      }
    }
  }

  console.log("✅ Seeded users, 24 students, 10 school days of attendance, and remedial records!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
