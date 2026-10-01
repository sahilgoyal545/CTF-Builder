const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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

const PORT = Number(process.env.PORT || 5000);
const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/$/, "");

app.use(cors());
app.use(express.json());

/* File uploads */
const uploadDirectory = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${safeName}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

app.use("/uploads", express.static(uploadDirectory));

/* Redis */
let redis = null;
let redisAvailable = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  redis
    .connect()
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

/* Rate limit */
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

/* Root */
app.get("/", (req, res) => {
  res.json({
    message: "CTF-Builder API is running",
  });
});

/* Authentication */
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
    console.error("Login error:", error);

    res.status(500).json({
      error: "Login failed",
    });
  }
});

/* Get challenges */
app.get("/api/challenges", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        description,
        category,
        points,
        attachment_path
      FROM challenges
      ORDER BY id
    `);

    const challenges = result.rows.map((challenge) => ({
      ...challenge,
      attachment_url: challenge.attachment_path
        ? `${BACKEND_URL}/${challenge.attachment_path}`
        : null,
    }));

    res.json(challenges);
  } catch (error) {
    console.error("Challenge fetch error:", error);

    res.status(500).json({
      error: "Failed to load challenges",
    });
  }
});

/* Create challenge */
app.post(
  "/api/challenges",
  authenticateToken,
  requireAdmin,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        points,
        flag,
      } = req.body;

      if (
        !title ||
        !description ||
        !category ||
        !points ||
        !flag
      ) {
        return res.status(400).json({
          error: "All challenge fields are required",
        });
      }

      const attachmentPath = req.file
        ? `uploads/${req.file.filename}`
        : null;

      const result = await pool.query(
        `
        INSERT INTO challenges
          (title, description, category, points, flag, attachment_path)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          title,
          description,
          category,
          points,
          attachment_path
        `,
        [
          title,
          description,
          category,
          Number(points),
          flag,
          attachmentPath,
        ]
      );

      const challenge = result.rows[0];

      res.status(201).json({
        ...challenge,
        attachment_url: challenge.attachment_path
          ? `${BACKEND_URL}/${challenge.attachment_path}`
          : null,
      });
    } catch (error) {
      console.error("Challenge creation error:", error);

      res.status(500).json({
        error: "Failed to create challenge",
      });
    }
  }
);

/* Update challenge */
app.put(
  "/api/challenges/:id",
  authenticateToken,
  requireAdmin,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        title,
        description,
        category,
        points,
        flag,
      } = req.body;

      if (
        !title ||
        !description ||
        !category ||
        !points ||
        !flag
      ) {
        return res.status(400).json({
          error: "All challenge fields are required",
        });
      }

      let result;

      if (req.file) {
        const attachmentPath = `uploads/${req.file.filename}`;

        result = await pool.query(
          `
          UPDATE challenges
          SET
            title = $1,
            description = $2,
            category = $3,
            points = $4,
            flag = $5,
            attachment_path = $6
          WHERE id = $7
          RETURNING
            id,
            title,
            description,
            category,
            points,
            attachment_path
          `,
          [
            title,
            description,
            category,
            Number(points),
            flag,
            attachmentPath,
            id,
          ]
        );
      } else {
        result = await pool.query(
          `
          UPDATE challenges
          SET
            title = $1,
            description = $2,
            category = $3,
            points = $4,
            flag = $5
          WHERE id = $6
          RETURNING
            id,
            title,
            description,
            category,
            points,
            attachment_path
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
      }

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Challenge not found",
        });
      }

      const challenge = result.rows[0];

      res.json({
        ...challenge,
        attachment_url: challenge.attachment_path
          ? `${BACKEND_URL}/${challenge.attachment_path}`
          : null,
      });
    } catch (error) {
      console.error("Challenge update error:", error);

      res.status(500).json({
        error: "Failed to update challenge",
      });
    }
  }
);

/* Delete challenge */
app.delete(
  "/api/challenges/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        DELETE FROM challenges
        WHERE id = $1
        RETURNING id
        `,
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
      console.error("Challenge deletion error:", error);

      res.status(500).json({
        error: "Failed to delete challenge",
      });
    }
  }
);

/* Submit flag */
app.post(
  "/api/challenges/:id/submit",
  authenticateToken,
  async (req, res) => {
    try {
      const challengeId = Number(req.params.id);
      const { flag } = req.body;

      if (!flag) {
        return res.status(400).json({
          error: "Flag is required",
        });
      }

      const allowed = await checkRateLimit(
        `user:${req.user.id}:challenge:${challengeId}`
      );

      if (!allowed) {
        return res.status(429).json({
          error: "Too many attempts. Try again later.",
        });
      }

      const challengeResult = await pool.query(
        `
        SELECT id, title, points, flag
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

      if (flag !== challenge.flag) {
        return res.json({
          correct: false,
          message: "Incorrect flag",
        });
      }

      try {
        await pool.query(
          `
          INSERT INTO submissions
            (user_id, challenge_id, submitted_flag)
          VALUES
            ($1, $2, $3)
          `,
          [
            req.user.id,
            challengeId,
            flag,
          ]
        );
      } catch (error) {
        if (error.code === "23505") {
          return res.json({
            correct: false,
            message: "Challenge already solved",
          });
        }

        throw error;
      }

      if (redisAvailable && redis) {
        await redis.zincrby(
          "ctf:leaderboard",
          challenge.points,
          req.user.username
        );
      }

      const leaderboard = await getLeaderboard();

      io.emit("UPDATE_SCOREBOARD", leaderboard);

      res.json({
        correct: true,
        message: `Correct! +${challenge.points} points`,
        points: challenge.points,
      });
    } catch (error) {
      console.error("Submission error:", error);

      res.status(500).json({
        error: "Submission failed",
      });
    }
  }
);

/* Leaderboard */
async function getLeaderboard() {
  if (redisAvailable && redis) {
    const data = await redis.zrevrange(
      "ctf:leaderboard",
      0,
      -1,
      "WITHSCORES"
    );

    const leaderboard = [];

    for (let i = 0; i < data.length; i += 2) {
      leaderboard.push({
        username: data[i],
        score: Number(data[i + 1]),
      });
    }

    return leaderboard;
  }

  const result = await pool.query(`
    SELECT
      u.username,
      COALESCE(SUM(c.points), 0)::int AS score
    FROM users u
    LEFT JOIN submissions s
      ON u.id = s.user_id
    LEFT JOIN challenges c
      ON c.id = s.challenge_id
    WHERE u.role = 'player'
    GROUP BY u.id, u.username
    ORDER BY score DESC, u.username ASC
  `);

  return result.rows;
}

app.get("/api/leaderboard", authenticateToken, async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);

    res.status(500).json({
      error: "Failed to load leaderboard",
    });
  }
});

/* Start server */
async function startServer() {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    await pool.query(schema);

    await seedDemoUsers();

    server.listen(PORT, () => {
      console.log(`CTF-Builder server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
  }
}

startServer();