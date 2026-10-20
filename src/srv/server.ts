// IMPORTS
import express from "express";
import "dotenv/config";
import { pool } from "../database/pool/pool.js";
import { signInRouter } from "../routes/auth/signin.js";
import cookieParser from "cookie-parser";
import { signOutRouter } from "../routes/auth/signout.js";
import { refreshRouter } from "../routes/auth/refresh.js";
import { testRouter } from "../routes/auth/test-route.js";
import { meRouter } from "../routes/auth/me.js";
import { createUserRouter } from "../routes/user_management/create.user.js";
import { getUsersRouter } from "../routes/user_management/get.users.js";
import { patchUsersRouter } from "../routes/user_management/patch.users.js";
// IMPORTS

// DEFINE
const app = express();
const port = process.env.PORT ?? 3000;
app.use(express.json());
app.use(cookieParser());
// DEFINE

// ROUTES
// --------Auth----------
app.use("/auth", signInRouter);
app.use("/auth", signOutRouter);
app.use("/auth", refreshRouter);
app.use("/auth", testRouter);
app.use("/auth", meRouter);
// --------Auth----------

// --------users manager----------
app.use("/users", createUserRouter);
app.use("/users", getUsersRouter);
app.use("/users", patchUsersRouter);
// --------users manager----------
// ROUTES

app.get("/", async (req, res) => {
  const result = await pool.query(`
    SELECT NOW() AS database_time
    `);

  res.status(200).json({
    message: "Portfolio API is running.",
    Result: result.rows,
  });
});

app.listen(port, () => {
  console.log({
    PORT: port,
    LIVE_AT: `http://localhost:${port}/`,
  });
});
