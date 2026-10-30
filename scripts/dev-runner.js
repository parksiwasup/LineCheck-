const { spawn, exec, execSync } = require("child_process");
const os = require("os");
const path = require("path");
const net = require("net");
const fs = require("fs");

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";
const npmCmd = isWin ? "npm.cmd" : "npm";
const npxCmd = isWin ? "npx.cmd" : "npx";

if (isWin) {
  try {
    execSync("chcp 65001", { stdio: "ignore" });
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

async function isPortOpen(port, host = "127.0.0.1", timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
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
    socket.connect(port, host);
  });
}

async function ensureMySQL() {
  if (await isPortOpen(3306)) {
    console.log("[+] MySQL is running on port 3306.\n");
    return true;
  }

  const candidates = [
    {
      name: "MAMP MySQL",
      bin: "C:\\MAMP\\bin\\mysql\\bin\\mysqld.exe",
      ini: "C:\\Users\\Public\\Documents\\Appsolute\\MAMPPRO\\conf\\my.ini",
    },
    {
      name: "XAMPP MySQL",
      bin: "C:\\xampp\\mysql\\bin\\mysqld.exe",
      ini: "C:\\xampp\\mysql\\bin\\my.ini",
    },
    {
      name: "MySQL Server 8.0",
      bin: "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe",
      ini: "C:\\ProgramData\\MySQL\\MySQL Server 8.0\\my.ini",
    },
    {
      name: "MySQL Server 8.4",
      bin: "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqld.exe",
      ini: "C:\\ProgramData\\MySQL\\MySQL Server 8.4\\my.ini",
    },
    {
      name: "MariaDB",
      bin: "C:\\Program Files\\MariaDB 11.0\\bin\\mysqld.exe",
      ini: "C:\\Program Files\\MariaDB 11.0\\data\\my.ini",
    },
  ];

  for (const c of candidates) {
    if (fs.existsSync(c.bin)) {
      console.log(`[*] Starting MySQL Server (${c.name})...`);
      const args = c.ini && fs.existsSync(c.ini) ? [`--defaults-file=${c.ini}`] : [];
      try {
        const mysqlProc = spawn(c.bin, args, {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        });
        mysqlProc.unref();

        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (await isPortOpen(3306, "127.0.0.1", 500)) {
            console.log(`[+] ${c.name} connected successfully.\n`);
            return true;
          }
        }
      } catch {}
    }
  }

  console.log("[!] Note: Local MySQL server was not detected on port 3306.");
  console.log("    If you use XAMPP or Laragon, please start MySQL from its Control Panel,");
  console.log("    or verify DATABASE_URL in .env if using a Cloud database.\n");
  return false;
}

async function ensureDependencies() {
  const envPath = path.join(rootDir, ".env");
  const envExamplePath = path.join(rootDir, ".env.example");
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log("[*] Creating .env from .env.example...");
    fs.copyFileSync(envExamplePath, envPath);
  }

  const nodeModulesPath = path.join(rootDir, "node_modules");
  const nextCli = path.join(nodeModulesPath, "next", "dist", "bin", "next");
  if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(nextCli)) {
    console.log("\n=====================================================");
    console.log("[*] First-time setup: Installing dependencies (npm install)...");
    console.log("=====================================================\n");
    execSync(`${npmCmd} install --legacy-peer-deps`, { cwd: rootDir, stdio: "inherit" });
  }

  const prismaClient = path.join(nodeModulesPath, ".prisma", "client");
  if (!fs.existsSync(prismaClient)) {
    console.log("[*] Generating Prisma Client...");
    try {
      execSync(`${npxCmd} prisma generate`, { cwd: rootDir, stdio: "inherit" });
    } catch {}
  }
}

async function start() {
  await ensureDependencies();
  await ensureMySQL();
  freePort(PORT);

  try {
    const clipCmd = isWin ? "clip" : isMac ? "pbcopy" : "xclip";
    const proc = spawn(clipCmd);
    proc.stdin.write(APP_URL);
    proc.stdin.end();
  } catch {}

  const nextCli = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");
  const server = spawn(process.execPath, [nextCli, "dev", "-H", "0.0.0.0", "-p", String(PORT)], {
    cwd: rootDir,
    stdio: "pipe",
  });

  let openedBrowser = false;

  function openUrlCrossPlatform(url) {
    if (isWin) {
      exec(`start "" "${url}"`);
    } else if (isMac) {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
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
          }, 800);
        }
      });
    });
  }

  prefixOutput(server.stdout, "Next.js", "36");
  prefixOutput(server.stderr, "Next.js", "33");

  function cleanup() {
    console.log("\nShutting down LineCheck+...");
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
