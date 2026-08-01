import "dotenv/config";

import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { REPORT_PDF_QUEUE } from "@shared/constants";
import { createReportPdfWorker } from "./queues/report-pdf.js";
import { closeDatabase } from "./lib/database.js";

function createQueueEvents(): QueueEvents {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("Missing REDIS_URL environment variable");
  }

  return new QueueEvents(REPORT_PDF_QUEUE, {
    connection: new Redis(url, { maxRetriesPerRequest: null }),
  });
}

async function bootstrap() {
  const worker = createReportPdfWorker();
  const events = createQueueEvents();

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
    await Promise.allSettled([worker.close(), events.close()]);
    await closeDatabase();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void bootstrap();
