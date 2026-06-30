const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const databaseUrl = match ? match[1] : null;

if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function run() {
  try {
    const res = await sql`SELECT * FROM suas_settings`;
    console.log("Settings rows:", res);
  } catch (err) {
    console.error("Error querying settings:", err);
  }
}

run();
