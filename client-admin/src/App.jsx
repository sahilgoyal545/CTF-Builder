import { useEffect, useState } from "react";

const API = "http://localhost:5000";

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("adminToken")
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [challenges, setChallenges] = useState([]);
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [attachment, setAttachment] = useState(null);

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
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.user?.role !== "admin") {
        setLoginError(
          data.error || "Admin login required."
        );
        return;
      }

      localStorage.setItem("adminToken", data.token);
      setToken(data.token);
    } catch {
      setLoginError(
        "Could not connect to the server."
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
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
      setMessage(
        "Could not load challenges."
      );
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

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      category: "Web",
      points: 100,
      flag: "",
    });

    setAttachment(null);
    setEditingId(null);
  };

  const createChallenge = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("title", form.title);
      formData.append(
        "description",
        form.description
      );
      formData.append(
        "category",
        form.category
      );
      formData.append(
        "points",
        Number(form.points)
      );
      formData.append("flag", form.flag);

      if (attachment) {
        formData.append(
          "attachment",
          attachment
        );
      }

      const response = await fetch(
        `${API}/api/challenges`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();
        return;
      }

      if (!response.ok) {
        setMessage(
          data.error ||
            "Failed to create challenge."
        );
        return;
      }

      setMessage(
        "Challenge created successfully."
      );

      resetForm();
      loadChallenges();
    } catch {
      setMessage(
        "Could not connect to the server."
      );
    }
  };

  const updateChallenge = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("title", form.title);
      formData.append(
        "description",
        form.description
      );
      formData.append(
        "category",
        form.category
      );
      formData.append(
        "points",
        Number(form.points)
      );

      if (form.flag.trim()) {
        formData.append("flag", form.flag);
      }

      if (attachment) {
        formData.append(
          "attachment",
          attachment
        );
      }

      const response = await fetch(
        `${API}/api/challenges/${editingId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();
        return;
      }

      if (!response.ok) {
        setMessage(
          data.error ||
            "Failed to update challenge."
        );
        return;
      }

      setMessage(
        "Challenge updated successfully."
      );

      resetForm();
      loadChallenges();
    } catch {
      setMessage(
        "Could not connect to the server."
      );
    }
  };

  const startEditing = (challenge) => {
    setEditingId(challenge.id);

    setForm({
      title: challenge.title || "",
      description:
        challenge.description || "",
      category:
        challenge.category || "Web",
      points: challenge.points || 100,
      flag: "",
    });

    setAttachment(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteChallenge = async (id) => {
    if (
      !window.confirm(
        "Delete this challenge?"
      )
    ) {
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

      const data = await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();
        return;
      }

      if (!response.ok) {
        setMessage(
          data.error ||
            "Failed to delete challenge."
        );
        return;
      }

      setMessage("Challenge deleted.");

      if (editingId === id) {
        resetForm();
      }

      loadChallenges();
    } catch {
      setMessage(
        "Could not connect to the server."
      );
    }
  };

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={loginCard}>
          <h1 style={loginLogo}>
            CTF-Builder
          </h1>

          <p style={loginSubtitle}>
            Organizer Login
          </p>

          <form onSubmit={login}>
            <label style={labelStyle}>
              Username
            </label>

            <input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Username"
              required
              style={inputStyle}
            />

            <label style={labelStyle}>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Password"
              required
              style={inputStyle}
            />

            <button
              type="submit"
              style={buttonStyle}
            >
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
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={logoStyle}>
            CTF-Builder
          </h1>

          <p style={headerSubtitle}>
            Organizer Dashboard
          </p>
        </div>

        <button
          onClick={logout}
          style={logoutStyle}
        >
          Logout
        </button>
      </header>

      <main style={mainStyle}>
        <section style={cardStyle}>
          <h2 style={sectionHeading}>
            Demo CTF Event
          </h2>

          <p style={mutedText}>
            Manage challenges and event content.
          </p>

          <strong>
            {challenges.length} challenges
          </strong>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionHeading}>
            {editingId
              ? "Edit Challenge"
              : "Create Challenge"}
          </h2>

          <form
            onSubmit={
              editingId
                ? updateChallenge
                : createChallenge
            }
          >
            <label style={labelStyle}>
              Title
            </label>

            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Challenge title"
              required
              style={inputStyle}
            />

            <label style={labelStyle}>
              Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Challenge description"
              rows="5"
              required
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />

            <div style={formGrid}>
              <div>
                <label style={labelStyle}>
                  Category
                </label>

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
                <label style={labelStyle}>
                  Points
                </label>

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

            <label style={labelStyle}>
              Flag
            </label>

            <input
              name="flag"
              value={form.flag}
              onChange={handleChange}
              placeholder={
                editingId
                  ? "Leave blank to keep current flag"
                  : "CTF{example_flag}"
              }
              required={!editingId}
              style={inputStyle}
            />

            <label style={labelStyle}>
              Attachment
            </label>

            <input
              type="file"
              onChange={(e) =>
                setAttachment(
                  e.target.files[0] || null
                )
              }
              style={fileInputStyle}
            />

            <div style={formButtons}>
              <button
                type="submit"
                style={buttonStyle}
              >
                {editingId
                  ? "Update Challenge"
                  : "Create Challenge"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={cancelButtonStyle}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {message && (
            <div
              style={
                message.includes("success") ||
                message === "Challenge deleted."
                  ? successBox
                  : errorBox
              }
            >
              {message}
            </div>
          )}
        </section>

        <section>
          <h2 style={sectionHeading}>
            Challenges
          </h2>

          <div>
            {challenges.map(
              (challenge, index) => (
                <div
                  key={challenge.id}
                  style={challengeStyle}
                >
                  <div
                    style={
                      challengeNumberStyle
                    }
                  >
                    #{index + 1}
                  </div>

                  <div
                    style={
                      challengeContentStyle
                    }
                  >
                    <h3
                      style={
                        challengeTitleStyle
                      }
                    >
                      {challenge.title}
                    </h3>

                    <div
                      style={
                        challengeMetaStyle
                      }
                    >
                      <span
                        style={
                          categoryBadgeStyle
                        }
                      >
                        {challenge.category}
                      </span>

                      <span
                        style={pointsStyle}
                      >
                        {challenge.points} points
                      </span>
                    </div>

                    <p
                      style={
                        challengeDescriptionStyle
                      }
                    >
                      {challenge.description}
                    </p>

                    {challenge.attachment_url && (
                      <a
                        href={
                          challenge.attachment_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        style={
                          attachmentLinkStyle
                        }
                      >
                        📎 View Attachment
                      </a>
                    )}
                  </div>

                  <div
                    style={challengeActionsStyle}
                  >
                    <button
                      onClick={() =>
                        startEditing(
                          challenge
                        )
                      }
                      style={editButtonStyle}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        deleteChallenge(
                          challenge.id
                        )
                      }
                      style={
                        deleteButtonStyle
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* =========================
   PAGE
========================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#0b1120",
  color: "#e5e7eb",
  fontFamily: "Inter, Arial, sans-serif",
};

const mainStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "30px 20px 60px",
};

const headerStyle = {
  background: "#111827",
  borderBottom: "1px solid #263244",
  padding: "18px 40px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const logoStyle = {
  margin: 0,
  color: "#38bdf8",
  fontSize: "24px",
  textAlign: "left",
};

const headerSubtitle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "13px",
  textAlign: "left",
};

const cardStyle = {
  background: "#111827",
  border: "1px solid #263244",
  borderRadius: "10px",
  padding: "24px",
  marginBottom: "24px",
  textAlign: "left",
};

const sectionHeading = {
  margin: "0 0 12px",
  fontSize: "21px",
  textAlign: "left",
};

const mutedText = {
  color: "#94a3b8",
  margin: "0 0 12px",
  lineHeight: "1.5",
  textAlign: "left",
};

/* =========================
   LOGIN
========================= */

const loginCard = {
  width: "380px",
  maxWidth: "calc(100% - 40px)",
  margin: "120px auto",
  padding: "32px",
  background: "#111827",
  border: "1px solid #263244",
  borderRadius: "12px",
  boxSizing: "border-box",
};

const loginLogo = {
  color: "#38bdf8",
  margin: "0 0 5px",
  textAlign: "left",
};

const loginSubtitle = {
  color: "#94a3b8",
  margin: "0 0 20px",
  textAlign: "left",
};

/* =========================
   FORM
========================= */

const labelStyle = {
  display: "block",
  marginTop: "15px",
  marginBottom: "6px",
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: "600",
  textAlign: "left",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px",
  background: "#0f172a",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: "6px",
  fontSize: "14px",
};

const fileInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px",
  background: "#0f172a",
  color: "#94a3b8",
  border: "1px solid #334155",
  borderRadius: "6px",
  fontSize: "14px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "15px",
};

const formButtons = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
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

const cancelButtonStyle = {
  marginTop: "20px",
  padding: "10px 18px",
  background: "#1e293b",
  color: "#cbd5e1",
  border: "1px solid #334155",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
};

const logoutStyle = {
  padding: "9px 16px",
  background: "#1e293b",
  color: "#e5e7eb",
  border: "1px solid #334155",
  borderRadius: "6px",
  cursor: "pointer",
};

/* =========================
   CHALLENGE LIST
========================= */

const challengeStyle = {
  background: "#111827",
  border: "1px solid #263244",
  borderRadius: "10px",
  padding: "20px",
  marginBottom: "12px",

  display: "grid",
  gridTemplateColumns:
    "44px minmax(0, 1fr) auto",
  columnGap: "15px",
  alignItems: "start",

  textAlign: "left",
};

const challengeNumberStyle = {
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

const challengeContentStyle = {
  minWidth: 0,
  textAlign: "left",
};

const challengeTitleStyle = {
  margin: "2px 0 9px",
  fontSize: "18px",
  textAlign: "left",
};

const challengeMetaStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "10px",
  flexWrap: "wrap",
  textAlign: "left",
};

const categoryBadgeStyle = {
  padding: "4px 9px",
  background: "#0c4a6e",
  color: "#7dd3fc",
  borderRadius: "5px",
  fontSize: "12px",
  fontWeight: "600",
};

const pointsStyle = {
  color: "#94a3b8",
  fontSize: "13px",
  textAlign: "left",
};

const challengeDescriptionStyle = {
  margin: "14px 0 8px",
  color: "#94a3b8",
  lineHeight: "1.5",
  textAlign: "left",
};

const attachmentLinkStyle = {
  display: "inline-block",
  marginTop: "3px",
  color: "#38bdf8",
  fontSize: "13px",
  textDecoration: "none",
};

const challengeActionsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  alignItems: "stretch",
};

const editButtonStyle = {
  padding: "8px 14px",
  background: "#1e3a5f",
  color: "#bae6fd",
  border: "1px solid #2563eb",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
};

const deleteButtonStyle = {
  padding: "8px 14px",
  background: "#7f1d1d",
  color: "#fecaca",
  border: "1px solid #991b1b",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
};

/* =========================
   MESSAGES
========================= */

const successBox = {
  marginTop: "15px",
  padding: "10px 13px",
  background: "#052e16",
  border: "1px solid #166534",
  color: "#86efac",
  borderRadius: "7px",
  fontSize: "14px",
};

const errorBox = {
  marginTop: "15px",
  padding: "10px 13px",
  background: "#450a0a",
  border: "1px solid #991b1b",
  color: "#fca5a5",
  borderRadius: "7px",
  fontSize: "14px",
};

export default App;