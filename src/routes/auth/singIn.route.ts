import { Router } from "express";
import { pool } from "../../database/pool/pools.js";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";

const singInRouter = Router();

singInRouter.post("/signin", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  try {
    const result = await pool.query<{
      id: number;
      name: string;
      email: string;
      password_hash: string;
      role: "Administrator" | "Moderator";
    }>(
      `SELECT id, name, email, password_hash, role FROM admins WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    const admin = result.rows[0];

    if (!admin || !(await argon2.verify(admin.password_hash, password))) {
      res.status(500).json({
        message: "Invalid email or password",
      });
      return;
    }

    const token = jwt.sign(
      {
        sub: String(admin.id),
        role: admin.role,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "15m",
      },
    );

    res.json({
      message: "Login Successfull.",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to login.",
    });
  }
});

export default singInRouter;
