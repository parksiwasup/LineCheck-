import {
  PrismaClient,
  Role,
  StudentStatus,
  AttendanceStatus,
  RemedialStatus,
} from "@prisma/client";
import { subDays, startOfDay, isWeekend } from "date-fns";

const prisma = new PrismaClient();

function getPastSchoolDays(count: number): Date[] {
  const days: Date[] = [];
  let current = startOfDay(new Date());
  while (days.length < count) {
    if (!isWeekend(current)) {
      const utcDate = new Date(
        Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
      );
      days.push(utcDate);
    }
    current = subDays(current, 1);
  }
  return days.reverse();
}

function getMondayIso(d: Date): string {
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff)
  );
  return mon.toISOString().slice(0, 10);
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

  await prisma.user.upsert({
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

  await prisma.user.upsert({
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

  // 2. Seed Students across classrooms with concrete showcase scenarios
  const studentsData = [
    // ม.4/1 — ห้องตัวอย่างครบทุกกรณี (Showcase Room)
    { studentId: "66001", title: "นาย", firstName: "ธนกร", lastName: "วงศ์สวัสดิ์", classroom: "ม.4/1", scenario: "PERFECT" },
    { studentId: "66002", title: "นางสาว", firstName: "พิมชนก", lastName: "เลิศล้ำ", classroom: "ม.4/1", scenario: "PERFECT" },
    // 66003: ขาดวันศุกร์สัปดาห์ก่อน -> มาแก้ในวันหยุดพุธสัปดาห์นี้สำเร็จแล้ว (Cross-week FIFO สำเร็จ!)
    { studentId: "66003", title: "นาย", firstName: "กิตติพงศ์", lastName: "เจริญสุข", classroom: "ม.4/1", scenario: "CROSS_WEEK_FIXED" },
    { studentId: "66004", title: "นางสาว", firstName: "ชญานิษฐ์", lastName: "ศรีสุวรรณ", classroom: "ม.4/1", scenario: "PERFECT" },
    // 66005: ขาดวันจันทร์สัปดาห์นี้ -> รอนัดแก้ในคลินิกวันหยุด พุธ-พฤหัสฯ นี้ (อยู่ในคิวนัดแก้!)
    { studentId: "66005", title: "นาย", firstName: "ณัฐวุฒิ", lastName: "ทองดี", classroom: "ม.4/1", scenario: "THIS_WEEK_SCHEDULED" },
    { studentId: "66006", title: "นางสาว", firstName: "แพรวา", lastName: "รัตนโชติ", classroom: "ม.4/1", scenario: "SAME_WEEK_FIXED" },
    // 66007: ขาดวันศุกร์สัปดาห์ก่อน -> โอนคิวมารอแก้ในคลินิกวันพฤหัสฯ นี้ (ยังไม่หลุดเส้นตาย!)
    { studentId: "66007", title: "นาย", firstName: "ภูวดล", lastName: "อินทร์แปลง", classroom: "ม.4/1", scenario: "LAST_FRI_SCHEDULED" },
    // 66008: ขาด 2 สัปดาห์ก่อนแล้วดองข้ามสัปดาห์ ไม่ยอมมาคลินิก (พ้นเส้นตายวันอาทิตย์ -> ล็อกเป็นค้างแก้สะสมข้ามสัปดาห์!)
    { studentId: "66008", title: "นางสาว", firstName: "กมลชนก", lastName: "บุญมี", classroom: "ม.4/1", scenario: "OVERDUE_LOCKED" },

    // ม.4/2
    { studentId: "66009", title: "นาย", firstName: "ศิวัช", lastName: "ชัยมงคล", classroom: "ม.4/2", scenario: "PERFECT" },
    { studentId: "66010", title: "นางสาว", firstName: "นภัสสร", lastName: "เกียรติขจร", classroom: "ม.4/2", scenario: "OVERDUE_LOCKED" },
    { studentId: "66011", title: "นาย", firstName: "ปุณณวิช", lastName: "วัฒนากูล", classroom: "ม.4/2", scenario: "PERFECT" },
    { studentId: "66012", title: "นางสาว", firstName: "อริสรา", lastName: "พงษ์พานิช", classroom: "ม.4/2", scenario: "SAME_WEEK_FIXED" },
    { studentId: "66013", title: "นาย", firstName: "เจษฎา", lastName: "สายชล", classroom: "ม.4/2", scenario: "THIS_WEEK_SCHEDULED" },
    { studentId: "66014", title: "นางสาว", firstName: "รมิดา", lastName: "สุขเกษม", classroom: "ม.4/2", scenario: "PERFECT" },

    // ม.5/1
    { studentId: "65001", title: "นาย", firstName: "อภิสิทธิ์", lastName: "ตั้งใจเรียน", classroom: "ม.5/1", scenario: "PERFECT" },
    { studentId: "65002", title: "นางสาว", firstName: "สุพิชชา", lastName: "งามวิไล", classroom: "ม.5/1", scenario: "CROSS_WEEK_FIXED" },
    { studentId: "65003", title: "นาย", firstName: "วรเมธ", lastName: "หิรัญญะ", classroom: "ม.5/1", scenario: "PERFECT" },
    { studentId: "65004", title: "นางสาว", firstName: "ภัทรานิษฐ์", lastName: "โสภณ", classroom: "ม.5/1", scenario: "PERFECT" },
    { studentId: "65005", title: "นาย", firstName: "ธีรภัทร", lastName: "นพคุณ", classroom: "ม.5/1", scenario: "OVERDUE_LOCKED" },

    // ม.6/1
    { studentId: "64001", title: "นาย", firstName: "พีรพัฒน์", lastName: "อัครเดช", classroom: "ม.6/1", scenario: "PERFECT" },
    { studentId: "64002", title: "นางสาว", firstName: "ญาดา", lastName: "วรรณวิจิตร", classroom: "ม.6/1", scenario: "PERFECT" },
    { studentId: "64003", title: "นาย", firstName: "ชานนท์", lastName: "พิทักษ์ไทย", classroom: "ม.6/1", scenario: "LAST_FRI_SCHEDULED" },
    { studentId: "64004", title: "นางสาว", firstName: "ปภาวรินท์", lastName: "จันทรา", classroom: "ม.6/1", scenario: "PERFECT" },
    { studentId: "64005", title: "นาย", firstName: "กันตภณ", lastName: "แสงทอง", classroom: "ม.6/1", scenario: "PERFECT" },
  ];

  const schoolDays = getPastSchoolDays(21);
  const todayDate = schoolDays[schoolDays.length - 1];
  const todayIso = todayDate.toISOString().slice(0, 10);
  const currentMondayIso = getMondayIso(todayDate);

  // Identify distinct weeks in chronological order
  const uniqueMondays = Array.from(new Set(schoolDays.map(getMondayIso))).sort();
  const prevMondayIso =
    uniqueMondays.length >= 2
      ? uniqueMondays[uniqueMondays.length - 2]
      : currentMondayIso;
  const twoWeeksAgoMondayIso =
    uniqueMondays.length >= 3
      ? uniqueMondays[uniqueMondays.length - 3]
      : prevMondayIso;
  const threeWeeksAgoMondayIso =
    uniqueMondays.length >= 4
      ? uniqueMondays[uniqueMondays.length - 4]
      : twoWeeksAgoMondayIso;

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

    await prisma.attendanceRecord.deleteMany({ where: { studentId: student.id } });
    await prisma.remedialRecord.deleteMany({ where: { studentId: student.id } });

    let volunteerRemedyTarget: Date | null = null;

    for (const date of schoolDays) {
      const dateIso = date.toISOString().slice(0, 10);
      const dow = date.getUTCDay(); // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
      const monIso = getMondayIso(date);
      const isHolidayClinic = dow === 3 || dow === 4;

      // หากวันนี้เป็นวันหยุดคลินิก (พุธ/พฤหัสฯ) ให้เว้นว่างของวันนี้ไว้เพื่อให้ครูทดสอบกด [มาแก้แถว] ในหน้าเช็คชื่อได้ทันที!
      if (dateIso === todayIso && isHolidayClinic) {
        continue;
      }

      let status: AttendanceStatus = isHolidayClinic
        ? AttendanceStatus.EXEMPTION
        : AttendanceStatus.PRESENT;
      let remark: string | null = isHolidayClinic
        ? "วันหยุดประจำสัปดาห์ (พุธ-พฤหัสบดี)"
        : null;

      if (s.scenario === "CROSS_WEEK_FIXED") {
        // กรณีตัวอย่างเด่น: ขาดวันศุกร์สัปดาห์ที่แล้ว -> มาเข้าคลินิกแก้แถวในวันพุธสัปดาห์นี้สำเร็จ!
        if (monIso === prevMondayIso && dow === 5) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถววันศุกร์ (โอนนัดแก้พุธสัปดาห์ถัดไป)";
        } else if (monIso === currentMondayIso && dow === 3) {
          status = AttendanceStatus.PRESENT;
          remark = "มาเข้าคลินิกแก้แถววันพุธ (ชดเชยวันศุกร์สัปดาห์ก่อน)";
        } else if (monIso === threeWeeksAgoMondayIso && dow === 2) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถววันอังคาร (แก้ด้วยกิจกรรมจิตอาสาแล้ว)";
          volunteerRemedyTarget = date;
        }
      } else if (s.scenario === "SAME_WEEK_FIXED") {
        // ขาดวันจันทร์สัปดาห์ที่แล้ว -> มาแก้ในวันพุธสัปดาห์เดียวกันทันที!
        if (monIso === prevMondayIso && dow === 1) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถววันจันทร์";
        } else if (monIso === prevMondayIso && dow === 3) {
          status = AttendanceStatus.PRESENT;
          remark = "มาเข้าคลินิกแก้แถววันพุธ (ชดเชยวันจันทร์สัปดาห์เดียวกัน)";
        }
      } else if (s.scenario === "THIS_WEEK_SCHEDULED") {
        // ขาดวันจันทร์สัปดาห์นี้ -> รอนัดแก้ในคลินิกวันหยุด พุธ-พฤหัสฯ นี้!
        if (monIso === currentMondayIso && dow === 1) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถววันจันทร์ (รอนัดแก้ พุธ-พฤหัสฯ นี้)";
        }
      } else if (s.scenario === "LAST_FRI_SCHEDULED") {
        // ขาดวันศุกร์สัปดาห์ที่แล้ว -> โอนคิวมารอแก้ในคลินิกวันพฤหัสฯ สัปดาห์นี้!
        if (monIso === prevMondayIso && dow === 5) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดวันศุกร์ที่แล้ว (นัดมาแก้คลินิก พุธ-พฤหัสฯ นี้)";
        }
      } else if (s.scenario === "OVERDUE_LOCKED") {
        // ดองงานข้ามสัปดาห์! ขาดเมื่อ 2-3 สัปดาห์ก่อนแล้วไม่ยอมมาแก้จนพ้นเส้นตายวันอาทิตย์ 23:59 น.
        if (monIso === threeWeeksAgoMondayIso && dow === 1) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถว (พ้นเส้นตายสัปดาห์ — ค้างสะสม)";
        } else if (monIso === twoWeeksAgoMondayIso && dow === 2) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถวซ้ำ ไม่มาเข้าคลินิกตามนัด";
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
  }

  console.log("✅ Seeded LineCheck+ showcase scenarios (Wed/Thu Make-up Clinic & 2-Tier Weekly Cutoff)!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
