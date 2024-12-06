-- Remove delivery_packaging column from recipes table
ALTER TABLE recipes DROP COLUMN IF EXISTS delivery_packaging;
