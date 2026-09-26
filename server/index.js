const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "CTF-Builder API is running"
    });
});

// Demo challenges
const challenges = [
    {
        id: 1,
        title: "Welcome Challenge",
        category: "Web",
        description: "Find the flag hidden in this challenge.",
        points: 100,
        flag: "CTF{welcome_to_ctf_builder}"
    },
    {
        id: 2,
        title: "Caesar's Secret",
        category: "Crypto",
        description: "Decode the secret message.",
        points: 150,
        flag: "CTF{caesar_was_here}"
    },
    {
        id: 3,
        title: "Lost Evidence",
        category: "Forensics",
        description: "Investigate the evidence and find the flag.",
        points: 200,
        flag: "CTF{forensics_master}"
    },
    {
        id: 4,
        title: "Hidden Path",
        category: "Web",
        description: "Discover the hidden path.",
        points: 250,
        flag: "CTF{hidden_path_found}"
    },
    {
        id: 5,
        title: "Final Challenge",
        category: "Crypto",
        description: "Solve the final challenge.",
        points: 300,
        flag: "CTF{final_challenge_complete}"
    }
];

// Get all challenges
app.get("/api/challenges", (req, res) => {
    const safeChallenges = challenges.map(({ flag, ...challenge }) => challenge);

    res.json(safeChallenges);
});

// Submit a flag
app.post("/api/challenges/:id/submit", (req, res) => {
    const challengeId = Number(req.params.id);
    const submittedFlag = req.body.flag;

    const challenge = challenges.find(c => c.id === challengeId);

    if (!challenge) {
        return res.status(404).json({
            correct: false,
            message: "Challenge not found"
        });
    }

    if (!submittedFlag) {
        return res.status(400).json({
            correct: false,
            message: "Please submit a flag"
        });
    }

    if (submittedFlag === challenge.flag) {
        return res.json({
            correct: true,
            message: "Correct flag!",
            points: challenge.points
        });
    }

    res.json({
        correct: false,
        message: "Incorrect flag"
    });
});

app.listen(PORT, () => {
    console.log(`CTF-Builder server running on http://localhost:${PORT}`);
});