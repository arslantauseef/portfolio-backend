import express, { type Request } from "express";
import singInRouter from "../routes/auth/singIn.route.js";
import {
  requiredAuth,
  // type AuthenticateRequest,
} from "../middleware/requiredAuth.js";
import {requireRole} from "../middleware/requiredRole.js"
const app = express();
const port = 3000;

app.use(express.json());

app.get(
  "/auth/admin-check",
  requiredAuth,
  requireRole("Administrator"),
  (_req, res) => {
    res.json({ message: "Administrator access granted." });
  },
);
app.use("/auth", singInRouter);

app.listen(port, () => {
  console.log(`API is listening at our host http://localhost:${port}`);
});
