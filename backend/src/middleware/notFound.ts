import type { Request, Response } from "express";

/**
 * Middleware for handling undefined / unhandled API routes (404 Not Found)
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    status: 404,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    error: "NotFoundError",
    timestamp: new Date().toISOString(),
  });
};

export default notFoundHandler;
