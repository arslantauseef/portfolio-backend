import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireRole } from "../../../middleware/requireRole.js";
import { pool } from "../../../database/pool/pool.js";
import * as argon from "argon2";

export const createUserRouter = Router();
createUserRouter.post(
  "/createuser",
  requireAuth,
  requireRole("Administrator"),
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body ?? {};
      if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof role !== "string"
      ) {
        return res.status(400).json({
          message: "Syntax issue",
        });
      }
      if (email.trim() === "" || password.trim() === "") {
        return res.status(400).json({
          message: "Email and Password cannot be empty",
        });
      }

      const result = await pool.query(
        `
      SELECT
      email
      FROM users
      WHERE email = $1
      `,
        [email.trim()],
      );

      if (result.rows.length > 0) {
        return res.status(401).json({
          message: "User already exist.",
        });
      }

      const passwordHashed = await argon.hash(password.trim());

      const newUser = await pool.query(
        `
      INSERT into users (
      name,
      hashed_password,
      role,
      email
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
      `,
        [name.trim(), passwordHashed, role, email.trim()],
      );

      return res.status(200).json({
        message: `New user ${name} with role ${role} added inside the database`,
        data: newUser.rows[0],
      });
    } catch (error) {
      return res.status(500).json({
        message: "Internal Server Error",
        error,
      });
    }
  },
);
