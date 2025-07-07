const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");

app.use(express.static("public"));

const MSG_FILE = "messages.json";
let messages = [];
const typingUsers = new Set();

// Load messages
if (fs.existsSync(MSG_FILE)) {
  try {
    messages = JSON.parse(fs.readFileSync(MSG_FILE, "utf8"));
    cleanOldMessages();
  } catch (e) {
    console.error("Error loading messages:", e);
    messages = [];
  }
}

// Clean old messages
function cleanOldMessages() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  messages = messages.filter(m => m.timestamp >= cutoff).slice(-1000);
  try {
    fs.writeFileSync(MSG_FILE, JSON.stringify(messages, null, 2));
  } catch (e) {
    console.error("Error saving messages:", e);
  }
}
setInterval(cleanOldMessages, 60 * 60 * 1000);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.emit("chat history", messages.slice(-50));

  socket.on("chat message", (data) => {
    if (!data || !data.name || !data.text || !data.color) return;

    const safeName = data.name.toString().trim().substring(0, 20);
    const safeText = data.text.toString().trim().substring(0, 500);
    const safeColor = data.color.startsWith("hsl") ? data.color : "#667eea";
    const photoURL = data.photoURL || "";

    const msg = {
      id: `${socket.id}-${Date.now()}`,
      name: safeName,
      text: safeText,
      color: safeColor,
      photoURL,
      timestamp: Date.now(),
    };

    messages.push(msg);
    cleanOldMessages();

    io.emit("chat message", msg);
  });

  socket.on("typing start", (name) => {
    if (name) {
      typingUsers.add(name);
      socket.broadcast.emit("user typing", { users: Array.from(typingUsers) });
    }
  });

  socket.on("typing stop", (name) => {
    if (name) {
      typingUsers.delete(name);
      socket.broadcast.emit("user typing", { users: Array.from(typingUsers) });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    typingUsers.clear();
    socket.broadcast.emit("user typing", { users: Array.from(typingUsers) });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 Chat server running at http://localhost:${PORT}`);
});
