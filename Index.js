const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

let users = [];

io.on('connection', (socket) => {
  console.log('a user connected');
  
  // Nouveau pseudo
  socket.on('new user', (nickname) => {
    users.push({ id: socket.id, nickname: nickname });
    io.emit('user list', users);
  });

  // Message
  socket.on('chat message', (msg) => {
    io.emit('chat message', { user: socket.id, message: msg });
  });

  socket.on('disconnect', () => {
    users = users.filter((user) => user.id !== socket.id);
    io.emit('user list', users);
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
