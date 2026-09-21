import net from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";

const port = 3000;

function checkPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") reject(new Error("Frontend port 3000 is already in use."));
      else reject(error);
    });
    server.listen(port, () => server.close(() => resolve()));
  });
}

try {
  await checkPort();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const nextCli = path.resolve(process.cwd(), "../node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextCli, "dev", "-H", "0.0.0.0", "-p", String(port)], { stdio: "inherit", shell: false });
child.on("error", (error) => {
  console.error(`Could not start frontend on port ${port}: ${error.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
