import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://qiztckqawtyuducthevs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpenRja3Fhd3R5dWR1Y3RoZXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjY1MDgsImV4cCI6MjA4ODQwMjUwOH0.kA8E182O_ewmsHqAnaP1IO9FF9ILIAA2EarM_d9J6qg' 
);