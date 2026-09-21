import type { NextFunction, Request, Response } from "express";

export function requireAdmin(request: Request, response: Response, next: NextFunction) {
  const configuredKey = process.env.ADMIN_API_KEY;
  const suppliedKey = request.header("x-admin-key") ?? request.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredKey || !suppliedKey || suppliedKey !== configuredKey) {
    return response.status(401).json({ message: "Admin authorization required" });
  }
  next();
}