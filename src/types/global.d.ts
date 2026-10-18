export {};

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: UserRole;
      };
    }
  }
  type UserRole = "Administrator" | "Moderator" | "User";
}
