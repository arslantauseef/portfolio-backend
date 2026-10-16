import { pool } from "../pool/pool.js";
import { readFile, readdir } from "node:fs/promises";

const migrationsDirectory = new URL("../migrations/", import.meta.url);

async function migrate() {
  const client = await pool.connect();


  try {
    await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        `);

    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const existingFiles = await client.query(
        `
            SELECT id
            FROM migrations
            WHERE filename = $1
            `,
        [file],
      );

      if (existingFiles.rows.length > 0) {
        console.warn(`\x1b[37mAlready Exists: \x1b[34m${file}\x1b[0m`);
        continue;
      }

      const sql = await readFile(new URL(file, migrationsDirectory), "utf-8");

      try {
        await client.query(`BEGIN`);

        await client.query(sql);

        await client.query(
          `

            INSERT INTO migrations (filename)
            VALUES ($1)
            `,
          [file],
        );

        await client.query(`COMMIT`);

        console.log(`\x1b[37mMigrated: \x1b[35m${file}\x1b[0m`);
      } catch (error) {
        await client.query(`ROLLBACK`);
        throw error;
      }
    }

    console.log(`\x1b[37mMigration(s) \x1b[32mcompleted\x1b[0m`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Migration Failed:", error);
  process.exitCode = 1;
});
