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

// ---- Community Data ----
const communityStats = {
  activeStudents: 342,
  walksCompleted: 1247,
  avgRating: 4.9,
  safeNights: 1247
};

const leaderboard = [
  { rank: 1, name: 'Maya K.',   initials: 'MK', avatarClass: 'avatar-blue',   walks: 47, steps: 284300, miles: 128.4, rating: 5.0, year: 'Junior',       badge: 'Trail Guide',       badges: ['Trail Guide', 'Night Owl', '100 Walks', 'Early Bird'] },
  { rank: 2, name: 'Jordan R.', initials: 'JR', avatarClass: 'avatar-teal',   walks: 38, steps: 231600, miles: 104.7, rating: 4.9, year: 'Sophomore',    badge: 'Night Owl',         badges: ['Night Owl', '50 Walks', 'Campus Explorer'] },
  { rank: 3, name: 'Sam T.',    initials: 'ST', avatarClass: 'avatar-purple', walks: 31, steps: 198400, miles: 89.6,  rating: 5.0, year: 'Senior',       badge: 'Campus Legend',     badges: ['Campus Legend', 'Trail Guide', '50 Walks', 'Study Buddy', 'Mentor'] },
  { rank: 4, name: 'Priya M.',  initials: 'PM', avatarClass: 'avatar-rose',   walks: 28, steps: 176200, miles: 79.5,  rating: 4.8, year: 'Freshman',     badge: 'Rising Star',       badges: ['Rising Star', '25 Walks'] },
  { rank: 5, name: 'Chris B.',  initials: 'CB', avatarClass: 'avatar-orange', walks: 25, steps: 162800, miles: 73.6,  rating: 4.9, year: 'Grad Student', badge: 'Early Bird',        badges: ['Early Bird', 'Marathon Walker', '25 Walks'] },
  { rank: 6, name: 'Leila A.',  initials: 'LA', avatarClass: 'avatar-green',  walks: 21, steps: 134500, miles: 60.8,  rating: 4.8, year: 'Junior',       badge: 'Social Butterfly', badges: ['Social Butterfly', '25 Walks'] },
  { rank: 7, name: 'Aiden W.',  initials: 'AW', avatarClass: 'avatar-blue',   walks: 18, steps: 118900, miles: 53.7,  rating: 4.7, year: 'Sophomore',    badge: 'Night Owl',         badges: ['Night Owl', '10 Walks'] },
  { rank: 8, name: 'Nora F.',   initials: 'NF', avatarClass: 'avatar-rose',   walks: 15, steps: 96200,  miles: 43.5,  rating: 5.0, year: 'Freshman',     badge: 'Rising Star',       badges: ['Rising Star', '10 Walks'] },
  { rank: 9, name: 'Eli D.',    initials: 'ED', avatarClass: 'avatar-teal',   walks: 12, steps: 78400,  miles: 35.4,  rating: 4.9, year: 'Junior',       badge: 'Study Buddy',       badges: ['Study Buddy'] },
  { rank: 10, name: 'Zara H.',  initials: 'ZH', avatarClass: 'avatar-purple', walks: 10, steps: 64100,  miles: 29.0,  rating: 4.8, year: 'Senior',       badge: 'Campus Explorer',   badges: ['Campus Explorer'] },
];

const campusTips = [
  { icon: '💡', title: 'Stick to lit paths',   body: 'Main Street and The Green are brightly lit at night. Avoid cutting through wooded areas after dark.' },
  { icon: '📱', title: 'Share your location',  body: 'Drop a pin to a trusted friend when you head out. A quick "walking home now" text goes a long way.' },
  { icon: '🎧', title: 'Stay aware',            body: 'Keep one earbud out at night. Being able to hear your surroundings is key to staying safe.' },
  { icon: '👥', title: 'Walk in groups',        body: 'Groups of 3+ are significantly less likely to be targeted. Use TrailMate to find walk partners.' },
  { icon: '🔦', title: 'Be visible',            body: 'Light-colored clothing and reflective gear makes you visible to drivers on Academy and Main.' },
  { icon: '📞', title: 'Save UDPD',             body: 'Save (302) 831-2222 in your phone. UDPD also offers a free safety escort service on request.' },
];

