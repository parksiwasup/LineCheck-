const { spawn, exec, execSync } = require("child_process");
const os = require("os");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const PORT = 3088;
const APP_URL = `http://localhost:${PORT}`;

function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const LAN_URL = `http://${getLocalNetworkIP()}:${PORT}`;

console.log("=====================================================");
console.log("🎓 LineCheck+ | ระบบเช็คชื่อเข้าแถวและจัดการแก้กิจกรรมเข้าแถว");
console.log("📱 รองรับทุกแพลตฟอร์ม: Windows • macOS • Linux • iOS • Android");
console.log("=====================================================");
console.log(`กำลังเริ่มต้นระบบบนพอร์ต ${PORT}...\n`);

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";
const npmCmd = isWin ? "npm.cmd" : "npm";

function freePort(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const lines = out.split("\n");
      lines.forEach((line) => {
        if (line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== "0" && !isNaN(pid) && Number(pid) !== process.pid) {
            try {
              execSync(`taskkill /pid ${pid} /F >nul 2>&1`);
            } catch {}
          }
        }
      });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
    }
  } catch {}
}

freePort(PORT);

// Copy URL to clipboard (Windows / macOS / Linux)
try {
  const clipCmd = isWin ? "clip" : isMac ? "pbcopy" : "xclip";
  const proc = spawn(clipCmd);
  proc.stdin.write(APP_URL);
  proc.stdin.end();
} catch {}

const server = spawn(npmCmd, ["run", "dev"], {
  cwd: rootDir,
  stdio: "pipe",
  shell: isWin,
});

let openedBrowser = false;

function openUrlCrossPlatform(url) {
  if (isWin) {
    exec(`start ${url}`);
  } else if (isMac) {
    exec(`open ${url}`);
  } else {
    exec(`xdg-open ${url}`);
  }
}

function prefixOutput(stream, prefix, colorCode) {
  if (!stream) return;
  stream.on("data", (chunk) => {
    const lines = chunk.toString().split("\n");
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${line.replace(/\r/g, "")}`);
      }
      if (!openedBrowser && (trimmed.includes(String(PORT)) || trimmed.includes("Ready in"))) {
        openedBrowser = true;
        console.log("\n=====================================================");
        console.log("✨ ระบบ LineCheck+ พร้อมใช้งานแล้ว (ทุกแพลตฟอร์ม)!");
        console.log(`💻 คอมพิวเตอร์ (Local)   : ${APP_URL}`);
        console.log(`📱 มือถือ/แท็บเล็ต (Wi-Fi): ${LAN_URL}`);
        console.log(`📋 คัดลอก ${APP_URL} ลงคลิปบอร์ดแล้ว`);
        console.log("=====================================================\n");
        setTimeout(() => {
          openUrlCrossPlatform(APP_URL);
        }, 1000);
      }
    });
  });
}

prefixOutput(server.stdout, "Next.js", "36");
prefixOutput(server.stderr, "Next.js", "33");

function cleanup() {
  console.log("\nกำลังปิดระบบ LineCheck+...");
  if (isWin && server && server.pid) {
    exec(`taskkill /pid ${server.pid} /T /F`, () => {});
  } else if (server) {
    try {
      server.kill();
    } catch {}
  }
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
