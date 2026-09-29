const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "CTF-Builder API is running",
    });
});

// Get all challenges
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
            message: "Failed to load challenges",
        });
    }
});

// Submit a flag
app.post("/api/challenges/:id/submit", async (req, res) => {
    try {
        const challengeId = Number(req.params.id);
        const submittedFlag = req.body.flag;

        if (!submittedFlag) {
            return res.status(400).json({
                correct: false,
                message: "Please submit a flag",
            });
        }

        const result = await pool.query(
            `SELECT id, flag, points
             FROM challenges
             WHERE id = $1`,
            [challengeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                correct: false,
                message: "Challenge not found",
            });
        }

        const challenge = result.rows[0];

        if (submittedFlag === challenge.flag) {
            return res.json({
                correct: true,
                message: "Correct flag!",
                points: challenge.points,
            });
        }

        res.json({
            correct: false,
            message: "Incorrect flag",
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            correct: false,
            message: "Server error",
        });
    }
});

app.listen(PORT, () => {
    console.log(`CTF-Builder server running on http://localhost:${PORT}`);
});