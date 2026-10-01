import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import ReactMarkdown from "react-markdown";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("playerToken")
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [flags, setFlags] = useState({});
  const [messages, setMessages] = useState({});
  const [category, setCategory] = useState("All");

  const login = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || data.user?.role !== "player") {
        setLoginError(data.error || "Player login required.");
        return;
      }

      localStorage.setItem("playerToken", data.token);
      setToken(data.token);
    } catch {
      setLoginError("Could not connect to the server.");
    }
  };

  const logout = () => {
    localStorage.removeItem("playerToken");
    setToken(null);
  };

  const loadChallenges = async () => {
    try {
      const response = await fetch(`${API}/api/challenges`);
      const data = await response.json();

      if (response.ok) {
        setChallenges(data);
      }
    } catch {
      console.error("Could not load challenges.");
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`${API}/api/leaderboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setLeaderboard(data);
      }
    } catch {
      console.error("Could not load leaderboard.");
    }
  };

  useEffect(() => {
    if (!token) return;

    loadChallenges();
    loadLeaderboard();

    const socket = io(API);

    socket.on("UPDATE_SCOREBOARD", (data) => {
      if (Array.isArray(data)) {
        setLeaderboard(data);
      } else {
        loadLeaderboard();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const submitFlag = async (challengeId) => {
    const flag = flags[challengeId];

    if (!flag) {
      setMessages((previous) => ({
        ...previous,
        [challengeId]: {
          text: "Enter a flag first.",
          type: "error",
        },
      }));
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/challenges/${challengeId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ flag }),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }

      setMessages((previous) => ({
        ...previous,
        [challengeId]: {
          text: data.message || data.error,
          type: data.correct ? "success" : "error",
        },
      }));

      if (data.correct) {
        setFlags((previous) => ({
          ...previous,
          [challengeId]: "",
        }));

        loadLeaderboard();
      }
    } catch {
      setMessages((previous) => ({
        ...previous,
        [challengeId]: {
          text: "Could not connect to the server.",
          type: "error",
        },
      }));
    }
  };

  const categories = [
    "All",
    ...new Set(challenges.map((challenge) => challenge.category)),
  ];

  const filteredChallenges =
    category === "All"
      ? challenges
      : challenges.filter(
          (challenge) => challenge.category === category
        );

  if (!token) {
    return (
      <div style={page}>
        <div style={loginCard}>
          <div style={logo}>CTF-Builder</div>

          <h2 style={loginTitle}>Player Login</h2>

          <p style={muted}>
            Enter your credentials to join the CTF.
          </p>

          <form onSubmit={login}>
            <label style={label}>Username</label>

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Player username"
              required
              style={input}
            />

            <label style={label}>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              style={input}
            />

            <button style={primaryButton}>
              Login
            </button>
          </form>

          {loginError && (
            <div style={errorBox}>
              {loginError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <div style={logo}>CTF-Builder</div>

          <div style={headerSubtitle}>
            Demo CTF Event
          </div>
        </div>

        <button
          onClick={logout}
          style={secondaryButton}
        >
          Logout
        </button>
      </header>

      <main style={container}>
        <div style={pageIntro}>
          <div>
            <h1 style={pageTitle}>Challenges</h1>

            <p style={muted}>
              Find the flags, solve challenges and climb the leaderboard.
            </p>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={select}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Categories" : item}
              </option>
            ))}
          </select>
        </div>

        <div style={layout}>
          <section>
            {filteredChallenges.length === 0 && (
              <div style={emptyCard}>
                No challenges found.
              </div>
            )}

            <div style={challengeList}>
              {filteredChallenges.map((challenge) => {
                const message = messages[challenge.id];

                return (
                  <article
                    key={challenge.id}
                    style={challengeCard}
                  >
                    <div style={challengeHeader}>
                      <div style={challengeNumber}>
                        #{challenges.indexOf(challenge) + 1}
                      </div>

                      <div style={challengeHeading}>
                        <h2 style={challengeTitle}>
                          {challenge.title}
                        </h2>

                        <div style={metaRow}>
                          <span style={categoryBadge}>
                            {challenge.category}
                          </span>

                          <span style={points}>
                            {challenge.points} points
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={description}>
                      <ReactMarkdown>
                        {challenge.description}
                      </ReactMarkdown>
                    </div>

                    {challenge.attachment_url && (
                      <a
                        href={challenge.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        style={attachmentLink}
                      >
                        📎 Download Challenge File
                      </a>
                    )}

                    <div style={submissionArea}>
                      <input
                        value={flags[challenge.id] || ""}
                        onChange={(e) =>
                          setFlags((previous) => ({
                            ...previous,
                            [challenge.id]: e.target.value,
                          }))
                        }
                        placeholder="CTF{your_flag}"
                        style={flagInput}
                      />

                      <button
                        onClick={() =>
                          submitFlag(challenge.id)
                        }
                        style={primaryButton}
                      >
                        Submit Flag
                      </button>
                    </div>

                    {message && (
                      <div
                        style={
                          message.type === "success"
                            ? successBox
                            : errorBox
                        }
                      >
                        {message.text}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <aside>
            <div style={leaderboardCard}>
              <div style={leaderboardHeader}>
                <div>
                  <h2 style={sectionTitle}>
                    Live Leaderboard
                  </h2>

                  <p style={muted}>
                    Updates automatically
                  </p>
                </div>

                <div style={liveDot}>
                  ● LIVE
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <div style={emptyLeaderboard}>
                  No scores yet.
                </div>
              ) : (
                <div>
                  {leaderboard.map((player, index) => (
                    <div
                      key={player.username}
                      style={leaderRow}
                    >
                      <div style={playerInfo}>
                        <div style={rank}>
                          #{index + 1}
                        </div>

                        <strong>
                          {player.username}
                        </strong>
                      </div>

                      <strong style={score}>
                        {player.score} pts
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* =========================
   PAGE
========================= */

const page = {
  minHeight: "100vh",
  background: "#0b1120",
  color: "#e5e7eb",
  fontFamily: "Inter, Arial, sans-serif",
};

/* =========================
   HEADER
========================= */

const header = {
  height: "72px",
  padding: "0 40px",
  background: "#111827",
  borderBottom: "1px solid #1e293b",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const logo = {
  color: "#38bdf8",
  fontSize: "24px",
  fontWeight: "700",
};

const headerSubtitle = {
  color: "#64748b",
  fontSize: "13px",
  marginTop: "3px",
};

/* =========================
   MAIN
========================= */

const container = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "36px 24px 60px",
};

const pageIntro = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "20px",
  marginBottom: "28px",
};

const pageTitle = {
  margin: "0 0 6px 0",
  fontSize: "28px",
  textAlign: "left",
};

const muted = {
  color: "#64748b",
  lineHeight: "1.5",
  margin: 0,
  textAlign: "left",
};

const layout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 330px",
  gap: "24px",
  alignItems: "start",
};

/* =========================
   CHALLENGES
========================= */

const challengeList = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const challengeCard = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: "12px",
  padding: "22px",
};

const challengeHeader = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr)",
  columnGap: "15px",
  alignItems: "start",
};

const challengeNumber = {
  width: "44px",
  height: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#172554",
  color: "#7dd3fc",
  borderRadius: "9px",
  fontWeight: "700",
  textAlign: "center",
};

const challengeHeading = {
  minWidth: 0,
  textAlign: "left",
};

const challengeTitle = {
  margin: "2px 0 9px 0",
  fontSize: "18px",
  textAlign: "left",
};

const metaRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "10px",
  flexWrap: "wrap",
};

const categoryBadge = {
  padding: "4px 9px",
  background: "#0c4a6e",
  color: "#7dd3fc",
  borderRadius: "5px",
  fontSize: "12px",
  fontWeight: "600",
};

const points = {
  color: "#94a3b8",
  fontSize: "13px",
};

const description = {
  marginTop: "18px",
  color: "#cbd5e1",
  lineHeight: "1.65",
  textAlign: "left",
};

const attachmentLink = {
  display: "inline-block",
  marginTop: "4px",
  color: "#38bdf8",
  fontSize: "13px",
  textDecoration: "none",
};

const submissionArea = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
};

const flagInput = {
  flex: 1,
  minWidth: 0,
  padding: "11px 12px",
  background: "#0f172a",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: "7px",
  fontSize: "14px",
};

/* =========================
   LEADERBOARD
========================= */

const leaderboardCard = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: "12px",
  padding: "22px",
  position: "sticky",
  top: "20px",
};

const leaderboardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
  marginBottom: "15px",
};

const sectionTitle = {
  margin: "0 0 4px 0",
  fontSize: "19px",
  textAlign: "left",
};

const liveDot = {
  color: "#4ade80",
  fontSize: "11px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const leaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "13px 0",
  borderBottom: "1px solid #1e293b",
};

const playerInfo = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
};

const rank = {
  color: "#64748b",
  width: "28px",
  fontSize: "13px",
};

const score = {
  color: "#7dd3fc",
  whiteSpace: "nowrap",
};

/* =========================
   BUTTONS / INPUTS
========================= */

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  background: "#0f172a",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: "7px",
  fontSize: "14px",
};

const label = {
  display: "block",
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: "600",
  marginTop: "18px",
  marginBottom: "7px",
};

const select = {
  padding: "10px 12px",
  background: "#0f172a",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: "7px",
  fontSize: "14px",
};

const primaryButton = {
  padding: "10px 17px",
  background: "#0284c7",
  color: "#fff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "600",
  whiteSpace: "nowrap",
};

const secondaryButton = {
  padding: "9px 15px",
  background: "#1e293b",
  color: "#cbd5e1",
  border: "1px solid #334155",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "600",
};

/* =========================
   LOGIN
========================= */

const loginCard = {
  width: "380px",
  maxWidth: "calc(100% - 40px)",
  margin: "110px auto",
  padding: "32px",
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: "14px",
  boxSizing: "border-box",
};

const loginTitle = {
  margin: "26px 0 6px",
  fontSize: "22px",
};

/* =========================
   MESSAGES
========================= */

const successBox = {
  marginTop: "12px",
  padding: "10px 13px",
  background: "#052e16",
  border: "1px solid #166534",
  color: "#86efac",
  borderRadius: "7px",
  fontSize: "14px",
};

const errorBox = {
  marginTop: "12px",
  padding: "10px 13px",
  background: "#450a0a",
  border: "1px solid #991b1b",
  color: "#fca5a5",
  borderRadius: "7px",
  fontSize: "14px",
};

const emptyCard = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: "12px",
  padding: "30px",
  color: "#64748b",
};

const emptyLeaderboard = {
  color: "#64748b",
  padding: "15px 0",
};

export default App;