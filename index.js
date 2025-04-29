const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const users = {}; // clé socket.id -> pseudo
const moderators = new Set(); // liste des modérateurs
const mutedUsers = new Set();

app.use(express.static('public')); // ton dossier où est l'index.html

io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté');

  socket.on('new user', (pseudo) => {
    users[socket.id] = pseudo;
    // Par défaut, tu deviens modérateur si ton pseudo est "admin"
    if (pseudo.toLowerCase() === 'admin') {
      moderators.add(socket.id);
      socket.emit('you are moderator');
    }
  });

  socket.on('chat message', (msg) => {
    if (mutedUsers.has(socket.id)) {
      socket.emit('muted');
      return;
    }
    const pseudo = users[socket.id] || 'Inconnu';
    io.emit('chat message', { user: pseudo, msg: msg, isModerator: moderators.has(socket.id) });
  });

  socket.on('flash', () => {
    if (moderators.has(socket.id)) {
      io.emit('flash');
    }
  });

  socket.on('mute', (targetPseudo) => {
    if (moderators.has(socket.id)) {
      const targetId = Object.keys(users).find(id => users[id] === targetPseudo);
      if (targetId) {
        mutedUsers.add(targetId);
        io.to(targetId).emit('muted');
        setTimeout(() => mutedUsers.delete(targetId), 300000); // 5 minutes
      }
    }
  });

  socket.on('make moderator', (targetPseudo) => {
    if (moderators.has(socket.id)) {
      const targetId = Object.keys(users).find(id => users[id] === targetPseudo);
      if (targetId) {
        moderators.add(targetId);
        io.to(targetId).emit('you are moderator');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté');
    delete users[socket.id];
    moderators.delete(socket.id);
    mutedUsers.delete(socket.id);
  });
});

http.listen(3000, () => {
  console.log('Serveur en écoute sur *:3000');
});
