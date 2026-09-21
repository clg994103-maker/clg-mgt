import mongoose from "mongoose";
import dns from "node:dns";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DNS_SERVERS = process.env.MONGODB_DNS_SERVERS?.split(",").map((server) => server.trim()).filter(Boolean);
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalCache = globalThis as typeof globalThis & { mongooseCache?: Cache };
const cached = globalCache.mongooseCache ?? { conn: null, promise: null };
globalCache.mongooseCache = cached;

export async function connectToDatabase() {
  if (!MONGODB_URI) return null;
  if (MONGODB_DNS_SERVERS?.length) dns.setServers(MONGODB_DNS_SERVERS);
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(MONGODB_URI, { dbName: "campus-events" });
  cached.conn = await cached.promise;
  return cached.conn;
}