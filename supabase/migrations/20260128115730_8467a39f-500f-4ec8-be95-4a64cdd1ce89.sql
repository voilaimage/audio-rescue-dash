-- Make request-photos bucket private to prevent unauthorized access
-- Anyone with a file URL would no longer be able to access photos without authentication

UPDATE storage.buckets 
SET public = false 
WHERE id = 'request-photos';