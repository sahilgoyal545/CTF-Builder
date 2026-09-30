const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const pool = require("./db");

const {
  seedDemoUsers,
  login,
  authenticateToken,
  requireAdmin,
} = require("./auth");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const PORT = 5000;

app.use(cors());
app.use(express.json());

/* -------------------- REDIS -------------------- */

let redis = null;
let redisAvailable = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  redis.connect()
    .then(() => {
      redisAvailable = true;
      console.log("Redis connected!");
    })
    .catch(() => {
      console.log("Redis not available - using memory fallback.");
    });

  redis.on("error", () => {
    redisAvailable = false;
  });
} catch {
  console.log("Redis not available - using memory fallback.");
}

/* -------------------- RATE LIMIT -------------------- */

const memoryRateLimit = new Map();

async function checkRateLimit(key) {
  const limit = 10;
  const windowSeconds = 60;

  if (redisAvailable && redis) {
    const redisKey = `rate:${key}`;

    const count = await redis.incr(redisKey);

    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    return count <= limit;
  }

  const now = Date.now();
  const previous = memoryRateLimit.get(key);

  if (!previous || now - previous.time > windowSeconds * 1000) {
    memoryRateLimit.set(key, {
      time: now,
      count: 1,
    });

    return true;
  }

  previous.count++;

  return previous.count <= limit;
}

/* -------------------- ROUTES -------------------- */

app.get("/", (req, res) => {
  res.json({
    message: "CTF-Builder API is running",
  });
});

/* -------------------- AUTH -------------------- */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required",
      });
    }

    const result = await login(username, password);

    if (!result) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Login failed",
    });
  }
});

/* -------------------- CHALLENGES -------------------- */

app.get("/api/challenges", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, category, points
      FROM challenges
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch challenges",
    });
  }
});

/* -------------------- CREATE CHALLENGE -------------------- */

app.post(
  "/api/challenges",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        points,
        flag,
      } = req.body;

      if (!title || !description || !category || !points || !flag) {
        return res.status(400).json({
          error: "All fields are required",
        });
      }

      const eventResult = await pool.query(
        "SELECT id FROM events ORDER BY id LIMIT 1"
      );

      if (eventResult.rows.length === 0) {
        return res.status(400).json({
          error: "No event exists",
        });
      }

      const eventId = eventResult.rows[0].id;

      const result = await pool.query(
        `
        INSERT INTO challenges
        (event_id, title, description, category, points, flag)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, description, category, points
        `,
        [
          eventId,
          title,
          description,
          category,
          Number(points),
          flag,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to create challenge",
      });
    }
  }
);

/* -------------------- UPDATE CHALLENGE -------------------- */

app.put(
  "/api/challenges/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const {
        title,
        description,
        category,
        points,
        flag,
      } = req.body;

      const result = await pool.query(
        `
        UPDATE challenges
        SET title = $1,
            description = $2,
            category = $3,
            points = $4,
            flag = $5
        WHERE id = $6
        RETURNING id, title, description, category, points
        `,
        [
          title,
          description,
          category,
          Number(points),
          flag,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Challenge not found",
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to update challenge",
      });
    }
  }
);

/* -------------------- DELETE CHALLENGE -------------------- */

app.delete(
  "/api/challenges/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const result = await pool.query(
        "DELETE FROM challenges WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Challenge not found",
        });
      }

      res.json({
        message: "Challenge deleted successfully",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to delete challenge",
      });
    }
  }
);

/* -------------------- SUBMIT FLAG -------------------- */

app.post(
  "/api/challenges/:id/submit",
  authenticateToken,
  async (req, res) => {
    try {
      const challengeId = Number(req.params.id);
      const submittedFlag = req.body.flag;

      if (!submittedFlag) {
        return res.status(400).json({
          error: "Flag is required",
        });
      }

      const allowed = await checkRateLimit(
        `submit:${req.user.id}`
      );

      if (!allowed) {
        return res.status(429).json({
          error: "Too many submissions. Try again later.",
        });
      }

      const challengeResult = await pool.query(
        `
        SELECT id, flag, points
        FROM challenges
        WHERE id = $1
        `,
        [challengeId]
      );

      if (challengeResult.rows.length === 0) {
        return res.status(404).json({
          error: "Challenge not found",
        });
      }

      const challenge = challengeResult.rows[0];

      if (submittedFlag !== challenge.flag) {
        return res.json({
          correct: false,
          points: 0,
          message: "Incorrect flag.",
        });
      }

      try {
        await pool.query(
          `
          INSERT INTO submissions
          (user_id, challenge_id, submitted_flag)
          VALUES ($1, $2, $3)
          `,
          [
            req.user.id,
            challengeId,
            submittedFlag,
          ]
        );
      } catch (error) {
        if (error.code === "23505") {
          return res.json({
            correct: true,
            alreadySolved: true,
            points: 0,
            message: "Challenge already solved.",
          });
        }

        throw error;
      }

      /* Update Redis leaderboard */

      if (redisAvailable && redis) {
        await redis.zincrby(
          "ctf:leaderboard",
          challenge.points,
          req.user.username
        );
      }

      /* Notify connected clients */

      io.emit("UPDATE_SCOREBOARD", {
        username: req.user.username,
        points: challenge.points,
      });

      res.json({
        correct: true,
        points: challenge.points,
        message: "Correct flag!",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to submit flag",
      });
    }
  }
);

/* -------------------- LEADERBOARD -------------------- */

app.get("/api/leaderboard", async (req, res) => {
  try {
    if (redisAvailable && redis) {
      const results = await redis.zrevrange(
        "ctf:leaderboard",
        0,
        -1,
        "WITHSCORES"
      );

      const leaderboard = [];

      for (let i = 0; i < results.length; i += 2) {
        leaderboard.push({
          username: results[i],
          score: Number(results[i + 1]),
        });
      }

      return res.json(leaderboard);
    }

    const result = await pool.query(`
      SELECT
        u.username,
        COALESCE(SUM(c.points), 0) AS score
      FROM users u
      LEFT JOIN submissions s
        ON u.id = s.user_id
      LEFT JOIN challenges c
        ON c.id = s.challenge_id
      WHERE u.role = 'player'
      GROUP BY u.id, u.username
      ORDER BY score DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch leaderboard",
    });
  }
});

/* -------------------- SOCKET.IO -------------------- */

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

/* -------------------- START SERVER -------------------- */

async function startServer() {
  try {
    await seedDemoUsers();

    server.listen(PORT, () => {
      console.log(
        `CTF-Builder server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

startServer();