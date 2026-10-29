const { spawn, exec, execSync } = require("child_process");
const os = require("os");
const path = require("path");
const net = require("net");
const fs = require("fs");

if (process.platform === "win32") {
  try {
    execSync("chcp 874", { stdio: "ignore" });
  } catch {}
}

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
console.log(">> LineCheck+ | Student Attendance & Remedial System");
console.log(">> Multi-Platform: Windows * macOS * Linux * iOS * Android");
console.log("=====================================================");
console.log(`Starting dev server on port ${PORT}...\n`);

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

async function ensureMySQL() {
  const is3306Open = await new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1200);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      resolve(false);
    });
    socket.connect(3306, "127.0.0.1");
  });

  if (is3306Open) {
    return true;
  }

  const mampMysql = "C:\\MAMP\\bin\\mysql\\bin\\mysqld.exe";
  const mampIni = "C:\\Users\\Public\\Documents\\Appsolute\\MAMPPRO\\conf\\my.ini";
  if (fs.existsSync(mampMysql)) {
    console.log("[*] Starting MySQL Server (MAMP)...");
    const args = fs.existsSync(mampIni) ? [`--defaults-file=${mampIni}`] : [];
    try {
      const mysqlProc = spawn(mampMysql, args, {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      mysqlProc.unref();

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const ready = await new Promise((resolve) => {
          const s = new net.Socket();
          s.setTimeout(500);
          s.on("connect", () => {
            s.destroy();
            resolve(true);
          });
          s.on("timeout", () => {
            s.destroy();
            resolve(false);
          });
          s.on("error", () => {
            resolve(false);
          });
          s.connect(3306, "127.0.0.1");
        });
        if (ready) {
          console.log("[+] MySQL connected successfully.\n");
          return true;
        }
      }
    } catch {}
  }
  return false;
}

async function ensureDependencies() {
  const envPath = path.join(rootDir, ".env");
  const envExamplePath = path.join(rootDir, ".env.example");
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log("[*] สร้างไฟล์ .env อัตโนมัติจาก .env.example...");
    fs.copyFileSync(envExamplePath, envPath);
  }

  const nodeModulesPath = path.join(rootDir, "node_modules");
  const nextBin = path.join(nodeModulesPath, ".bin", isWin ? "next.cmd" : "next");
  if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(nextBin)) {
    console.log("\n=====================================================");
    console.log("[*] ตรวจพบการรันครั้งแรกบนเครื่องใหม่!");
    console.log("[*] กำลังติดตั้ง Dependencies อัตโนมัติ (npm install)...");
    console.log("=====================================================\n");
    execSync(`${npmCmd} install --legacy-peer-deps`, { cwd: rootDir, stdio: "inherit" });
  }

  const prismaClient = path.join(nodeModulesPath, ".prisma", "client");
  if (!fs.existsSync(prismaClient)) {
    console.log("[*] กำลังสร้าง Prisma Client...");
    const npxCmd = isWin ? "npx.cmd" : "npx";
    try {
      execSync(`${npxCmd} prisma generate`, { cwd: rootDir, stdio: "inherit" });
    } catch {}
  }
}

async function start() {
  await ensureDependencies();
  await ensureMySQL();
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
          console.log("[+] LineCheck+ System is Ready!");
          console.log(`[*] Computer (Local)   : ${APP_URL}`);
          console.log(`[*] Mobile / Wi-Fi     : ${LAN_URL}`);
          console.log(`[*] Copied URL to clipboard: ${APP_URL}`);
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
}

start();
