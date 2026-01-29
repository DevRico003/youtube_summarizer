-- Seed Security Questions for better-auth password reset
-- This file is used by docker-entrypoint.sh

INSERT OR IGNORE INTO SecurityQuestion (id, question) VALUES
  ('sq_01', 'What was the name of your first pet?'),
  ('sq_02', 'What city were you born in?'),
  ('sq_03', 'What was the name of your elementary school?'),
  ('sq_04', 'What is your mother''s maiden name?'),
  ('sq_05', 'What was the make of your first car?'),
  ('sq_06', 'What is the name of your favorite childhood friend?'),
  ('sq_07', 'What street did you grow up on?'),
  ('sq_08', 'What was your childhood nickname?'),
  ('sq_09', 'What is the middle name of your oldest sibling?'),
  ('sq_10', 'What was the name of your first employer?'),
  ('sq_11', 'What is your favorite movie?'),
  ('sq_12', 'What is the name of your favorite sports team?'),
  ('sq_13', 'What was your favorite food as a child?'),
  ('sq_14', 'What is the name of the hospital where you were born?'),
  ('sq_15', 'What is the name of your favorite book?');
