declare global {
  namespace Express {
    interface Request {
      user?: {
        userId?: number;
        companyId?: number;
        type: "user" | "apikey";
        role?: "superadmin" | "admin" | "user" | "service";
      };
    }
  }
}

export {}