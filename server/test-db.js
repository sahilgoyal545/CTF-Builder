const pool = require("./server/test-db");

async function testDatabase() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:");
    console.error(error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();