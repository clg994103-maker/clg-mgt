import type { VercelRequest, VercelResponse } from "@vercel/node";
import app, { ensureDatabaseConnection } from "../src/app.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await ensureDatabaseConnection();
  return app(request, response);
}