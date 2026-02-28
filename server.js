const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- In-memory data store ----
let walks = [
  {
    id: 1,
    name: 'Maya K.',
    initials: 'MK',
    year: 'Junior',
    avatarClass: 'avatar-blue',
    from: 'The Green',
    to: 'Main St',
    time: 'Tonight, 10:00 PM',
    isoTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    maxSpots: 4,
    joinedSpots: 1,
    type: 'night',
    typeBadge: 'badge-night',
    typeLabel: '🌙 Night Safety',
    tags: ['Night Walk', 'Safe Route', 'Well-Lit'],
    notes: 'Heading to pick up food. Happy to have company!',
    filter: 'night',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Jordan R.',
    initials: 'JR',
    year: 'Sophomore',
    avatarClass: 'avatar-teal',
    from: 'Gore Hall',
    to: 'Trabant',
    time: 'Tomorrow, 8:00 AM',
    isoTime: new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString(),
    maxSpots: 3,
    joinedSpots: 0,
    type: 'morning',
    typeBadge: 'badge-morning',
    typeLabel: '☀️ Morning',
    tags: ['Morning Walk', 'Coffee Stop', 'Chill Pace'],
    notes: '',
    filter: 'morning',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Sam T.',
    initials: 'ST',
    year: 'Senior',
    avatarClass: 'avatar-purple',
    from: 'Pencader',
    to: 'Library',
    time: 'Today, 2:30 PM',
    isoTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    maxSpots: 5,
    joinedSpots: 2,
    type: 'study',
    typeBadge: 'badge-study',
    typeLabel: '📚 Study Break',
    tags: ['Study Break', 'Fresh Air', 'Library Bound'],
    notes: 'Taking a quick break from studying. Join if you need air!',
    filter: 'study',
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    name: 'Priya M.',
    initials: 'PM',
    year: 'Freshman',
    avatarClass: 'avatar-rose',
    from: 'Rodney Complex',
    to: 'Russell Hall',
    time: 'Tonight, 11:30 PM',
    isoTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    maxSpots: 3,
    joinedSpots: 1,
    type: 'night',
    typeBadge: 'badge-night',
    typeLabel: '🌙 Night Safety',
    tags: ['Night Walk', 'Campus Route'],
    notes: 'Walking back from the library. Anyone nearby?',
    filter: 'night',
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    name: 'Chris B.',
    initials: 'CB',
    year: 'Grad Student',
    avatarClass: 'avatar-orange',
    from: 'Iron Hill Brewery',
    to: 'Academy St',
    time: 'Saturday, 9:00 AM',
    isoTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    maxSpots: 6,
    joinedSpots: 3,
    type: 'exercise',
    typeBadge: 'badge-exercise',
    typeLabel: '🏃 Exercise',
    tags: ['Morning Run', '5K Route', 'All Paces Welcome'],
    notes: 'Easy jog around Newark. All paces welcome, no one left behind.',
    filter: 'exercise',
    createdAt: new Date().toISOString()
  },
  {
    id: 6,
    name: 'Leila A.',
    initials: 'LA',
    year: 'Junior',
    avatarClass: 'avatar-green',
    from: 'Sharp Lab',
    to: 'Perkins Student Center',
    time: 'Today, 4:00 PM',
    isoTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    maxSpots: 4,
    joinedSpots: 1,
    type: 'casual',
    typeBadge: 'badge-casual',
    typeLabel: '😊 Casual',
    tags: ['Casual', 'Meet New People', 'Afternoon Vibes'],
    notes: 'Done with class, want to walk slowly and decompress.',
    filter: 'casual',
    createdAt: new Date().toISOString()
  }
];

let nextId = 7;

// ---- API Routes ----

// GET all walks (optional filter via query param ?type=night)
app.get('/api/walks', (req, res) => {
  const { type } = req.query;
  const result = type && type !== 'all'
    ? walks.filter(w => w.filter === type)
    : walks;
  res.json(result);
});

// GET single walk
app.get('/api/walks/:id', (req, res) => {
  const walk = walks.find(w => w.id === parseInt(req.params.id));
  if (!walk) return res.status(404).json({ error: 'Walk not found' });
  res.json(walk);
});

// POST create a new walk
app.post('/api/walks', (req, res) => {
  const { name, email, year, from, to, isoTime, maxSpots, type, notes } = req.body;

  // Validate UD email
  if (!email || !email.toLowerCase().endsWith('@udel.edu')) {
    return res.status(400).json({ error: 'A valid @udel.edu email is required.' });
  }

  if (!name || !from || !to || !isoTime || !maxSpots || !type) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const typeMap = {
    casual:   { label: '😊 Casual',       badge: 'badge-casual',   filter: 'casual'   },
    night:    { label: '🌙 Night Safety',  badge: 'badge-night',    filter: 'night'    },
    morning:  { label: '☀️ Morning',       badge: 'badge-morning',  filter: 'morning'  },
    study:    { label: '📚 Study Break',   badge: 'badge-study',    filter: 'study'    },
    exercise: { label: '🏃 Exercise',      badge: 'badge-exercise', filter: 'exercise' }
  };

  const tagsByType = {
    night:    ['Night Walk', 'Safe Route'],
    morning:  ['Morning Walk', 'Fresh Start'],
    study:    ['Study Break', 'Stretch Legs'],
    exercise: ['Exercise', 'Active'],
    casual:   ['Casual', 'Social']
  };

  const avatarClasses = ['avatar-blue', 'avatar-teal', 'avatar-purple', 'avatar-rose', 'avatar-orange', 'avatar-green'];
  const parts = name.trim().split(' ');
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  const dt = new Date(isoTime);
  const timeStr = dt.toLocaleDateString('en-US', { weekday: 'short' }) + ', ' +
    dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const typeInfo = typeMap[type] || typeMap.casual;

  const newWalk = {
    id: nextId++,
    name: name.trim(),
    initials,
    year: year || 'Student',
    avatarClass: avatarClasses[Math.floor(Math.random() * avatarClasses.length)],
    from: from.trim(),
    to: to.trim(),
    time: timeStr,
    isoTime,
    maxSpots: parseInt(maxSpots),
    joinedSpots: 0,
    type,
    typeBadge: typeInfo.badge,
    typeLabel: typeInfo.label,
    tags: tagsByType[type] || ['Walk'],
    notes: notes ? notes.trim() : '',
    filter: typeInfo.filter,
    createdAt: new Date().toISOString()
  };

  walks.unshift(newWalk);
  res.status(201).json(newWalk);
});

// POST join a walk
app.post('/api/walks/:id/join', (req, res) => {
  const walk = walks.find(w => w.id === parseInt(req.params.id));
  if (!walk) return res.status(404).json({ error: 'Walk not found' });

  const spotsLeft = walk.maxSpots - walk.joinedSpots - 1;
  if (spotsLeft <= 0) return res.status(409).json({ error: 'Walk is full.' });

  walk.joinedSpots++;
  res.json({ success: true, walk });
});

// DELETE a walk (admin / poster only — simplified, no auth)
app.delete('/api/walks/:id', (req, res) => {
  const index = walks.findIndex(w => w.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Walk not found' });
  walks.splice(index, 1);
  res.json({ success: true });
});

// Serve the frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🐓 Blue Hen Walks running at http://localhost:${PORT}\n`);
});
