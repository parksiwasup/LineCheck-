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
  const possiblePaths = [
    "C:\\Users\\Parksiwasup\\AppData\\Local\\github-copilot-git-2.53.0-4\\cmd\\git.exe",
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Git", "cmd", "git.exe"),
    "C:\\Program Files\\Git\\cmd\\git.exe",
    "C:\\Program Files\\Git\\bin\\git.exe",
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return `"${p}"`;
    }
  }
  return "git";
}

function updateReadme(rootDir, version, commitMsg, extraNote) {
  const readmePath = path.join(rootDir, "README.md");
  if (!fs.existsSync(readmePath)) return;
  let content = fs.readFileSync(readmePath, "utf8");

  const today = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const changelogHeader = "## 📝 ประวัติการอัปเดตระบบ (Changelog)";
  let entryText = `### [${version}] - ${today}\n- ${commitMsg}\n`;
  if (extraNote && extraNote.trim()) {
    entryText += `- ${extraNote.trim()}\n`;
  }

  if (content.includes(changelogHeader)) {
    if (!content.includes(`[${version}]`)) {
      content = content.replace(changelogHeader, `${changelogHeader}\n\n${entryText}`);
    }
  } else {
    content += `\n\n---\n\n${changelogHeader}\n\n${entryText}`;
  }

  fs.writeFileSync(readmePath, content, "utf8");
  console.log(`✓ อัปเดตไฟล์ README.md อัตโนมัติ (บันทึกเวอร์ชัน ${version})`);
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const gitBin = resolveGitBinary();

  console.log("=====================================================");
  console.log(" 🚀 LINECHECK+ GITHUB AUTO-UPLOADER & VERSION MANAGER");
  console.log("=====================================================");
  console.log(`Repository Directory: ${rootDir}\n`);

  let version = "v1.4.1";
  const versionInput = await ask(`ป้อนเลขเวอร์ชัน (กด Enter เพื่อใช้ ${version}): `);
  version = versionInput.trim() || version;

  const defaultMsg = `Release ${version}: ปรับแต่งระบบ LineCheck+ ให้สมบูรณ์และพร้อมใช้งาน`;
  const commitMsgInput = await ask("ข้อความ Commit (กด Enter เพื่อใช้ข้อความเริ่มต้น): ");
  const commitMsg = commitMsgInput.trim() || defaultMsg;

  const extraNote = await ask(
    "รายละเอียดฟังก์ชันใหม่เพิ่มเติมสำหรับบันทึกลง README.md (ถ้าไม่มีกด Enter ได้เลย): "
  );

  updateReadme(rootDir, version, commitMsg, extraNote);

  // ตรวจสอบ token จาก .git-token อัตโนมัติ
  let gitToken = "";
  const tokenFile = path.join(rootDir, ".git-token");
  if (fs.existsSync(tokenFile)) {
    gitToken = fs.readFileSync(tokenFile, "utf8").trim();
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

    // ตรวจสอบ remote origin เดิม ถ้ามี token ให้คงไว้
    let currentOrigin = "";
    try {
      currentOrigin = execSync(`${gitBin} remote get-url origin`, { cwd: rootDir, encoding: "utf8" }).trim();
    } catch {}

    if (!currentOrigin) {
      execSync(`${gitBin} remote add origin ${repoUrl}`, { cwd: rootDir, stdio: "inherit" });
    } else if (!currentOrigin.includes("@github.com") && repoUrl !== defaultRepo) {
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
