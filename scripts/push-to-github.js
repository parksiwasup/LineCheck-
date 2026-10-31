const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

function resolveGitBinary() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

  const possiblePaths = [];

  // ตรวจหา Git จาก GitHub Desktop อัตโนมัติ (เลือกเวอร์ชันล่าสุด)
  const ghDesktopDir = path.join(localAppData, "GitHubDesktop");
  if (fs.existsSync(ghDesktopDir)) {
    try {
      const entries = fs.readdirSync(ghDesktopDir).filter((e) => e.startsWith("app-"));
      entries.sort().reverse();
      for (const entry of entries) {
        const ghGit = path.join(ghDesktopDir, entry, "resources", "app", "git", "cmd", "git.exe");
        if (fs.existsSync(ghGit)) {
          possiblePaths.push(ghGit);
        }
      }
    } catch {}
  }

  // ตรวจหา Git จากโฟลเดอร์เครื่องมืออื่นๆ (รวมถึง copilot / portable)
  try {
    const localEntries = fs.readdirSync(localAppData);
    for (const entry of localEntries) {
      if (entry.toLowerCase().includes("git")) {
        const candidate1 = path.join(localAppData, entry, "cmd", "git.exe");
        const candidate2 = path.join(localAppData, entry, "bin", "git.exe");
        if (fs.existsSync(candidate1)) possiblePaths.push(candidate1);
        if (fs.existsSync(candidate2)) possiblePaths.push(candidate2);
      }
    }
  } catch {}

  possiblePaths.push(
    path.join(localAppData, "Programs", "Git", "cmd", "git.exe"),
    path.join(programFiles, "Git", "cmd", "git.exe"),
    path.join(programFiles, "Git", "bin", "git.exe"),
    path.join(programFilesX86, "Git", "cmd", "git.exe"),
    path.join(programFilesX86, "Git", "bin", "git.exe")
  );

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return `"${p}"`;
    }
  }
  return "git";
}

function getSuggestedVersion(rootDir, gitBin) {
  const pkgPath = path.join(rootDir, "package.json");
  let pkgVer = "";
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.version) pkgVer = `v${pkg.version}`;
    } catch {}
  }

  const readmePath = path.join(rootDir, "README.md");
  if (!fs.existsSync(readmePath)) return pkgVer || "v2.0.1";
  try {
    const content = fs.readFileSync(readmePath, "utf8");
    const match = content.match(/### \[v?([0-9]+)\.([0-9]+)\.([0-9]+)\]/);
    if (match) {
      const currentReadmeVer = `v${match[1]}.${match[2]}.${match[3]}`;
      // ถ้าเวอร์ชันนี้ยังไม่เคยถูก commit ใน Git log ให้ใช้เวอร์ชันนี้เป็นค่าแนะนำ
      try {
        const commitCheck = execSync(`${gitBin} log -n 10 --grep="${currentReadmeVer}" --oneline`, {
          cwd: rootDir,
          encoding: "utf8",
        }).trim();
        if (!commitCheck) {
          return currentReadmeVer;
        }
      } catch {}

      // หากเคยถูก commit ไปแล้ว ให้ขยับเลข patch ขึ้น 1 ขั้น
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      const patch = parseInt(match[3], 10) + 1;
      return `v${major}.${minor}.${patch}`;
    }
  } catch {}
  return pkgVer || "v2.0.1";
}

/**
 * วิเคราะห์ไฟล์ที่มีการเปลี่ยนแปลงใน Git แล้วสร้างสรุป Changelog ภาษาไทยแบบอัตโนมัติ
 */
