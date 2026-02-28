import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post('/api/join-walk', async (req, res) => {
  const { walkId, userEmail } = req.body;
  if (!walkId || !userEmail) return res.status(400).json({ error: 'Missing params' });

  try {
    // Prevent duplicate join
    const { data: existing } = await supabase
      .from('walk_participants')
      .select('*')
      .eq('walk_id', walkId)
      .eq('user_email', userEmail);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already joined this walk' });
    }

    // Add participant
    const { error: insertError } = await supabase
      .from('walk_participants')
      .insert([{ walk_id: walkId, user_email: userEmail }]);
    if (insertError) throw insertError;

    // Increment joinedSpots
    const { data: walkData, error: walkError } = await supabase
      .from('walks')
      .select('joinedSpots')
      .eq('id', walkId)
      .single();
    if (walkError) throw walkError;

    const { error: updateError } = await supabase
      .from('walks')
      .update({ joinedSpots: walkData.joinedSpots + 1 })
      .eq('id', walkId);
    if (updateError) throw updateError;

    // Return updated walk
    const { data: walk, error: finalError } = await supabase
      .from('walks')
      .select('*')
      .eq('id', walkId)
      .single();
    if (finalError) throw finalError;

    res.json({ walk });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;