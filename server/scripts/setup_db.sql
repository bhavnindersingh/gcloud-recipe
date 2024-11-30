-- Create the database
CREATE DATABASE recipe_db;

-- Connect to the database
\c recipe_db;

-- Create tables
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    supplier VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    selling_price DECIMAL(10,2),
    monthly_sales INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_ingredients (
    recipe_id INTEGER REFERENCES recipes(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (recipe_id, ingredient_id)
);
