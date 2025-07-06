const socket = io();
let username = '';
let userColor = '';

while (!username) {
  username = prompt('Enter your name:').trim();
}

userColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

form.addEventListener('submit', function(e) {
  e.preventDefault();
  if (input.value.trim()) {
    socket.emit('chat message', {
      name: username,
      text: input.value.trim(),
      color: userColor
    });
    input.value = '';
  }
});

socket.on('chat history', function(history) {
  history.forEach(m => appendMessage(m));
});

socket.on('chat message', function(m) {
  appendMessage(m);
});

function appendMessage(m) {
  const time = new Date(m.timestamp).toLocaleTimeString();
  const item = document.createElement('li');
  item.innerHTML = `
    <div class="profile" style="background:${m.color}">
      ${m.name[0].toUpperCase()}
    </div>
    <div class="msg-content">
      <div><span class="name" style="color:${m.color}">${m.name}</span> <span class="time">${time}</span></div>
      <div class="text">${m.text}</div>
    </div>
  `;
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}
