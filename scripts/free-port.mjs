import { execSync } from "node:child_process";

const port = process.argv[2] ?? "3000";

try {
  const output = execSync(`netstat -ano | findstr :${port}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) {
      continue;
    }

    const pid = line.trim().split(/\s+/).at(-1);
    if (pid && /^\d+$/.test(pid)) {
      pids.add(pid);
    }
  }

  for (const pid of pids) {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    console.log(`Остановлен процесс ${pid} на порту ${port}`);
  }
} catch {
  // Порт уже свободен или netstat ничего не вернул.
}
