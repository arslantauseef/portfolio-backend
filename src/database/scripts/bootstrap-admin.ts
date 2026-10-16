import argon from "argon2";
import { input, password } from "@inquirer/prompts";
import { pool } from "../pool/pool.js";

async function bootstrapAdmin() {
  if (process.env.ALLOW_ADMIN_BOOTSTRAP !== "true") {
    throw new Error("Administrator bootstrap is disabled.");
  }

  const name = await input({
    message: "Administrator name:",
    validate: (value) => value.trim().length > 0 || "Name cannot be empty.",
  });

  const email = await input({
    message: "Administrator email:",
    validate: (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || "Email cannot be empty",
  });

  const plainPassword = await password({
    message: "Enter password:",
    validate: (value) =>
      value.length >= 12 || "Password must be at least 12 characters.",
  });

  await password({
    message: "Confirm Password",
    mask: true,
    validate: (value) => value === plainPassword || "Passwords do not match",
  });

  const hashedPassword = await argon.hash(plainPassword);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE users IN EXCLUSIVE MODE");
    const existingAdmin = await client.query(
      `
        SELECT id
        FROM users
        WHERE role = 'Administrator'
        LIMIT 1
        `,
    );

    if (existingAdmin.rows.length > 0) {
      throw new Error("An Administrator already exists.");
    }

    const result = await client.query(
      `
        INSERT INTO users (
        name,
        email,
        hashed_password,
        role
        )
        VALUES ($1,$2,$3,$4)
        RETURNING id, name, email, role
        `,
      [
        name.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        "Administrator",
      ],
    );

    await client.query("COMMIT");

    console.log("Administrator created:", result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await client.end();
  }
}

bootstrapAdmin().catch((error) => {
  console.error(
    "Administrator bootstrap failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
