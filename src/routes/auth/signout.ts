import { Router } from "express";
import { pool } from "../../database/pool/pool.js";
import crypto from "node:crypto";

export const signOutRouter = Router();

signOutRouter.post("/signout", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const refreshTokenHashed = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await pool.query(
        `
            DELETE FROM refresh_token
            WHERE token_hash = $1
    
            `,
        [refreshTokenHashed],
      );
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/auth",
    });
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      message: "Signed out successfully.",
    });
  } catch (error) {
    return res.status(404).json({
      message: "Resources not found.",
    });
  }
});