const safeRoutes = [
  { id: 1, name: 'The Green → Gore Hall',        distance: '0.3 mi', lighting: 'Excellent', cameras: true,  popular: true,  notes: 'Well-lit all night, security cameras throughout' },
  { id: 2, name: 'Trabant → Pencader',           distance: '0.5 mi', lighting: 'Good',      cameras: true,  popular: true,  notes: 'Busy route, frequently patrolled by UDPD' },
  { id: 3, name: 'Main St → Morris Library',     distance: '0.4 mi', lighting: 'Excellent', cameras: true,  popular: false, notes: 'Busy commercial street, always well-lit' },
  { id: 4, name: 'Rodney Complex → Russell Hall',distance: '0.6 mi', lighting: 'Good',      cameras: false, popular: true,  notes: 'Stick to paved paths through central campus' },
  { id: 5, name: 'Academy St → Gore Hall',       distance: '0.7 mi', lighting: 'Good',      cameras: true,  popular: false, notes: 'Use the main sidewalk along Academy' },
  { id: 6, name: 'Sharp Lab → Perkins Center',   distance: '0.4 mi', lighting: 'Excellent', cameras: true,  popular: true,  notes: 'Well-lit engineering quad route' },
];

// ---- Walk API Routes ----

// GET all walks (optional filter via ?type=night)
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

  if (!email || !email.toLowerCase().endsWith('@udel.edu')) {
    return res.status(400).json({ error: 'A valid @udel.edu email is required.' });
  }
  if (!name || !from || !to || !isoTime || !maxSpots || !type) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const typeMap = {
    casual:   { label: '😊 Casual',      badge: 'badge-casual',   filter: 'casual'   },
    night:    { label: '🌙 Night Safety', badge: 'badge-night',    filter: 'night'    },
    morning:  { label: '☀️ Morning',      badge: 'badge-morning',  filter: 'morning'  },
    study:    { label: '📚 Study Break',  badge: 'badge-study',    filter: 'study'    },
    exercise: { label: '🏃 Exercise',     badge: 'badge-exercise', filter: 'exercise' }
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
  if (walk.maxSpots - walk.joinedSpots - 1 <= 0) return res.status(409).json({ error: 'Walk is full.' });
  walk.joinedSpots++;
  res.json({ success: true, walk });
});

// DELETE a walk
app.delete('/api/walks/:id', (req, res) => {
  const index = walks.findIndex(w => w.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Walk not found' });
  walks.splice(index, 1);
  res.json({ success: true });
});

// ---- Community API Routes ----

app.get('/api/stats', (req, res) => {
  res.json({
    ...communityStats,
    walksCompleted: communityStats.walksCompleted + Math.max(0, walks.length - 6)
  });
});

app.get('/api/leaderboard', (req, res) => res.json(leaderboard));

app.get('/api/tips', (req, res) => res.json(campusTips));

app.get('/api/routes', (req, res) => res.json(safeRoutes));

// ---- Safety API Routes ----

app.post('/api/report', (req, res) => {
  const { type, description, location, contact } = req.body;
  if (!type || !description) {
    return res.status(400).json({ error: 'Type and description are required.' });
  }
  console.log('[SAFETY REPORT]', { type, description, location, contact, at: new Date().toISOString() });
  res.json({ success: true, message: 'Report received. Thank you for keeping TrailMate safe.' });
});

// ---- TRENDING API ----
app.get('/api/trending', (req, res) => {
  // Trending = sorted by most joined spots (highest demand)
  const trending = walks
    .sort((a, b) => (b.joinedSpots ?? b.joinedspots) - (a.joinedSpots ?? a.joinedspots))
    .slice(0, 5)  // Top 5 trending
    .map(w => ({
      id: w.id,
      name: w.name,
      from: w.from,
      to: w.to,
      joinedSpots: w.joinedSpots ?? w.joinedspots,
      maxSpots: w.maxSpots ?? w.maxspots,
      type: w.type,
      isoTime: w.isoTime
    }));
  res.json(trending);
});

// Serve the frontend for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🥾 TrailMate running at http://localhost:${PORT}\n`);
});
