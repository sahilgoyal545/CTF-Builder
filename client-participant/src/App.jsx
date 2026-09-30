import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const API = "http://localhost:5000";

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("playerToken")
  );

  const [username, setUsername] = useState("player");
  const [password, setPassword] = useState("Player@123");
  const [loginError, setLoginError] = useState("");

  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [flags, setFlags] = useState({});
  const [messages, setMessages] = useState({});

  const login = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.user?.role !== "player") {
        setLoginError(
          data.error || "Player login required."
        );
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
      const response = await fetch(
        `${API}/api/challenges`
      );

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
      const response = await fetch(
        `${API}/api/leaderboard`
      );

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

    socket.on("UPDATE_SCOREBOARD", () => {
      loadLeaderboard();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const submitFlag = async (challengeId) => {
    const flag = flags[challengeId];

    if (!flag) {
      setMessages({
        ...messages,
        [challengeId]: "Enter a flag first.",
      });
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

      setMessages({
        ...messages,
        [challengeId]: data.message,
      });

      if (data.correct) {
        loadLeaderboard();
      }
    } catch {
      setMessages({
        ...messages,
        [challengeId]: "Could not connect to the server.",
      });
    }
  };

  const updateFlag = (id, value) => {
    setFlags({
      ...flags,
      [id]: value,
    });
  };

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={loginCard}>
          <h1 style={{ color: "#38bdf8", marginBottom: "5px" }}>
            CTF-Builder
          </h1>

          <p style={{ color: "#94a3b8" }}>
            Player Login
          </p>

          <form onSubmit={login}>
            <label>Username</label>

            <input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              style={inputStyle}
            />

            <label
              style={{
                display: "block",
                marginTop: "15px",
              }}
            >
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              style={inputStyle}
            />

            <button style={buttonStyle}>
              Login
            </button>
          </form>

          {loginError && (
            <p style={{ color: "#f87171" }}>
              {loginError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, color: "#38bdf8" }}>
            CTF-Builder
          </h1>

          <p style={{ margin: "5px 0 0", color: "#94a3b8" }}>
            Demo CTF Event
          </p>
        </div>

        <button onClick={logout} style={logoutStyle}>
          Logout
        </button>
      </header>

      <main style={mainStyle}>
        <div style={layoutStyle}>
          <section>
            <h2>Challenges</h2>

            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                style={challengeStyle}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "15px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 8px" }}>
                      #{challenge.id} — {challenge.title}
                    </h3>

                    <p style={{ color: "#94a3b8" }}>
                      {challenge.description}
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      minWidth: "90px",
                    }}
                  >
                    <div style={{ color: "#38bdf8" }}>
                      {challenge.category}
                    </div>

                    <strong>
                      {challenge.points} pts
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: "18px" }}>
                  <input
                    value={flags[challenge.id] || ""}
                    onChange={(e) =>
                      updateFlag(
                        challenge.id,
                        e.target.value
                      )
                    }
                    placeholder="CTF{your_flag}"
                    style={inputStyle}
                  />

                  <button
                    onClick={() =>
                      submitFlag(challenge.id)
                    }
                    style={buttonStyle}
                  >
                    Submit Flag
                  </button>

                  {messages[challenge.id] && (
                    <p
                      style={{
                        color:
                          messages[challenge.id].includes(
                            "Correct"
                          )
                            ? "#22c55e"
                            : "#f87171",
                      }}
                    >
                      {messages[challenge.id]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </section>

          <aside>
            <div style={leaderboardStyle}>
              <h2>Live Leaderboard</h2>

              {leaderboard.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>
                  No scores yet.
                </p>
              ) : (
                leaderboard.map((player, index) => (
                  <div
                    key={player.username}
                    style={leaderStyle}
                  >
                    <span>
                      #{index + 1}{" "}
                      <strong>{player.username}</strong>
                    </span>

                    <strong>
                      {player.score} pts
                    </strong>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#0b1120",
  color: "#e5e7eb",
  fontFamily: "Arial, sans-serif",
};

const headerStyle = {
  background: "#111827",
  borderBottom: "1px solid #263244",
  padding: "20px 40px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const mainStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "30px 20px",
};

const layoutStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  gap: "25px",
};

const challengeStyle = {
  background: "#111827",
  border: "1px solid #263244",
  borderRadius: "10px",
  padding: "20px",
  marginBottom: "15px",
};

const leaderboardStyle = {
  background: "#111827",
  border: "1px solid #263244",
  borderRadius: "10px",
  padding: "20px",
  position: "sticky",
  top: "20px",
};

const leaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 0",
  borderBottom: "1px solid #263244",
};

const loginCard = {
  width: "360px",
  maxWidth: "calc(100% - 40px)",
  margin: "120px auto",
  padding: "30px",
  background: "#111827",
  border: "1px solid #263244",
  borderRadius: "12px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px",
  marginTop: "7px",
  background: "#0f172a",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: "6px",
  fontSize: "14px",
};

const buttonStyle = {
  marginTop: "15px",
  padding: "11px 20px",
  background: "#0284c7",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
};

const logoutStyle = {
  padding: "9px 16px",
  background: "#1e293b",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: "6px",
  cursor: "pointer",
};

export default App;