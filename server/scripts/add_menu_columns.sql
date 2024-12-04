-- Add menu-related columns to recipes table
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS print_menu_ready BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS qr_menu_ready BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS website_menu_ready BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS available_for_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_image_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have default values
UPDATE recipes 
SET print_menu_ready = COALESCE(print_menu_ready, false),
    qr_menu_ready = COALESCE(qr_menu_ready, false),
    website_menu_ready = COALESCE(website_menu_ready, false),
    available_for_delivery = COALESCE(available_for_delivery, false),
    delivery_image_url = COALESCE(delivery_image_url, ''),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);
