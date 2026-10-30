import {
  PrismaClient,
  Role,
  StudentStatus,
  AttendanceStatus,
  RemedialStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

function getMondayIso(d: Date): string {
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff)
  );
  return mon.toISOString().slice(0, 10);
}

// Generate all weekdays (Mon-Fri) for October 2026 (1 Oct 2026 to 29 Oct 2026)
function getAllSchoolDaysForOct2026(): Date[] {
  const days: Date[] = [];
  const current = new Date(Date.UTC(2026, 9, 1)); // Thursday 1 Oct 2026
  const end = new Date(Date.UTC(2026, 9, 29)); // Thursday 29 Oct 2026 (Today)

  while (current <= end) {
    const dow = current.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      days.push(new Date(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

async function main() {
  console.log("🌱 Starting database seed for October 2026 ONLY (1 - 29 Oct 2026)...");

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

  const teacher1 = await prisma.user.upsert({
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

  const teacher2 = await prisma.user.upsert({
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

  // 2. Student Roster
  const studentsData = [
    // ม.4/1
    { studentId: "66001", title: "นาย", firstName: "ธนกร", lastName: "วงศ์สวัสดิ์", classroom: "ม.4/1", scenario: "PERFECT" },
    { studentId: "66002", title: "นางสาว", firstName: "พิมชนก", lastName: "เลิศล้ำ", classroom: "ม.4/1", scenario: "PERFECT" },
    { studentId: "66003", title: "นาย", firstName: "กิตติพงศ์", lastName: "เจริญสุข", classroom: "ม.4/1", scenario: "CROSS_WEEK_FIXED" },
    { studentId: "66004", title: "นางสาว", firstName: "ชญานิษฐ์", lastName: "ศรีสุวรรณ", classroom: "ม.4/1", scenario: "PERFECT" },
    { studentId: "66005", title: "นาย", firstName: "ณัฐวุฒิ", lastName: "ทองดี", classroom: "ม.4/1", scenario: "THIS_WEEK_SCHEDULED" },
    { studentId: "66006", title: "นางสาว", firstName: "แพรวา", lastName: "รัตนโชติ", classroom: "ม.4/1", scenario: "SAME_WEEK_FIXED" },
    { studentId: "66007", title: "นาย", firstName: "ภูวดล", lastName: "อินทร์แปลง", classroom: "ม.4/1", scenario: "LAST_FRI_SCHEDULED" },
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

  const allSchoolDays = getAllSchoolDaysForOct2026();
  const todayDate = allSchoolDays[allSchoolDays.length - 1];
  const todayIso = todayDate.toISOString().slice(0, 10);
  const currentMondayIso = getMondayIso(todayDate);

  const uniqueMondays = Array.from(new Set(allSchoolDays.map(getMondayIso))).sort();
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

  console.log(`📅 Total school weekdays in October: ${allSchoolDays.length} days`);

  const createdStudents = [];
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
    createdStudents.push({ ...student, scenario: s.scenario });
  }

  // Clear old attendance and remedial records
  await prisma.attendanceRecord.deleteMany({});
  await prisma.remedialRecord.deleteMany({});

  const allAttendanceRows: {
    studentId: string;
    date: Date;
    status: AttendanceStatus;
    recordedById: string;
    remark: string | null;
  }[] = [];

  const allRemedialRows: {
    studentId: string;
    targetDate: Date;
    activityTitle: string;
    description: string;
    hoursEarned: number;
    status: RemedialStatus;
    approvedById: string | null;
    createdAt: Date;
  }[] = [];

  for (const s of createdStudents) {
    // Generate records for every school day from Jan to Oct 2026
    for (let dayIdx = 0; dayIdx < allSchoolDays.length; dayIdx++) {
      const date = allSchoolDays[dayIdx];
      const dateIso = date.toISOString().slice(0, 10);
      const dow = date.getUTCDay(); // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
      const monIso = getMondayIso(date);
      const isHolidayClinic = dow === 3 || dow === 4;

      // Leave today (29 Oct) empty if clinic day so teacher can test [มาแก้แถว] live in UI
      if (dateIso === todayIso && isHolidayClinic) {
        continue;
      }

      let status: AttendanceStatus = isHolidayClinic
        ? AttendanceStatus.EXEMPTION
        : AttendanceStatus.PRESENT;
      let remark: string | null = isHolidayClinic
        ? "วันหยุดประจำสัปดาห์ (พุธ-พฤหัสบดี)"
        : null;

      // Historical behavior across months (Jan - Sep):
      // Occasional realistic absence/sick leave
      if (!isHolidayClinic) {
        // Deterministic pseudo-random pattern based on student id and day
        const seedValue = (parseInt(s.studentId, 10) * 17 + dayIdx * 31) % 100;
        if (s.scenario === "OVERDUE_LOCKED" && seedValue < 28) {
          // Student who frequently skips and fails to meet 80%
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถว (ค้างแก้สะสม)";
        } else if (seedValue < 3) {
          // Occasional sick leave for normal students
          status = AttendanceStatus.LEAVE;
          remark = "ลาป่วย (มีใบลา)";
        } else if (seedValue === 4 && s.scenario !== "PERFECT") {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถว";
        }
      }

      // Specific October showcase scenarios
      if (s.scenario === "CROSS_WEEK_FIXED") {
        if (monIso === prevMondayIso && dow === 5) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถววันศุกร์ (โอนนัดแก้พุธสัปดาห์ถัดไป)";
        } else if (monIso === currentMondayIso && dow === 3) {
          status = AttendanceStatus.PRESENT;
          remark = "มาเข้าคลินิกแก้แถววันพุธ (ชดเชยวันศุกร์สัปดาห์ก่อน)";
        }
      } else if (s.scenario === "SAME_WEEK_FIXED") {
        if (monIso === prevMondayIso && dow === 1) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถววันจันทร์";
        } else if (monIso === prevMondayIso && dow === 3) {
          status = AttendanceStatus.PRESENT;
          remark = "มาเข้าคลินิกแก้แถววันพุธ (ชดเชยวันจันทร์สัปดาห์เดียวกัน)";
        }
      } else if (s.scenario === "THIS_WEEK_SCHEDULED") {
        if (monIso === currentMondayIso && dow === 1) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถววันจันทร์ (รอนัดแก้ พุธ-พฤหัสฯ นี้)";
        }
      } else if (s.scenario === "LAST_FRI_SCHEDULED") {
        if (monIso === prevMondayIso && dow === 5) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดวันศุกร์ที่แล้ว (นัดมาแก้คลินิก พุธ-พฤหัสฯ นี้)";
        }
      } else if (s.scenario === "OVERDUE_LOCKED") {
        if (monIso === threeWeeksAgoMondayIso && dow === 1) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถว (พ้นเส้นตายสัปดาห์ — ค้างสะสม)";
        } else if (monIso === twoWeeksAgoMondayIso && dow === 2) {
          status = AttendanceStatus.ABSENT;
          remark = "ขาดแถวซ้ำ ไม่มาเข้าคลินิกตามนัด";
        }
      }

      allAttendanceRows.push({
        studentId: s.id,
        date,
        status,
        recordedById: teacherUser.id,
        remark,
      });
    }

    // Add sample remedial activity for students with remedial records
    if (s.scenario === "CROSS_WEEK_FIXED") {
      allRemedialRows.push({
        studentId: s.id,
        targetDate: new Date(Date.UTC(2026, 8, 8)), // 8 Sep 2026
        activityTitle: "บำเพ็ญประโยชน์ทำความสะอาดห้องสมุดโรงเรียน",
        description: "ช่วยจัดหมวดหมู่หนังสือและทำความสะอาดชั้นวางหนังสือ 2 ชั่วโมง",
        hoursEarned: 2,
        status: RemedialStatus.APPROVED,
        approvedById: adminUser.id,
        createdAt: new Date(Date.UTC(2026, 8, 10)),
      });
    } else if (s.scenario === "OVERDUE_LOCKED") {
      allRemedialRows.push({
        studentId: s.id,
        targetDate: new Date(Date.UTC(2026, 9, 5)), // 5 Oct 2026
        activityTitle: "ช่วยงานจิตอาสาพัฒนาภูมิทัศน์อาคารเรียน",
        description: "กวาดลานกิจกรรมและรดน้ำต้นไม้หน้าอาคาร 3",
        hoursEarned: 1.5,
        status: RemedialStatus.PENDING,
        approvedById: null,
        createdAt: new Date(Date.UTC(2026, 9, 27)),
      });
    }
  }

  console.log(`📦 Bulk inserting ${allAttendanceRows.length} attendance records...`);
  // Insert in chunks of 1000 for maximum performance
  const chunkSize = 1000;
  for (let i = 0; i < allAttendanceRows.length; i += chunkSize) {
    const chunk = allAttendanceRows.slice(i, i + chunkSize);
    await prisma.attendanceRecord.createMany({ data: chunk });
  }

  console.log(`📦 Inserting ${allRemedialRows.length} remedial activity records...`);
  for (const rem of allRemedialRows) {
    await prisma.remedialRecord.create({ data: rem });
  }

  console.log(`✅ Successfully seeded October 2026 data:`);
  console.log(`   - Students: ${createdStudents.length}`);
  console.log(`   - Attendance Records: ${allAttendanceRows.length}`);
  console.log(`   - Remedial Records: ${allRemedialRows.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
