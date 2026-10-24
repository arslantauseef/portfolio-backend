import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../../database/pool/pool.js";
import type { PoolClient } from "pg";
import jwt from "jsonwebtoken";

export const refreshRouter = Router();

refreshRouter.post("/refreshtoken", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token doesn't exist",
    });
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const result = await client.query(
      `
        SELECT
        refresh_token.id,
        refresh_token.user_id,
        users.role
        FROM refresh_token
        JOIN users
            ON users.id = refresh_token.user_id
        WHERE refresh_token.token_hash = $1
            AND refresh_token.expires_at > NOW()
        FOR UPDATE OF refresh_token
        `,
      [refreshTokenHash],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      const isProduction = process.env.NODE_ENV === "production";

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/auth",
      });

      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    const storedToken = result.rows[0];

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is missing.");
    }

    const newAccessToken = jwt.sign(
      {
        sub: String(storedToken.user_id),
        role: storedToken.role,
      },
      jwtSecret,
      {
        expiresIn: "15m",
      },
    );

    const newRefreshToken = crypto.randomBytes(64).toString("hex");
    const newRefreshTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    await client.query(
      `
      DELETE FROM refresh_token
      WHERE id = $1
      `,
      [storedToken.id],
    );

    await client.query(
      `
      INSERT into refresh_token (
      user_id,
      token_hash,
      expires_at      
      )
      VALUES ($1, $2, NOW() + INTERVAL '7 DAYS')
      `,
      [storedToken.user_id, newRefreshTokenHash],
    );

    await client.query("COMMIT");
    transactionStarted = false;

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/auth",
    });

    return res.status(200).json({
      message: "Tokens refreshed successfully.",
    });
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK");
      transactionStarted = false;
    }

    return res.status(500).json({
      message: "Internal Server Error",
    });
  } finally {
    client?.release();
  }
});
