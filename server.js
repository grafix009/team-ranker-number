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

  // NEW: Add a new team
  socket.on('addTeam', ({ name }) => {
    if (!name || name.trim() === '') {
      return; // Invalid team name
    }
    
    const teamName = name.trim();
    
    // Check if team already exists
    if (teams[teamName]) {
      console.log(`Team "${teamName}" already exists`);
      return;
    }
    
    // Get existing items from any existing team to populate the new team
    let existingItems = [];
    const existingTeams = Object.keys(teams);
    
    if (existingTeams.length > 0) {
      // Copy items from the first team (they should all have the same items)
      existingItems = teams[existingTeams[0]].map(item => ({ ...item }));
    }
    
    // Create new team with copies of existing items
    teams[teamName] = existingItems;
    io.emit('updateData', teams);
    console.log(`Team "${teamName}" created with ${existingItems.length} existing items`);
  });

  // NEW: Rename an existing team
  socket.on('renameTeam', ({ oldName, newName }) => {
    if (!oldName || !newName || newName.trim() === '') {
      return; // Invalid names
    }
    
    const trimmedNewName = newName.trim();
    
    // Check if old team exists
    if (!teams[oldName]) {
      console.log(`Team "${oldName}" does not exist`);
      return;
    }
    
    // Check if new name already exists
    if (teams[trimmedNewName]) {
      console.log(`Team "${trimmedNewName}" already exists`);
      return;
    }
    
    // Create new team with old team's data and delete old team
    teams[trimmedNewName] = teams[oldName];
    delete teams[oldName];
    io.emit('updateData', teams);
    console.log(`Team renamed from "${oldName}" to "${trimmedNewName}"`);
  });

  // NEW: Delete a team
  socket.on('deleteTeam', ({ team }) => {
    if (!team) {
      return; // Invalid team name
    }
    
    // Check if team exists
    if (!teams[team]) {
      console.log(`Team "${team}" does not exist`);
      return;
    }
    
    // Delete the team
    delete teams[team];
    io.emit('updateData', teams);
    console.log(`Team "${team}" deleted`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));