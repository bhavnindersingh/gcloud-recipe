-- Add missing columns to recipes table
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS preparation_steps TEXT,
ADD COLUMN IF NOT EXISTS cooking_method TEXT,
ADD COLUMN IF NOT EXISTS plating_instructions TEXT,
ADD COLUMN IF NOT EXISTS chefs_notes TEXT,
ADD COLUMN IF NOT EXISTS print_menu_ready BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS qr_menu_ready BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS website_menu_ready BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS available_for_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_image_url TEXT,
ADD COLUMN IF NOT EXISTS overhead DECIMAL(5,2) DEFAULT 10,
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_profit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS markup_factor DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
