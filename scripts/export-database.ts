import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

function escapeSql(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  }
  const str = String(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%":
        return "\\" + char;
      default:
        return char;
    }
  });
  return `'${str}'`;
}

function escapeDateOnly(val: Date): string {
  return `'${val.toISOString().slice(0, 10)}'`;
}

async function exportDatabase() {
  console.log("📦 Starting database export to SQL...");

  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  const students = await prisma.student.findMany({ orderBy: { id: "asc" } });
  const attendance = await prisma.attendanceRecord.findMany({ orderBy: [{ date: "asc" }, { id: "asc" }] });
  const remedials = await prisma.remedialRecord.findMany({ orderBy: { id: "asc" } });

  console.log(`- Users: ${users.length}`);
  console.log(`- Students: ${students.length}`);
  console.log(`- Attendance Records: ${attendance.length}`);
  console.log(`- Remedial Records: ${remedials.length}`);

  let sql = `-- ============================================================
-- LineCheck+ Local MySQL Database Backup & Init Dump
-- Generated at: ${new Date().toISOString()}
-- Database: linecheck_plus
-- Target: Local MySQL (MAMP / XAMPP / Navicat / Docker / Native MySQL)
-- ============================================================

CREATE DATABASE IF NOT EXISTS \`linecheck_plus\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`linecheck_plus\`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Table structure for User
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`User\`;
CREATE TABLE \`User\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`name\` VARCHAR(191) NOT NULL,
  \`email\` VARCHAR(191) NOT NULL,
  \`password\` VARCHAR(191) NULL,
  \`image\` VARCHAR(191) NULL,
  \`role\` ENUM('TEACHER', 'ADMIN') NOT NULL DEFAULT 'TEACHER',
  \`classrooms\` VARCHAR(191) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`User_email_key\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for Student
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`Student\`;
CREATE TABLE \`Student\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`studentId\` VARCHAR(191) NOT NULL,
  \`title\` VARCHAR(191) NOT NULL,
  \`firstName\` VARCHAR(191) NOT NULL,
  \`lastName\` VARCHAR(191) NOT NULL,
  \`classroom\` VARCHAR(191) NOT NULL,
  \`status\` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`Student_studentId_key\` (\`studentId\`),
  KEY \`Student_classroom_idx\` (\`classroom\`),
  KEY \`Student_status_idx\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for AttendanceRecord
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`AttendanceRecord\`;
CREATE TABLE \`AttendanceRecord\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`studentId\` VARCHAR(191) NOT NULL,
  \`date\` DATE NOT NULL,
  \`status\` ENUM('PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'EXEMPTION') NOT NULL DEFAULT 'PRESENT',
  \`recordedById\` VARCHAR(191) NULL,
  \`remark\` TEXT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`AttendanceRecord_studentId_date_key\` (\`studentId\`, \`date\`),
  KEY \`AttendanceRecord_date_idx\` (\`date\`),
  KEY \`AttendanceRecord_recordedById_fkey\` (\`recordedById\`),
  CONSTRAINT \`AttendanceRecord_studentId_fkey\` FOREIGN KEY (\`studentId\`) REFERENCES \`Student\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`AttendanceRecord_recordedById_fkey\` FOREIGN KEY (\`recordedById\`) REFERENCES \`User\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for RemedialRecord
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`RemedialRecord\`;
CREATE TABLE \`RemedialRecord\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`studentId\` VARCHAR(191) NOT NULL,
  \`targetDate\` DATE NOT NULL,
  \`activityTitle\` VARCHAR(191) NOT NULL,
  \`description\` TEXT NULL,
  \`hoursEarned\` DOUBLE NOT NULL DEFAULT 1,
  \`proofUrl\` VARCHAR(191) NULL,
  \`status\` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  \`approvedById\` VARCHAR(191) NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`RemedialRecord_studentId_status_idx\` (\`studentId\`, \`status\`),
  KEY \`RemedialRecord_targetDate_idx\` (\`targetDate\`),
  KEY \`RemedialRecord_approvedById_fkey\` (\`approvedById\`),
  CONSTRAINT \`RemedialRecord_studentId_fkey\` FOREIGN KEY (\`studentId\`) REFERENCES \`Student\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`RemedialRecord_approvedById_fkey\` FOREIGN KEY (\`approvedById\`) REFERENCES \`User\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;

  // Insert Users
  if (users.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Records of User\n-- ------------------------------------------------------------\n`;
    for (const u of users) {
      sql += `INSERT INTO \`User\` (\`id\`, \`name\`, \`email\`, \`password\`, \`image\`, \`role\`, \`classrooms\`, \`createdAt\`, \`updatedAt\`) VALUES (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.password)}, ${escapeSql(u.image)}, ${escapeSql(u.role)}, ${escapeSql(u.classrooms)}, ${escapeSql(u.createdAt)}, ${escapeSql(u.updatedAt)});\n`;
    }
  }

  // Insert Students
  if (students.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Records of Student\n-- ------------------------------------------------------------\n`;
    for (const s of students) {
      sql += `INSERT INTO \`Student\` (\`id\`, \`studentId\`, \`title\`, \`firstName\`, \`lastName\`, \`classroom\`, \`status\`, \`createdAt\`, \`updatedAt\`) VALUES (${escapeSql(s.id)}, ${escapeSql(s.studentId)}, ${escapeSql(s.title)}, ${escapeSql(s.firstName)}, ${escapeSql(s.lastName)}, ${escapeSql(s.classroom)}, ${escapeSql(s.status)}, ${escapeSql(s.createdAt)}, ${escapeSql(s.updatedAt)});\n`;
    }
  }

  // Insert Attendance
  if (attendance.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Records of AttendanceRecord\n-- ------------------------------------------------------------\n`;
    const chunkSize = 100;
    for (let i = 0; i < attendance.length; i += chunkSize) {
      const chunk = attendance.slice(i, i + chunkSize);
      sql += `INSERT INTO \`AttendanceRecord\` (\`id\`, \`studentId\`, \`date\`, \`status\`, \`recordedById\`, \`remark\`, \`createdAt\`, \`updatedAt\`) VALUES\n`;
      const values = chunk.map((a) => {
        return `  (${escapeSql(a.id)}, ${escapeSql(a.studentId)}, ${escapeDateOnly(a.date)}, ${escapeSql(a.status)}, ${escapeSql(a.recordedById)}, ${escapeSql(a.remark)}, ${escapeSql(a.createdAt)}, ${escapeSql(a.updatedAt)})`;
      });
      sql += values.join(",\n") + ";\n";
    }
  }

  // Insert Remedials
  if (remedials.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Records of RemedialRecord\n-- ------------------------------------------------------------\n`;
    for (const r of remedials) {
      sql += `INSERT INTO \`RemedialRecord\` (\`id\`, \`studentId\`, \`targetDate\`, \`activityTitle\`, \`description\`, \`hoursEarned\`, \`proofUrl\`, \`status\`, \`approvedById\`, \`createdAt\`, \`updatedAt\`) VALUES (${escapeSql(r.id)}, ${escapeSql(r.studentId)}, ${escapeDateOnly(r.targetDate)}, ${escapeSql(r.activityTitle)}, ${escapeSql(r.description)}, ${r.hoursEarned}, ${escapeSql(r.proofUrl)}, ${escapeSql(r.status)}, ${escapeSql(r.approvedById)}, ${escapeSql(r.createdAt)}, ${escapeSql(r.updatedAt)});\n`;
    }
  }

  sql += `\nSET FOREIGN_KEY_CHECKS = 1;\n-- ======================== END OF BACKUP ========================\n`;

  const outPath = path.resolve(process.cwd(), "linecheck_plus_local.sql");
  fs.writeFileSync(outPath, sql, "utf8");

  console.log(`✅ Database successfully exported to: ${outPath}`);
  console.log(`   File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
}

exportDatabase()
  .catch((err) => {
    console.error("Export failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
