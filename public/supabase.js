/* supabase.js — shared Supabase client for all TrailMate pages */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabase = createClient(
  'https://zsujhugkllbnqidswkgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdWpodWdrbGxibnFpZHN3a2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDEzMDksImV4cCI6MjA4Nzg3NzMwOX0.uhVV5pfHjADE19ZrSUdvVKGi3ZgmRi9c0VRClCC8NsM'
);
