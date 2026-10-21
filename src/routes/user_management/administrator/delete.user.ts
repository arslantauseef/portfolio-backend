import { Router } from "express";
import { pool } from "../../../database/pool/pool.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireRole } from "../../../middleware/requireRole.js";

export const deleteUserRouter = Router();

deleteUserRouter.delete(
  "/:id/deleteuser",
  requireAuth,
  requireRole("Administrator"),
  async (req, res) => {
    const { id } = req.params;

    const userId = Number(id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        message: "Client's request is bad / Syntax error.",
      });
    }
    if (id === "") {
      return res.status(401).json({
        message: "Resource not found",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const isUserExist = await client.query(
        `
        SELECT
        id
        FROM users
        WHERE id = $1
        `,
        [id],
      );

      //   checking whether user(s) has already been deleted or not.
      if (isUserExist.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(401).json({
          message: "The user doesn't exist or as already been deleted.",
        });
      }

      await client.query(
        `
            DELETE FROM users
            WHERE id = $1
            `,
        [id],
      );
      await client.query("COMMIT");

      return res.status(401).json({
        message: "The user has been deleted successfully.",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      return res.status(500).json({
        message: "Internal server error.",
      });
    } finally {
      client.release();
    }
  },
);
