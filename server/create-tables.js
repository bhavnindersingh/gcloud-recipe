const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'recipe_db',  // Note: now connecting to recipe_db
    password: 'postgres',
    port: 5432,
});

async function createTables() {
    try {
        await client.connect();
        
        // Create tables
        await client.query(`
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
        `);
        
        console.log('Tables created successfully!');
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

createTables();
