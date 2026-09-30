const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const JWT_SECRET =
  process.env.JWT_SECRET || "ctf-builder-development-secret";

async function seedDemoUsers() {
  const adminPassword = "Admin@123";
  const playerPassword = "Player@123";

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const playerHash = await bcrypt.hash(playerPassword, 10);

  await pool.query(
    `
    INSERT INTO users (username, password_hash, role)
    VALUES ($1, $2, 'admin')
    ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role = 'admin'
    `,
    ["admin", adminHash]
  );

  await pool.query(
    `
    INSERT INTO users (username, password_hash, role)
    VALUES ($1, $2, 'player')
    ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role = 'player'
    `,
    ["player", playerHash]
  );

  console.log("Demo users ready.");
}

async function login(username, password) {
  const result = await pool.query(
    `
    SELECT id, username, password_hash, role
    FROM users
    WHERE username = $1
    `,
    [username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  const validPassword = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!validPassword) {
    return null;
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "8h",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch {
    return res.status(403).json({
      error: "Invalid or expired token",
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required",
    });
  }

  next();
}

module.exports = {
  seedDemoUsers,
  login,
  authenticateToken,
  requireAdmin,
};