function analyzeGitChanges(rootDir, gitBin) {
  const bullets = new Set();
  try {
    const output = execSync(`${gitBin} status --porcelain`, {
      cwd: rootDir,
      encoding: "utf8",
    });

    const lines = output.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const changedFiles = lines.map((l) => l.slice(3).trim());

    for (const f of changedFiles) {
      const normalized = f.replace(/\\/g, "/");

      if (normalized.includes("three-d-attendance-chart") || normalized.includes("three-d-donut")) {
        bullets.add("ปรับแต่งกราฟสถิติ 3D (จัดตำแหน่งกึ่งกลางสมมาตร, ลดระยะห่างส่วนเกิน และระบุหน่วยแกน คน/%)");
      } else if (normalized.includes("student-monthly-calendar")) {
        bullets.add("ปรับปรุงระบบปฏิทินเช็คชื่อรายเดือน (รองรับการแสดงผลหน้าจอมือถือ, Squircle วันที่ และป้ายสถานะกระชับ)");
      } else if (normalized.includes("src/components/ui/badge")) {
        bullets.add("แก้ไขการจัดวาง Badge สถานะ ป้องกันข้อความหดตัวหรือบิดเบี้ยวบนอุปกรณ์พกพา");
      } else if (normalized.includes("dashboard-client")) {
        bullets.add("ปรับปรุงแดชบอร์ดสรุปภาพรวม และหน้าต่างเจาะลึกข้อมูลรายห้องเรียน (Classroom Drill-down Modal)");
      } else if (normalized.includes("student-portal") || normalized.includes("src/app/portal")) {
        bullets.add("ปรับแต่งระบบพอร์ทัลนักเรียน (Student Portal) ให้แสดงผลชิปและข้อมูลพอดีจอสมาร์ตโฟน");
      } else if (normalized.includes("remedial") || normalized.includes("src/actions/remedial")) {
        bullets.add("ปรับปรุงระบบแก้กิจกรรมเข้าแถว การส่งหลักฐาน และตรรกะการคำนวณชดเชยเวลาเข้าแถว");
      } else if (normalized.includes("attendance-rules")) {
        bullets.add("ปรับปรุงเกณฑ์ระเบียบการเช็คชื่อ กฎการคำนวณสถิติ และการประมวลผลวันเข้าแถว");
      } else if (normalized.includes("src/actions/")) {
        bullets.add("ปรับปรุงและเพิ่มประสิทธิภาพ Server Actions ในการรับ-ส่งข้อมูลกับฐานข้อมูล");
      } else if (normalized.includes("admin-backoffice") || normalized.includes("src/actions/admin")) {
        bullets.add("พัฒนาระบบบริหารจัดการหลังบ้าน (Back-Office Admin Control Center)");
      } else if (normalized.includes("theme-provider") || normalized.includes("app-shell") || normalized.includes("sidebar")) {
        bullets.add("ปรับแต่งเลย์เอาต์ แถบเนวิเกชัน และความเข้ากันได้กับโหมดสว่าง/มืด (Theme)");
      } else if (normalized.includes(".bat") || normalized.includes("scripts/")) {
        bullets.add("ปรับปรุงสคริปต์อัตโนมัติสำหรับการ Deploy และการทำงานข้ามอุปกรณ์ (Multi-Device)");
      } else if (normalized.includes("prisma/") || normalized.includes("seed.ts")) {
        bullets.add("ปรับปรุงโครงสร้างฐานข้อมูลและชุดข้อมูลระบบ");
      } else if (normalized.includes("package.json")) {
        bullets.add("อัปเดตเวอร์ชันและแพ็กเกจระบบ");
      }
    }
  } catch {}

  if (bullets.size === 0) {
    bullets.add("ปรับปรุงและเพิ่มประสิทธิภาพการทำงานของระบบ LineCheck+ ให้สมบูรณ์และพร้อมใช้งาน");
  }

  return Array.from(bullets);
}

