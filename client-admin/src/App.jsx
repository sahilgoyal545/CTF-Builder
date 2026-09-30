import { useEffect, useState } from "react";

const API = "http://localhost:5000";

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

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("adminToken")
  );

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123");
  const [loginError, setLoginError] = useState("");

  const [challenges, setChallenges] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Web",
    points: 100,
    flag: "",
  });

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

      if (!response.ok || data.user?.role !== "admin") {
        setLoginError(data.error || "Admin login required.");
        return;
      }

      localStorage.setItem("adminToken", data.token);
      setToken(data.token);
    } catch {
      setLoginError("Could not connect to the server.");
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
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
      setMessage("Could not load challenges.");
    }
  };

  useEffect(() => {
    if (token) {
      loadChallenges();
    }
  }, [token]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const createChallenge = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${API}/api/challenges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          points: Number(form.points),
        }),
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }

      if (!response.ok) {
        setMessage(data.error || "Failed to create challenge.");
        return;
      }

      setMessage("Challenge created successfully.");

      setForm({
        title: "",
        description: "",
        category: "Web",
        points: 100,
        flag: "",
      });

      loadChallenges();
    } catch {
      setMessage("Could not connect to the server.");
    }
  };

  const deleteChallenge = async (id) => {
    if (!window.confirm("Delete this challenge?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/challenges/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to delete challenge.");
        return;
      }

      setMessage("Challenge deleted.");
      loadChallenges();
    } catch {
      setMessage("Could not connect to the server.");
    }
  };

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={loginCard}>
          <h1 style={{ color: "#38bdf8", marginBottom: "5px" }}>
            CTF-Builder
          </h1>

          <p style={{ color: "#94a3b8" }}>
            Organizer Login
          </p>

          <form onSubmit={login}>
            <label>Username</label>

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />

            <label
              style={{
                display: "block",
                marginTop: "16px",
              }}
            >
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            Organizer Dashboard
          </p>
        </div>

        <button onClick={logout} style={logoutStyle}>
          Logout
        </button>
      </header>

      <main style={mainStyle}>
        <section style={cardStyle}>
          <h2>Demo CTF Event</h2>

          <p style={{ color: "#94a3b8" }}>
            Manage challenges and event content.
          </p>

          <strong>
            {challenges.length} challenges
          </strong>
        </section>

        <section style={cardStyle}>
          <h2>Create Challenge</h2>

          <form onSubmit={createChallenge}>
            <label>Title</label>

            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Challenge title"
              required
              style={inputStyle}
            />

            <label
              style={{
                display: "block",
                marginTop: "15px",
              }}
            >
              Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Challenge description"
              rows="4"
              required
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginTop: "15px",
              }}
            >
              <div>
                <label>Category</label>

                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option>Web</option>
                  <option>Crypto</option>
                  <option>Pwn</option>
                  <option>Forensics</option>
                </select>
              </div>

              <div>
                <label>Points</label>

                <input
                  type="number"
                  name="points"
                  value={form.points}
                  onChange={handleChange}
                  min="1"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <label
              style={{
                display: "block",
                marginTop: "15px",
              }}
            >
              Flag
            </label>

            <input
              name="flag"
              value={form.flag}
              onChange={handleChange}
              placeholder="CTF{example_flag}"
              required
              style={inputStyle}
            />

            <button style={buttonStyle}>
              Create Challenge
            </button>
          </form>

          {message && (
            <p
              style={{
                color: message.includes("success")
                  ? "#22c55e"
                  : "#f87171",
              }}
            >
              {message}
            </p>
          )}
        </section>

        <section>
          <h2>Challenges</h2>

          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              style={challengeStyle}
            >
              <div>
                <h3 style={{ margin: "0 0 8px" }}>
                  #{challenge.id} — {challenge.title}
                </h3>

                <p style={{ color: "#94a3b8" }}>
                  {challenge.description}
                </p>

                <span style={{ color: "#38bdf8" }}>
                  {challenge.category}
                </span>

                {" • "}

                <span>
                  {challenge.points} points
                </span>
              </div>

              <button
                onClick={() =>
                  deleteChallenge(challenge.id)
                }
                style={deleteButtonStyle}
              >
                Delete
              </button>
            </div>
          ))}
        </section>
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

const loginCard = {
  width: "360px",
  maxWidth: "calc(100% - 40px)",
  margin: "120px auto",
  padding: "30px",
  background: "#111827",
  border: "1px solid #263244",
  borderRadius: "12px",
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
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "30px 20px",
};

const cardStyle = {
  background: "#111827",
  border: "1px solid #263244",
  borderRadius: "10px",
  padding: "25px",
  marginBottom: "25px",
};

const challengeStyle = {
  background: "#111827",
  border: "1px solid #263244",
  borderRadius: "10px",
  padding: "20px",
  marginBottom: "12px",
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
};

const buttonStyle = {
  marginTop: "20px",
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

const deleteButtonStyle = {
  alignSelf: "center",
  padding: "8px 14px",
  background: "#7f1d1d",
  color: "#fecaca",
  border: "1px solid #991b1b",
  borderRadius: "6px",
  cursor: "pointer",
};

export default App;