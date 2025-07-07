// Your Firebase Auth object (make sure this is defined elsewhere)
// const auth = firebase.auth();

let username = "";
let profilePic = "";
let userColor = "";
let socket;
let signInInProgress = false;

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const sendBtn = document.getElementById("send-btn");
const btnText = document.getElementById("btn-text");
const statusIndicator = document.getElementById("status-indicator");
const typingIndicator = document.getElementById("typing-indicator");
const typingUsers = document.getElementById("typing-users");
const uploadAvatar = document.getElementById("upload-avatar");

// Add a manual sign-in button in your HTML, for example:
// <button id="sign-in-btn" style="display:none;">Sign In with Google</button>
const signInBtn = document.getElementById("sign-in-btn");

// Listen for manual sign-in button click
if (signInBtn) {
  signInBtn.addEventListener("click", () => {
    signInWithGoogle();
  });
}

auth.onAuthStateChanged((user) => {
  if (user) {
    // Hide sign-in button when signed in
    if (signInBtn) signInBtn.style.display = "none";

    username = user.displayName || "Anonymous";
    profilePic = user.photoURL || "";
    userColor = `hsl(${Math.floor(Math.random() * 360)}, 65%, 45%)`;

    if (!socket) initChat();
  } else {
    // Show sign-in button for manual sign-in
    if (signInBtn) signInBtn.style.display = "inline-block";

    // Do NOT auto sign in immediately here
    // Wait for user to click sign-in button
  }
});

function signInWithGoogle() {
  if (signInInProgress) return; // prevent multiple calls
  signInInProgress = true;

  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .then(result => {
      signInInProgress = false;
      const user = result.user;
      username = user.displayName || "Anonymous";
      profilePic = user.photoURL || "";
      userColor = `hsl(${Math.floor(Math.random() * 360)}, 65%, 45%)`;

      if (!socket) initChat();
    })
    .catch(err => {
      signInInProgress = false;
      console.error("Login failed:", err);
      alert("Sign-in failed or cancelled. Please try again.");
      // Keep sign-in button visible for manual retry
      if (signInBtn) signInBtn.style.display = "inline-block";
    });
}

function initChat() {
  socket = io();

  socket.on("connect", () => updateConnectionStatus(true));
  socket.on("disconnect", () => updateConnectionStatus(false));
  socket.on("chat history", (history) => {
    messages.innerHTML = "";
    history.forEach(m => appendMessage(m));
  });
  socket.on("chat message", (m) => appendMessage(m));
  socket.on("user typing", (data) => updateTypingIndicator(data.users));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  input.addEventListener("input", () => {
    socket.emit("typing start", username);
    clearTimeout(input._typingTimer);
    input._typingTimer = setTimeout(() => socket.emit("typing stop", username), 1000);
  });

  uploadAvatar.addEventListener("change", handleAvatarUpload);
}

function sendMessage() {
  const message = input.value.trim();
  if (message) {
    socket.emit("chat message", {
      name: username,
      text: message,
      color: userColor,
      photoURL: profilePic
    });
    input.value = "";
  }
}

function appendMessage(m) {
  const li = document.createElement("li");
  const time = new Date(m.timestamp).toLocaleTimeString();
  li.innerHTML = `
    <div class="profile" style="background:${m.color}">
      ${
        m.photoURL 
          ? `<img src="${m.photoURL}" alt="${m.name}" style="width:100%;height:100%;border-radius:50%;">`
          : m.name[0].toUpperCase()
      }
    </div>
    <div class="msg-content">
      <div><span style="color:${m.color}">${escapeHtml(m.name)}</span> <small>${time}</small></div>
      <div>${escapeHtml(m.text)}</div>
    </div>
  `;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const newPhotoURL = evt.target.result;
      auth.currentUser.updateProfile({ photoURL: newPhotoURL }).then(() => {
        profilePic = newPhotoURL;
        alert("Profile picture updated!");
      });
    };
    reader.readAsDataURL(file);
  }
}

function updateConnectionStatus(connected) {
  statusIndicator.style.background = connected ? "#4ade80" : "#ef4444";
  statusIndicator.title = connected ? "Connected" : "Disconnected";
}

function updateTypingIndicator(users) {
  const others = users.filter(u => u !== username);
  if (others.length === 0) {
    typingIndicator.style.display = "none";
  } else {
    typingIndicator.style.display = "block";
    typingUsers.textContent = others.join(", ") + (others.length === 1 ? " is typing" : " are typing");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
