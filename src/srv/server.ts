// IMPORTS
import express from "express";
import "dotenv/config";
import { pool } from "../database/pool/pool.js";
import { signInRouter } from "../routes/auth/signin.js";
// IMPORTS

// DEFINE
const app = express();
const port = process.env.PORT ?? 3000;
app.use(express.json());
// DEFINE


// ROUTES
app.use("/auth", signInRouter)
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
