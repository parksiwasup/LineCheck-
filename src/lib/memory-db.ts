import {
  Role,
  StudentStatus,
  AttendanceStatus,
  RemedialStatus,
} from "@prisma/client";
import { subDays, startOfDay, isWeekend } from "date-fns";
import { formatDateISO } from "@/lib/utils";

export interface MemUser {
  id: string;
  name: string;
  email: string;
  password: string | null;
  image: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemStudent {
  id: string;
  studentId: string;
  title: string;
  firstName: string;
  lastName: string;
  classroom: string;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemAttendance {
  id: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  recordedById: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemRemedial {
  id: string;
  studentId: string;
  targetDate: Date;
  activityTitle: string;
  description: string | null;
  hoursEarned: number;
  proofUrl: string | null;
  status: RemedialStatus;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryStore {
  users: MemUser[];
  students: MemStudent[];
  attendanceRecords: MemAttendance[];
  remedialRecords: MemRemedial[];
}

function getPastSchoolDays(count: number): Date[] {
  const days: Date[] = [];
  let current = startOfDay(new Date());
  while (days.length < count) {
    if (!isWeekend(current)) {
      days.push(
        new Date(
          Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
        )
      );
    }
    current = subDays(current, 1);
  }
  return days.reverse();
}

function createInitialStore(): MemoryStore {
  const now = new Date();
  const users: MemUser[] = [
    {
      id: "usr_admin_1",
      name: "อ.ดร.เกรียงไกร ฝ่ายปกครอง",
      email: "admin@school.ac.th",
      password: "password123",
      image: null,
      role: Role.ADMIN,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "usr_teacher_1",
      name: "ครูสมศรี ที่ปรึกษา",
      email: "teacher@school.ac.th",
      password: "password123",
      image: null,
      role: Role.TEACHER,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const rawStudents = [
    { studentId: "66001", title: "นาย", firstName: "ธนกร", lastName: "วงศ์สวัสดิ์", classroom: "ม.4/1", profile: "good" },
    { studentId: "66002", title: "นางสาว", firstName: "พิมชนก", lastName: "เลิศล้ำ", classroom: "ม.4/1", profile: "good" },
    { studentId: "66003", title: "นาย", firstName: "กิตติพงศ์", lastName: "เจริญสุข", classroom: "ม.4/1", profile: "deficit" },
    { studentId: "66004", title: "นางสาว", firstName: "ชญานิษฐ์", lastName: "ศรีสุวรรณ", classroom: "ม.4/1", profile: "good" },
    { studentId: "66005", title: "นาย", firstName: "ณัฐวุฒิ", lastName: "ทองดี", classroom: "ม.4/1", profile: "deficit" },
    { studentId: "66006", title: "นางสาว", firstName: "แพรวา", lastName: "รัตนโชติ", classroom: "ม.4/1", profile: "good" },
    { studentId: "66007", title: "นาย", firstName: "ภูวดล", lastName: "อินทร์แปลง", classroom: "ม.4/1", profile: "late" },
    { studentId: "66008", title: "นางสาว", firstName: "กมลชนก", lastName: "บุญมี", classroom: "ม.4/1", profile: "good" },

    { studentId: "66009", title: "นาย", firstName: "ศิวัช", lastName: "ชัยมงคล", classroom: "ม.4/2", profile: "good" },
    { studentId: "66010", title: "นางสาว", firstName: "นภัสสร", lastName: "เกียรติขจร", classroom: "ม.4/2", profile: "deficit" },
    { studentId: "66011", title: "นาย", firstName: "ปุณณวิช", lastName: "วัฒนากูล", classroom: "ม.4/2", profile: "good" },
    { studentId: "66012", title: "นางสาว", firstName: "อริสรา", lastName: "พงษ์พานิช", classroom: "ม.4/2", profile: "good" },
    { studentId: "66013", title: "นาย", firstName: "เจษฎา", lastName: "สายชล", classroom: "ม.4/2", profile: "deficit" },
    { studentId: "66014", title: "นางสาว", firstName: "รมิดา", lastName: "สุขเกษม", classroom: "ม.4/2", profile: "good" },

    { studentId: "65001", title: "นาย", firstName: "อภิสิทธิ์", lastName: "ตั้งใจเรียน", classroom: "ม.5/1", profile: "good" },
    { studentId: "65002", title: "นางสาว", firstName: "สุพิชชา", lastName: "งามวิไล", classroom: "ม.5/1", profile: "deficit" },
    { studentId: "65003", title: "นาย", firstName: "วรเมธ", lastName: "หิรัญญะ", classroom: "ม.5/1", profile: "good" },
    { studentId: "65004", title: "นางสาว", firstName: "ภัทรานิษฐ์", lastName: "โสภณ", classroom: "ม.5/1", profile: "good" },
    { studentId: "65005", title: "นาย", firstName: "ธีรภัทร", lastName: "นพคุณ", classroom: "ม.5/1", profile: "deficit" },

    { studentId: "64001", title: "นาย", firstName: "พีรพัฒน์", lastName: "อัครเดช", classroom: "ม.6/1", profile: "good" },
    { studentId: "64002", title: "นางสาว", firstName: "ญาดา", lastName: "วรรณวิจิตร", classroom: "ม.6/1", profile: "good" },
    { studentId: "64003", title: "นาย", firstName: "ชานนท์", lastName: "พิทักษ์ไทย", classroom: "ม.6/1", profile: "deficit" },
    { studentId: "64004", title: "นางสาว", firstName: "ปภาวรินท์", lastName: "จันทรา", classroom: "ม.6/1", profile: "good" },
    { studentId: "64005", title: "นาย", firstName: "กันตภณ", lastName: "แสงทอง", classroom: "ม.6/1", profile: "good" },
  ];

  const students: MemStudent[] = [];
  const attendanceRecords: MemAttendance[] = [];
  const remedialRecords: MemRemedial[] = [];
  const schoolDays = getPastSchoolDays(10);

  rawStudents.forEach((s, idx) => {
    const stId = `st_${idx + 1}`;
    students.push({
      id: stId,
      studentId: s.studentId,
      title: s.title,
      firstName: s.firstName,
      lastName: s.lastName,
      classroom: s.classroom,
      status: StudentStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });

    const absentDates: Date[] = [];

    schoolDays.forEach((date, i) => {
      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      let remark: string | null = null;

      if (s.profile === "deficit") {
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
        if (i === 2 && Number(s.studentId) % 4 === 0) {
          status = AttendanceStatus.LEAVE;
          remark = "ลากิจส่วนตัว";
        } else if (i === 5 && Number(s.studentId) % 7 === 0) {
          status = AttendanceStatus.LATE;
        }
      }

      attendanceRecords.push({
        id: `att_${stId}_${i}`,
        studentId: stId,
        date,
        status,
        recordedById: "usr_teacher_1",
        remark,
        createdAt: now,
        updatedAt: now,
      });
    });

    if (s.profile === "deficit" && absentDates.length >= 2) {
      if (s.studentId === "66003" || s.studentId === "66010") {
        remedialRecords.push({
          id: `rem_${stId}_1`,
          studentId: stId,
          targetDate: absentDates[0],
          activityTitle: "จิตอาสาทำความสะอาดลานอเนกประสงค์",
          description: "ช่วยกวาดใบไม้และจัดเก้าอี้หอประชุมตอนเย็น 1 ชั่วโมง",
          hoursEarned: 1,
          proofUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400",
          status: RemedialStatus.PENDING,
          approvedById: null,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (s.studentId === "66005" || s.studentId === "65002") {
        remedialRecords.push({
          id: `rem_${stId}_1`,
          studentId: stId,
          targetDate: absentDates[0],
          activityTitle: "ช่วยงานห้องสมุดจัดหมวดหมู่หนังสือ",
          description: "จัดเรียงหนังสือหมวดวิทยาศาสตร์และซ่อมปกหนังสือชำรุด",
          hoursEarned: 1.5,
          proofUrl: null,
          status: RemedialStatus.APPROVED,
          approvedById: "usr_admin_1",
          createdAt: now,
          updatedAt: now,
        });
        remedialRecords.push({
          id: `rem_${stId}_2`,
          studentId: stId,
          targetDate: absentDates[1],
          activityTitle: "บำเพ็ญประโยชน์คัดแยกขยะรีไซเคิล",
          description: "คัดแยกขวดพลาสติกหลังเลิกเรียนบริเวณโรงอาหาร",
          hoursEarned: 1,
          proofUrl: null,
          status: RemedialStatus.PENDING,
          approvedById: null,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (s.studentId === "66013") {
        remedialRecords.push({
          id: `rem_${stId}_1`,
          studentId: stId,
          targetDate: absentDates[0],
          activityTitle: "รดน้ำต้นไม้แปลงเกษตรโรงเรียน",
          description: "หลักฐานภาพถ่ายไม่ชัดเจน กรุณาส่งใหม่อีกครั้ง",
          hoursEarned: 1,
          proofUrl: null,
          status: RemedialStatus.REJECTED,
          approvedById: "usr_admin_1",
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  });

  return { users, students, attendanceRecords, remedialRecords };
}

const globalForMem = globalThis as unknown as {
  memStore: MemoryStore | undefined;
};

export function getMemStore(): MemoryStore {
  if (!globalForMem.memStore) {
    globalForMem.memStore = createInitialStore();
  }
  return globalForMem.memStore;
}

export function createMemoryPrismaClient() {
  const store = getMemStore();

  return {
    $transaction: async <T>(promises: Promise<T>[]): Promise<T[]> => {
      return Promise.all(promises);
    },
    user: {
      findUnique: async ({ where }: any) => {
        return (
          store.users.find(
            (u) =>
              (where.id && u.id === where.id) ||
              (where.email && u.email === where.email)
          ) ?? null
        );
      },
      findFirst: async ({ where }: any = {}) => {
        if (!where) return store.users[0] ?? null;
        return (
          store.users.find((u) => !where.role || u.role === where.role) ?? null
        );
      },
      findMany: async ({ include }: any = {}) => {
        return store.users.map((u) => ({
          ...u,
          ...(include?._count
            ? {
                _count: {
                  recordedAttendances: store.attendanceRecords.filter(
                    (a) => a.recordedById === u.id
                  ).length,
                  approvedRemedials: store.remedialRecords.filter(
                    (r) => r.approvedById === u.id
                  ).length,
                },
              }
            : {}),
        }));
      },
      create: async ({ data }: any) => {
        const newUser: MemUser = {
          id: `usr_${Date.now()}`,
          name: data.name,
          email: data.email,
          password: data.password ?? "password123",
          image: data.image ?? null,
          role: data.role ?? Role.TEACHER,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.users.push(newUser);
        return newUser;
      },
      update: async ({ where, data }: any) => {
        const idx = store.users.findIndex((u) => u.id === where.id);
        if (idx === -1) throw new Error("User not found");
        store.users[idx] = {
          ...store.users[idx],
          ...data,
          updatedAt: new Date(),
        };
        return store.users[idx];
      },
      delete: async ({ where }: any) => {
        const idx = store.users.findIndex((u) => u.id === where.id);
        if (idx === -1) throw new Error("User not found");
        const [deleted] = store.users.splice(idx, 1);
        return deleted;
      },
      count: async () => store.users.length,
    },

    student: {
      findMany: async ({ where, include, distinct }: any = {}) => {
        let list = [...store.students];
        if (where?.status) {
          list = list.filter((s) => s.status === where.status);
        }
        if (where?.classroom) {
          list = list.filter((s) => s.classroom === where.classroom);
        }
        list.sort(
          (a, b) =>
            a.classroom.localeCompare(b.classroom) ||
            a.studentId.localeCompare(b.studentId)
        );
        if (distinct?.includes("classroom")) {
          const seen = new Set<string>();
          list = list.filter((s) => {
            if (seen.has(s.classroom)) return false;
            seen.add(s.classroom);
            return true;
          });
        }
        return list.map((s) => {
          let att = store.attendanceRecords.filter((a) => a.studentId === s.id);
          if (include?.attendanceRecords?.where?.date) {
            const targetIso = formatDateISO(include.attendanceRecords.where.date);
            att = att.filter((a) => formatDateISO(a.date) === targetIso);
          }
          att.sort((a, b) => b.date.getTime() - a.date.getTime());

          const rem = store.remedialRecords
            .filter((r) => r.studentId === s.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((r) => ({
              ...r,
              approvedBy:
                store.users.find((u) => u.id === r.approvedById) ?? null,
            }));

          return {
            ...s,
            attendanceRecords: att,
            remedialRecords: rem,
            _count: {
              attendanceRecords: store.attendanceRecords.filter(
                (a) => a.studentId === s.id
              ).length,
              remedialRecords: store.remedialRecords.filter(
                (r) => r.studentId === s.id
              ).length,
            },
          };
        });
      },
      findUnique: async ({ where }: any) => {
        return (
          store.students.find(
            (s) =>
              (where.id && s.id === where.id) ||
              (where.studentId && s.studentId === where.studentId)
          ) ?? null
        );
      },
      create: async ({ data }: any) => {
        const newSt: MemStudent = {
          id: `st_${Date.now()}`,
          studentId: data.studentId,
          title: data.title,
          firstName: data.firstName,
          lastName: data.lastName,
          classroom: data.classroom,
          status: data.status ?? StudentStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.students.push(newSt);
        return newSt;
      },
      update: async ({ where, data }: any) => {
        const idx = store.students.findIndex((s) => s.id === where.id);
        if (idx === -1) throw new Error("Student not found");
        store.students[idx] = {
          ...store.students[idx],
          ...data,
          updatedAt: new Date(),
        };
        return store.students[idx];
      },
      delete: async ({ where }: any) => {
        const idx = store.students.findIndex((s) => s.id === where.id);
        if (idx === -1) throw new Error("Student not found");
        const [deleted] = store.students.splice(idx, 1);
        store.attendanceRecords = store.attendanceRecords.filter(
          (a) => a.studentId !== deleted.id
        );
        store.remedialRecords = store.remedialRecords.filter(
          (r) => r.studentId !== deleted.id
        );
        return deleted;
      },
    },

    attendanceRecord: {
      findMany: async ({ where }: any = {}) => {
        let list = [...store.attendanceRecords];
        if (where?.studentId) {
          list = list.filter((a) => a.studentId === where.studentId);
        }
        return list.sort((a, b) => a.date.getTime() - b.date.getTime());
      },
      upsert: async ({ where, update, create }: any) => {
        const targetStudentId = where.studentId_date.studentId;
        const targetIso = formatDateISO(where.studentId_date.date);
        const idx = store.attendanceRecords.findIndex(
          (a) =>
            a.studentId === targetStudentId &&
            formatDateISO(a.date) === targetIso
        );
        if (idx !== -1) {
          store.attendanceRecords[idx] = {
            ...store.attendanceRecords[idx],
            ...update,
            updatedAt: new Date(),
          };
          return store.attendanceRecords[idx];
        }
        const created: MemAttendance = {
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          studentId: create.studentId,
          date: create.date,
          status: create.status,
          remark: create.remark ?? null,
          recordedById: create.recordedById ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.attendanceRecords.push(created);
        return created;
      },
      deleteMany: async ({ where }: any = {}) => {
        const before = store.attendanceRecords.length;
        if (where?.date) {
          const targetIso = formatDateISO(where.date);
          store.attendanceRecords = store.attendanceRecords.filter(
            (a) => formatDateISO(a.date) !== targetIso
          );
        } else if (where?.studentId) {
          store.attendanceRecords = store.attendanceRecords.filter(
            (a) => a.studentId !== where.studentId
          );
        }
        return { count: before - store.attendanceRecords.length };
      },
    },

    remedialRecord: {
      findMany: async ({ take }: any = {}) => {
        const list = [...store.remedialRecords]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((r) => ({
            ...r,
            student:
              store.students.find((s) => s.id === r.studentId) ??
              store.students[0],
            approvedBy:
              store.users.find((u) => u.id === r.approvedById) ?? null,
          }));
        return take ? list.slice(0, take) : list;
      },
      findFirst: async ({ where }: any) => {
        const targetIso = formatDateISO(where.targetDate);
        return (
          store.remedialRecords.find(
            (r) =>
              r.studentId === where.studentId &&
              formatDateISO(r.targetDate) === targetIso &&
              (!where.status?.in || where.status.in.includes(r.status))
          ) ?? null
        );
      },
      findUnique: async ({ where }: any) => {
        return store.remedialRecords.find((r) => r.id === where.id) ?? null;
      },
      create: async ({ data }: any) => {
        const created: MemRemedial = {
          id: `rem_${Date.now()}`,
          studentId: data.studentId,
          targetDate: data.targetDate,
          activityTitle: data.activityTitle,
          description: data.description ?? null,
          hoursEarned: data.hoursEarned ?? 1,
          proofUrl: data.proofUrl ?? null,
          status: data.status ?? RemedialStatus.PENDING,
          approvedById: data.approvedById ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.remedialRecords.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const idx = store.remedialRecords.findIndex((r) => r.id === where.id);
        if (idx === -1) throw new Error("Remedial record not found");
        store.remedialRecords[idx] = {
          ...store.remedialRecords[idx],
          ...data,
          updatedAt: new Date(),
        };
        return store.remedialRecords[idx];
      },
      count: async ({ where }: any = {}) => {
        if (!where) return store.remedialRecords.length;
        return store.remedialRecords.filter(
          (r) =>
            (!where.studentId || r.studentId === where.studentId) &&
            (!where.status || r.status === where.status)
        ).length;
      },
    },
  };
}
