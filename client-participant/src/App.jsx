import { useEffect, useState } from "react";

function App() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState({});
  const [messages, setMessages] = useState({});

  useEffect(() => {
    fetch("http://localhost:5000/api/challenges")
      .then((response) => response.json())
      .then((data) => {
        setChallenges(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading challenges:", error);
        setLoading(false);
      });
  }, []);

  const handleFlagChange = (challengeId, value) => {
    setFlags({
      ...flags,
      [challengeId]: value,
    });
  };

  const submitFlag = async (challengeId) => {
    const response = await fetch(
      `http://localhost:5000/api/challenges/${challengeId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flag: flags[challengeId],
        }),
      }
    );

    const data = await response.json();

    setMessages({
      ...messages,
      [challengeId]: data.correct
        ? `Correct! +${data.points} points`
        : data.message,
    });
  };

  if (loading) {
    return <h2>Loading challenges...</h2>;
  }

  return (
    <div>
      <h1>CTF-Builder</h1>
      <h2>Challenges</h2>

      {challenges.map((challenge) => (
        <div key={challenge.id}>
          <h3>{challenge.title}</h3>
          <p>Category: {challenge.category}</p>
          <p>{challenge.description}</p>
          <p>Points: {challenge.points}</p>

          <input
            type="text"
            placeholder="Enter flag"
            value={flags[challenge.id] || ""}
            onChange={(event) =>
              handleFlagChange(challenge.id, event.target.value)
            }
          />

          <button onClick={() => submitFlag(challenge.id)}>
            Submit Flag
          </button>

          {messages[challenge.id] && (
            <p>{messages[challenge.id]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;