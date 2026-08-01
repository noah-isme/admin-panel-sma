import "dotenv/config";
import { createDatabasePool, createDbClient } from "@apps/shared/db/client";
import { users } from "@apps/shared/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "postgres://sma:sma@localhost:5432/sma_dev";
  const pool = createDatabasePool(databaseUrl);
  const db = createDbClient(pool);

  try {
    const rows = await db.select().from(users).where(eq(users.role, "SUPERADMIN"));
    if (!rows || rows.length === 0) {
      console.log("No SUPERADMIN user found.");
      return;
    }

    for (const row of rows) {
      // Mask password hash
      const { password, ...rest } = row as any;
      console.log("SUPERADMIN:", rest);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
