-- Update admin password hash
UPDATE users 
SET password_hash = '$2b$12$DJ91nDiFePfPDQqRu3iDkuyoWiWCmH7D2RpTrZ5eM7SGRvKKy1HeS' 
WHERE username = 'admin';
