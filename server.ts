import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { spawn, ChildProcess } from "child_process";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PYTHON_BACKEND_HOST = "127.0.0.1";
const PYTHON_BACKEND_PORT = Number(process.env.PYTHON_BACKEND_PORT) || 8001;
const PYTHON_BACKEND_URL = `http://${PYTHON_BACKEND_HOST}:${PYTHON_BACKEND_PORT}`;

let pythonProcess: ChildProcess | null = null;

function startPythonBackend(): ChildProcess {
  const scriptPath = path.resolve(process.cwd(), "python-backend", "dev_server.py");
  const child = spawn("python3", [scriptPath], {
    cwd: path.resolve(process.cwd(), "python-backend"),
    env: {
      ...process.env,
      PYTHON_BACKEND_HOST,
      PYTHON_BACKEND_PORT: String(PYTHON_BACKEND_PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(chunk);
  });
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[Python Backend] Exited with code ${code}`);
    }
  });

  return child;
}

async function waitForPythonBackend(timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`${PYTHON_BACKEND_URL}/api/health`);
      if (resp.ok) return;
    } catch {
      // Backend still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.warn("[Server] Python backend still warming up; continuing startup.");
}

async function proxyToPythonBackend(req: Request, res: Response) {
  const targetUrl = `${PYTHON_BACKEND_URL}${req.originalUrl}`;
  const method = req.method.toUpperCase();

  try {
    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    for (const h of ["authorization", "x-webhook-secret", "x-internal-secret", "x-request-id"]) {
      const val = req.headers[h];
      if (typeof val === "string" && val.trim()) {
        forwardHeaders[h] = val;
      }
    }

    const init: RequestInit = {
      method,
      headers: forwardHeaders,
    };
    if (method !== "GET" && method !== "HEAD") {
      init.body = JSON.stringify(req.body ?? {});
    }

    const upstream = await fetch(targetUrl, init);
    const contentType = upstream.headers.get("content-type") || "application/json";
    const text = await upstream.text();
    res.status(upstream.status).set("Content-Type", contentType).send(text);
  } catch (err) {
    console.error("[Proxy -> Python Backend Error]", err);
    res.status(502).json({ error: "Python backend unavailable" });
  }
}

function registerShutdownHooks() {
  const cleanup = () => {
    if (pythonProcess && !pythonProcess.killed) {
      pythonProcess.kill("SIGTERM");
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === "production";

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  // 1. Launch and proxy API traffic to the Python backend (python-backend/) on port 8001
  pythonProcess = startPythonBackend();
  registerShutdownHooks();
  await waitForPythonBackend();

  app.get("/health", proxyToPythonBackend);
  app.use("/api", proxyToPythonBackend);
  app.use("/sakhi/chat", proxyToPythonBackend);
  app.use("/user", proxyToPythonBackend);
  app.use("/webhook", proxyToPythonBackend);
  app.use("/expert", proxyToPythonBackend);

  // 2. Serve WhatsApp-style Test Console at /whatsapp-console
  const whatsappConsoleDir = path.resolve(process.cwd(), "public", "whatsapp-console");
  if (fs.existsSync(whatsappConsoleDir)) {
    app.use("/whatsapp-console", express.static(whatsappConsoleDir));
  }

  // 3. Serve React + Vite Frontend (JanmaSethu /sakhi & /sakhi/try)
  if (!isProd) {
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "frontend", "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `JanmaSethu Sakhi (Frontend + Python Backend proxy on ${PYTHON_BACKEND_PORT}) listening on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
