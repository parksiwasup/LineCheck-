import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function importDatabase() {
  const sqlFile = path.resolve(__dirname, "..", "linecheck_plus_local.sql");
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ File not found: ${sqlFile}`);
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || "";
  const maskedDbUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`🎯 Target Database: ${maskedDbUrl}`);
  console.log(`📥 Reading SQL file: ${sqlFile}...`);
  const content = fs.readFileSync(sqlFile, "utf8");

  // Filter out comments and split by semicolon
  const statements = content
    .replace(/--.*$/gm, "")
    .split(/;\s*[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("CREATE DATABASE") && !s.startsWith("USE"));

  console.log(`🚀 Executing ${statements.length} SQL statements to local MySQL...`);

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0;");
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (e: any) {
      console.warn(`Warning on statement: ${stmt.slice(0, 40)}... -> ${e.message}`);
    }
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");

  const [users, students, attendance, remedials] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.attendanceRecord.count(),
    prisma.remedialRecord.count(),
  ]);

  console.log(`✅ Import finished successfully!`);
  console.log(`   - Users: ${users}`);
  console.log(`   - Students: ${students}`);
  console.log(`   - Attendance Records: ${attendance}`);
  console.log(`   - Remedial Records: ${remedials}`);
}

importDatabase()
  .catch((err) => {
    console.error("❌ Import error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
