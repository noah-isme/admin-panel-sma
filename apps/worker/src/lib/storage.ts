import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

type StorageDriverName = "local" | "supabase" | "r2";

interface StorageDriver {
  upload(filename: string, contents: Buffer, contentType: string): Promise<string>;
}

const CONTENT_TYPE = "application/pdf";

function ensureEnv(name: string, allowEmpty = false): string {
  const value = process.env[name];
  if (!value && !allowEmpty) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function createLocalDriver(): StorageDriver {
  return {
    async upload(filename, contents) {
      const output = `data:${CONTENT_TYPE};base64,${contents.toString("base64")}`;
      if (process.env.NODE_ENV !== "production") {
        console.info("[storage] returning inline data URI for", filename);
      }
      return output;
    },
  };
}

function createR2Driver(): StorageDriver {
  const accountId = ensureEnv("R2_ACCOUNT_ID");
  const accessKeyId = ensureEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = ensureEnv("R2_SECRET_ACCESS_KEY");
  const bucket = ensureEnv("R2_BUCKET");
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return {
    async upload(filename, contents, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: filename,
          Body: contents,
          ContentType: contentType,
        })
      );

      if (publicBase) {
        return `${publicBase}/${filename}`;
      }

      return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${filename}`;
    },
  };
}

function createSupabaseDriver(): StorageDriver {
  const supabaseUrl = ensureEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = ensureEnv("SUPABASE_SERVICE_KEY");
  const bucket = ensureEnv("SUPABASE_BUCKET");

  return {
    async upload(filename, contents, contentType) {
      const endpoint = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;
      const bodyView = new Uint8Array(contents);
      const arrayBuffer = bodyView.buffer;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "content-type": contentType,
          "x-upsert": "true",
        },
        body: arrayBuffer,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Supabase upload failed (${response.status}): ${error}`);
      }

      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
    },
  };
}

export function createStorageDriver(): StorageDriver {
  const rawDriver = ensureEnv("STORAGE_DRIVER", true).toLowerCase();
  const driver = (rawDriver || "local") as StorageDriverName;

  switch (driver) {
    case "local":
      return createLocalDriver();
    case "r2":
      return createR2Driver();
    case "supabase":
      return createSupabaseDriver();
    default:
      throw new Error(`Unsupported STORAGE_DRIVER: ${rawDriver}`);
  }
}

export async function uploadReportPdf(buffer: Buffer): Promise<string> {
  const storage = createStorageDriver();
  const filename = `reports/${nanoid()}.pdf`;
  return storage.upload(filename, buffer, CONTENT_TYPE);
}
