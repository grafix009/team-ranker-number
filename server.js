const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(express.static('public'));

let teams = { TeamA: [], TeamB: [] };

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('initData', teams);

  socket.on('addItem', ({ text, number }) => {
    const newItem = { text, number };
    Object.keys(teams).forEach(team => teams[team].push(newItem));
    io.emit('updateData', teams);
  });

  socket.on('editItem', ({ team, index, newValue, newNumber }) => {
    if (teams[team] && teams[team][index]) {
      teams[team][index] = { text: newValue, number: newNumber };
      io.emit('updateData', teams);
    }
  });

  socket.on('deleteItem', ({ team, index }) => {
    if (teams[team]) {
      teams[team].splice(index, 1);
      io.emit('updateData', teams);
    }
  });

  socket.on('reorder', ({ team, newOrder }) => {
    teams[team] = newOrder;
    io.emit('updateData', teams);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
