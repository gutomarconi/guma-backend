import { Request, Response, NextFunction } from "express";

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.companyId) {
    // Para POST, PUT, PATCH → adiciona no body
    if (req.body) req.body.companyId = req.user.companyId;

    // Para GET, DELETE → adiciona no query
    if (req.query) req.query.companyId = String(req.user.companyId);
  } else{
    return res.status(400).json({ error: "companyId missing" });
  }
  
  next();
};