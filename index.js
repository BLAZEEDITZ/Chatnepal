const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

app.use(express.static('public'));

const MSG_FILE = 'messages.json';
let messages = [];

// Load messages from file
if (fs.existsSync(MSG_FILE)) {
  messages = JSON.parse(fs.readFileSync(MSG_FILE, 'utf8'));
  cleanOldMessages();
}

// Remove messages older than 24 hours
function cleanOldMessages() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  messages = messages.filter(m => m.timestamp >= cutoff);
  fs.writeFileSync(MSG_FILE, JSON.stringify(messages));
}

io.on('connection', (socket) => {
  console.log('A user connected');

  // Send chat history
  socket.emit('chat history', messages);

  socket.on('chat message', (data) => {
    const now = Date.now();
    const message = {
      name: data.name,
      text: data.text,
      color: data.color,
      timestamp: now
    };
    messages.push(message);
    cleanOldMessages();
    io.emit('chat message', message);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
