import { Worker, Job } from "bullmq";
import { eq } from "drizzle-orm";
import { Redis } from "ioredis";
import { REPORT_PDF_QUEUE } from "@shared/constants";
import { reportPdfJobSchema, type ReportPdfJobData } from "@shared/schemas";
import { reportJobs } from "@shared/db/schema";
import type { Database } from "@shared/db/client";
import { buildReportPdfPayload } from "../lib/report-data.js";
import { generateReportPdf } from "../lib/pdf.js";
import { getDatabase, closeDatabase } from "../lib/database.js";
import { uploadReportPdf } from "../lib/storage.js";

export type ReportPdfJob = ReportPdfJobData;

export interface ReportPdfResult {
  url: string;
}

async function updateJobStatus(
  db: Database,
  jobId: string,
  status: string,
  pdfUrl: string | null = null
) {
  await db
    .update(reportJobs)
    .set({
      status,
      pdfUrl,
      updatedAt: new Date(),
    })
    .where(eq(reportJobs.id, jobId));
}

function resolveRedisConnection(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("Missing REDIS_URL environment variable");
  }
  return new Redis(url, {
    maxRetriesPerRequest: null,
  });
}

export function createReportPdfWorker(): Worker<ReportPdfJob, ReportPdfResult> {
  const connection = resolveRedisConnection();
  const db = getDatabase();

  const worker = new Worker<ReportPdfJob, ReportPdfResult>(
    REPORT_PDF_QUEUE,
    async (job: Job<ReportPdfJob, ReportPdfResult>) => {
      const parsed = reportPdfJobSchema.safeParse(job.data);
      if (!parsed.success) {
        console.error("[worker:report-pdf] invalid payload", parsed.error.flatten());
        throw new Error("Invalid report job payload");
      }

      const payload = parsed.data;

      await updateJobStatus(db, payload.reportJobId, "processing");

      try {
        const reportData = await buildReportPdfPayload(db, payload.reportJobId);
        const pdf = await generateReportPdf(reportData);
        const url = await uploadReportPdf(pdf);

        await updateJobStatus(db, payload.reportJobId, "completed", url);
        return { url };
      } catch (error) {
        console.error("[worker:report-pdf] processing failed", payload.reportJobId, error);
        await updateJobStatus(db, payload.reportJobId, "failed", null);
        throw error;
      }
    },
    { connection }
  );

  worker.on("closed", () => {
    void connection.quit();
    void closeDatabase();
  });

  worker.on("error", (error) => {
    console.error("[worker:report-pdf] error", error);
  });

  return worker;
}
