const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'scores.json'); // this is where i save all the scores, acts like my database
const TOP_N = 10; // only keep the top 10 scores, no need for more

// middleware setup — cors lets the browser talk to the api, json lets me read request bodies
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // this serves my index.html, style.css and game.js automatically

// reads the scores.json file and returns the array
// if the file doesnt exist yet it just returns an empty array so nothing breaks
function readScores() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// takes the scores array and writes it back to the json file
// i call this every time someone saves a new score
function writeScores(scores) {
  fs.writeFileSync(DB_FILE, JSON.stringify(scores, null, 2));
}

// GET /api/scores
// the leaderboard calls this when the page loads to show the current top 10
app.get('/api/scores', (req, res) => {
  res.json(readScores());
});

// POST /api/scores
// called when a player finishes a game and clicks Save Score
// i validate the score here so nobody can send a fake crazy number
app.post('/api/scores', (req, res) => {
  const { name, score } = req.body;

  if (typeof score !== 'number' || score < 0 || score > 9999) {
    return res.status(400).json({ error: 'Invalid score.' });
  }

  // clean up the name just in case, max 16 characters
  const safeName = String(name || 'Anonymous').trim().slice(0, 16) || 'Anonymous';

  // load current scores, add the new one, sort highest first, keep only top 10
  const scores = readScores();
  scores.push({ name: safeName, score });
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, TOP_N);
  writeScores(top);

  res.status(201).json(top); // send the updated leaderboard back so the ui can refresh right away
});

// start the server — open http://localhost:3000 in the browser to play
app.listen(PORT, () => {
  console.log(`Click Blitz running → http://localhost:${PORT}`);
});