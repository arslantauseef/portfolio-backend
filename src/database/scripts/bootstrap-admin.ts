
import express from "express";
import * as argon2 from "argon2";
import { input, password } from "@inquirer/prompts";
import { pool } from "../../database/pool/pools.js";

 async function main(){
  const name = await input({
    message: "Administrator name:",
    validate: (value) => value.trim().length > 0 && value.trim().length <= 100,
  });

  const email = await input({
    message: "Administrator email:",
    validate: (value) =>
      (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 255) ||
      "Enter a valid email address.",
  });

  const plainPassword = await password({
    message: "Administrator password (at least 12 characters):",
    mask: true,
    validate: (value) => value.length >= 12 || "Use at least 12 characters.",
  });

  await password({
    message: "Confirm Password",
    mask: true,
    validate: (value) =>
      value === plainPassword || "The passwords do not match.",
  });

  const passwordHash = await argon2.hash(plainPassword)
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE admins IN EXCLUSIVE MODE");

    const existing = await client.query<{admin_count: number}>(
      "SELECT COUNT(*)::int AS admin_count FROM admins WHERE role = $1",
      ["Administrator"]
    )

    if((existing.rows[0]?.admin_count ?? 0) > 0)
      throw new Error("An Administrator already exists; refusing to add another.")

    const result = await client.query(
      `INSERT INTO admins (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, "Administrator"]
    );

    await client.query("COMMIT");
    console.log("Administrator Created", result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown)=> {
  console.error(
    "admin setup failed",
    error instanceof Error ? error.message: "Unknown error",
  )
  process.exitCode = 1
})
