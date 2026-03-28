import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getTokenFromRequest } from "../utils/authCookie.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      res.status(401).json({ message: "No token provided, unauthorized" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { id: string };

    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
