import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  // Ignore the legacy table so Drizzle does not treat it as a rename.
  tablesFilter: ["*", "!user_preferences"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
