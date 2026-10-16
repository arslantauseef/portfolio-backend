import { Router } from "express";
import { pool } from "../../database/pool/pool.js";
import * as argon from "argon2";
import jwt from "jsonwebtoken";
import "dotenv/config";
import crypto from "node:crypto";

export const signInRouter = Router();

signInRouter.post("/signin", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      message: "Syntax issue",
    });
  }

  const client = await pool.connect();

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await client.query(
      `
      SELECT
        id,
        name,
        email,
        hashed_password,
        role
        FROM users
        WHERE email = $1
        `,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Resource not found.",
      });
    }

    const user = result.rows[0];

    const passwordMatches = await argon.verify(user.hashed_password, password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const jwtToken = process.env.JWT_SECRET;

    if (!jwtToken)
      return res.status(401).json({
        message: "Missing JWT_TOKEN",
      });

    const accessToken = jwt.sign(
      {
        sub: String(user.id),
        role: user.role,
      },
      jwtToken,
      {
        expiresIn: "15m",
      },
    );
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const refreshTokenHashed = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await client.query("BEGIN");
    const pushIntoUsers = await client.query(
      `
        INSERT INTO refresh_token (
        user_id,
        token_hash,
        expires_at
        )
        VALUES ($1, $2, NOW() + INTERVAL '7 DAYS')
        `,
      [user.id, refreshTokenHashed],
    );
    await client.query('COMMIT')

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Successful.",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.warn({
      Message: error,
    });

    return res.status(500).json({
      message: "Unexpected backend/database error",
    });
  } finally {
    client.release();
  }
});