function updateReadme(rootDir, version, commitMsg, extraNote, autoBullets) {
  const readmePath = path.join(rootDir, "README.md");
  if (!fs.existsSync(readmePath)) return;
  let content = fs.readFileSync(readmePath, "utf8");

  const today = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const changelogHeader = "## 📝 ประวัติการอัปเดตระบบ (Changelog)";
  
  // สร้างรายการบันทึกแบบละเอียด
  let entryText = `### [${version}] - ${today}\n`;
  entryText += `- **${commitMsg}**:\n`;
  if (autoBullets && autoBullets.length > 0) {
    for (const b of autoBullets) {
      entryText += `  - ${b}\n`;
    }
  }
  if (extraNote && extraNote.trim()) {
    entryText += `  - ${extraNote.trim()}\n`;
  }

  if (content.includes(changelogHeader)) {
    if (!content.includes(`[${version}]`)) {
      content = content.replace(changelogHeader, `${changelogHeader}\n\n${entryText}`);
      fs.writeFileSync(readmePath, content, "utf8");
      console.log(`✓ บันทึก Changelog ละเอียดลง README.md อัตโนมัติ (เวอร์ชัน ${version})`);
    } else {
      console.log(`ℹ️ เวอร์ชัน ${version} มีบันทึกรายละเอียดอยู่ใน README.md แล้ว`);
    }
  }
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const gitBin = resolveGitBinary();

  console.log("=====================================================");
  console.log(" 🚀 LINECHECK+ GITHUB AUTO-UPLOADER & VERSION MANAGER");
  console.log("=====================================================");
  console.log(`Repository Directory: ${rootDir}\n`);

  try {
    execSync(`${gitBin} --version`, { stdio: "ignore" });
  } catch {
    console.log("❌ [ERROR] ไม่พบโปรแกรม Git บนเครื่องนี้ (Git is not installed or not in PATH)!");
    console.log("   กรุณาดาวน์โหลดและติดตั้ง Git จาก: https://git-scm.com/download/win");
    console.log("=====================================================\n");
    rl.close();
    return;
  }

  // 1. วิเคราะห์การเปลี่ยนแปลงอัตโนมัติ
  console.log("🔍 กำลังวิเคราะห์ไฟล์ที่มีการแก้ไขในระบบ...");
  const autoBullets = analyzeGitChanges(rootDir, gitBin);
  console.log("📋 รายการสรุปการอัปเดตอัตโนมัติ:");
  autoBullets.forEach((b) => console.log(`   • ${b}`));
  console.log("");

  // 2. ดึงเวอร์ชันแนะนำ
  const suggestedVer = getSuggestedVersion(rootDir, gitBin);
  const versionInput = await ask(`ป้อนเลขเวอร์ชัน (กด Enter เพื่อใช้ ${suggestedVer}): `);
  const version = versionInput.trim() || suggestedVer;

  const defaultMsg = `Release ${version}: อัปเดตระบบ LineCheck+ ให้สมบูรณ์และพร้อมใช้งาน`;
  const commitMsgInput = await ask("ข้อความ Commit (กด Enter เพื่อใช้ข้อความเริ่มต้น): ");
  const commitMsg = commitMsgInput.trim() || defaultMsg;

  const extraNote = await ask(
    "รายละเอียดฟังก์ชันใหม่เพิ่มเติม (ถ้าไม่มีกด Enter ได้เลย): "
  );

  // 3. อัปเดต README.md อัตโนมัติแบบมีหัวข้อย่อยเต็มรูปแบบ
  updateReadme(rootDir, version, commitMsg, extraNote, autoBullets);

  // 4. ตรวจสอบ .git-token
  let gitToken = "";
  const tokenFile = path.join(rootDir, ".git-token");
  if (fs.existsSync(tokenFile)) {
    gitToken = fs.readFileSync(tokenFile, "utf8").trim();
  } else {
    console.log("ℹ️ ตรวจพบว่าย้ายมาเครื่องใหม่ หรือยังไม่มีไฟล์ .git-token สำหรับสิทธิ์ Push");
    const inputToken = await ask("🔑 กรุณาวาง GitHub Token ของคุณ (ทำครั้งเดียว ระบบจะจำไว้ตลอดไป): ");
    if (inputToken.trim()) {
      gitToken = inputToken.trim();
      fs.writeFileSync(tokenFile, gitToken, "utf8");
      console.log("✓ บันทึกไฟล์ .git-token ลงในเครื่องนี้เรียบร้อยแล้ว ไม่ต้องพิมพ์ใหม่อีกในครั้งถัดไป\n");
    }
  }

  const defaultRepo = gitToken
    ? `https://${gitToken}@github.com/parksiwasup/LineCheck-.git`
    : "https://github.com/parksiwasup/LineCheck-.git";
  const repoUrlInput = await ask(
    `\nป้อน GitHub Repository URL (กด Enter เพื่อใช้ "${defaultRepo.replace(/https:\/\/[^@]+@/, "https://")}"): `
  );
  const repoUrl = repoUrlInput.trim() || defaultRepo;

  try {
    console.log("\n[1/4] ตรวจสอบและตั้งค่า Git Repository...");
    if (!fs.existsSync(path.join(rootDir, ".git"))) {
      execSync(`${gitBin} init`, { cwd: rootDir, stdio: "inherit" });
    }
    execSync(`${gitBin} branch -M main`, { cwd: rootDir, stdio: "ignore" });

    let currentOrigin = "";
    try {
      currentOrigin = execSync(`${gitBin} remote get-url origin`, { cwd: rootDir, encoding: "utf8" }).trim();
    } catch {}

    if (!currentOrigin) {
      execSync(`${gitBin} remote add origin ${repoUrl}`, { cwd: rootDir, stdio: "inherit" });
    } else if (repoUrl.includes("@github.com") || repoUrl !== defaultRepo) {
      execSync(`${gitBin} remote set-url origin ${repoUrl}`, { cwd: rootDir, stdio: "inherit" });
    }

    console.log("[2/4] จัดเตรียมไฟล์เข้าสู่ Staging...");
    execSync(`${gitBin} add .`, { cwd: rootDir, stdio: "inherit" });

    console.log(`[3/4] สร้าง Commit เวอร์ชัน ${version}...`);
    try {
      execSync(`${gitBin} commit -m "${commitMsg} (${version})"`, {
        cwd: rootDir,
        stdio: "inherit",
      });
    } catch {
      console.log("ℹ️ ไม่มีการเปลี่ยนแปลงไฟล์ใหม่ หรือ Commit ไปแล้ว");
    }

    console.log("[4/4] กำลังอัปโหลดขึ้น GitHub Repository...");
    execSync(`${gitBin} push -u origin main --force`, {
      cwd: rootDir,
      stdio: "inherit",
    });

    console.log("\n=====================================================");
    console.log(" 🎉 อัปโหลด LineCheck+ ขึ้น GITHUB เรียบร้อยแล้ว!");
    console.log(` 📌 เวอร์ชัน: ${version}`);
    console.log(` 🌐 URL: ${repoUrl}`);
    console.log("=====================================================\n");
  } catch (err) {
    console.error("\n❌ เกิดข้อผิดพลาดในการ Push ขึ้น GitHub:", err.message);
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
});
