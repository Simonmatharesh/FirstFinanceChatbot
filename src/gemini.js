// gemini.js (or wherever interpretUserMessage is)
export const interpretUserMessage = async (msg) => {
  const res = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg }),
  });

  const data = await res.json();

  // THIS MUST BE A STRING
  return data.interpretation; 
};
