import "dotenv/config";
import http from "node:http";

import { QueueEvents, Queue } from "bullmq";
import { Redis } from "ioredis";
import { REPORT_PDF_QUEUE } from "@shared/constants";
import { createReportPdfWorker } from "./queues/report-pdf.js";
import { closeDatabase } from "./lib/database.js";

function resolveRedisConnection(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("Missing REDIS_URL environment variable");
  }
  return new Redis(url, { maxRetriesPerRequest: null });
}

function createQueueEvents(): QueueEvents {
  const connection = resolveRedisConnection();
  return new QueueEvents(REPORT_PDF_QUEUE, { connection });
}

function createQueue(): Queue {
  const connection = resolveRedisConnection();
  return new Queue(REPORT_PDF_QUEUE, { connection });
}

async function bootstrap() {
  const worker = createReportPdfWorker();
  const events = createQueueEvents();
  const scheduleQueue = createQueue();

  const healthPort = parseInt(process.env.HEALTH_PORT || "3002", 10);

  const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && (req.url === "/health" || req.url === "/health/")) {
      try {
        const queueDepth = await scheduleQueue.getWaitingCount();

        const payload = {
          status: "ok",
          queue_depth: queueDepth,
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      } catch (error: any) {
        console.error("[worker:health] error checking queue depth", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "error",
            error: error?.message || "Internal server error",
          })
        );
      }
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });

  server.listen(healthPort, () => {
    console.info(`[worker:health] server listening on port ${healthPort}`);
  });

  worker.on("ready", () => {
    console.info("[worker:report-pdf] ready");
  });

  worker.on("completed", (job) => {
    console.info("[worker:report-pdf] completed", job.id, job.returnvalue);
  });

  worker.on("failed", (job, error) => {
    if (job) {
      console.error("[worker:report-pdf] failed", job.id, error);
    } else {
      console.error("[worker:report-pdf] failed", error);
    }
  });

  events.on("failed", ({ jobId, failedReason }) => {
    console.error("[queue:report-pdf] failed", jobId, failedReason);
  });

  events.on("completed", ({ jobId }) => {
    console.info("[queue:report-pdf] completed", jobId);
  });

  const shutdown = async () => {
    console.info("[worker:report-pdf] shutting down");
    server.close();
    await Promise.allSettled([worker.close(), events.close(), scheduleQueue.close()]);
    await closeDatabase();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void bootstrap();
