import app, { ensureDatabaseConnection } from "./app.js";
const port = 5000;

ensureDatabaseConnection().then(() => {
  const server = app.listen(port, "0.0.0.0", () => console.log(`Campus Events API running on http://localhost:${port}`));
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error("Backend port 5000 is already in use.");
      process.exit(1);
    }
    console.error("Backend failed to start", error);
    process.exit(1);
  });
}).catch((error: unknown) => {
  console.error("Database connection failed", error);
  process.exit(1);
});