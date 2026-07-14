-- Assign the approved public portraits to the two published doctor profiles.
UPDATE doctors
SET photo_url = '/doctors/dr-tukaram-sonaji-aute.png'
WHERE slug = 'dr-tukaram-aute'
  AND photo_url IS DISTINCT FROM '/doctors/dr-tukaram-sonaji-aute.png';

UPDATE doctors
SET photo_url = '/doctors/dr-pratibha-pawal-aute.png'
WHERE slug = 'dr-pratibha-aute'
  AND photo_url IS DISTINCT FROM '/doctors/dr-pratibha-pawal-aute.png';
