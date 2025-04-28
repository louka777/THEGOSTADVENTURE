const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

let users = {};
let moderators = new Set();
let mutedUsers = {};

io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté.');

  socket.on('new user', (pseudo) => {
    socket.pseudo = pseudo;
    users[pseudo] = socket;

    if (moderators.size === 0) {
      // Premier utilisateur devient modérateur
      moderators.add(pseudo);
      socket.emit('you are moderator');
    } else if (moderators.has(pseudo)) {
      // Si déjà modérateur (reconnexion)
      socket.emit('you are moderator');
    }
  });

  socket.on('chat message', (msg) => {
    if (mutedUsers[socket.pseudo]) {
      return;
    }
    io.emit('chat message', { user: socket.pseudo, msg: msg, isModerator: moderators.has(socket.pseudo) });
  });

  socket.on('flash', () => {
    if (moderators.has(socket.pseudo)) {
      io.emit('flash');
    }
  });

  socket.on('mute', (targetPseudo) => {
    if (moderators.has(socket.pseudo) && users[targetPseudo]) {
      mutedUsers[targetPseudo] = true;
      users[targetPseudo].emit('muted');
      setTimeout(() => {
        delete mutedUsers[targetPseudo];
      }, 5 * 60 * 1000); // 5 minutes
    }
  });

  socket.on('make moderator', (targetPseudo) => {
    if (moderators.has(socket.pseudo) && users[targetPseudo]) {
      moderators.add(targetPseudo);
      users[targetPseudo].emit('you are moderator');
    }
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur est déconnecté.');
    if (socket.pseudo) {
      delete users[socket.pseudo];
    }
  });
});

http.listen(port, () => {
  console.log(`Serveur en écoute sur *:${port}`);
});
