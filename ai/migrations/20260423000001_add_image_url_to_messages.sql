-- Add image_url to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
