// joinWalk.js — secure endpoint
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // secret key, not exposed to frontend
);

app.post('/api/join-walk', async (req, res) => {
  const { walkId, userEmail } = req.body;
  if (!walkId || !userEmail) return res.status(400).json({ error: 'Missing params' });

  try {
    // Add participant
    const { error: insertError } = await supabase
      .from('walk_participants')
      .insert([{ walk_id: walkId, user_email: userEmail }]);

    if (insertError) throw insertError;

    // Increment joinedSpots
    const { error: updateError } = await supabase
      .from('walks')
      .update({ joinedSpots: supabase.literal('joinedSpots + 1') })
      .eq('id', walkId);

    if (updateError) throw updateError;

    // Return updated walk
    const { data: walk, error: walkError } = await supabase
      .from('walks')
      .select('*')
      .eq('id', walkId)
      .single();

    if (walkError) throw walkError;

    res.json({ walk });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;