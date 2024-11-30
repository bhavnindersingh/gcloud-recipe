require('dotenv').config();
const { Pool } = require('pg');

// First connect to default postgres database
const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
    ssl: false
});

const createDbAndTables = async () => {
    const client = await pool.connect();
    try {
        // Create database (cannot be done in a transaction)
        // First, terminate all connections to the database if it exists
        await client.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'recipe_db'
            AND pid <> pg_backend_pid();
        `);
        await client.query('DROP DATABASE IF EXISTS recipe_db;');
        await client.query('CREATE DATABASE recipe_db;');
        console.log('Database created successfully');

        // Close connection to postgres database
        client.release();
        await pool.end();

        // Connect to our new database
        const recipeDb = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: false
        });

        // Create tables
        const recipeClient = await recipeDb.connect();
        try {
            await recipeClient.query('BEGIN');
            await recipeClient.query(`
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
            await recipeClient.query('COMMIT');
            console.log('Tables created successfully');
        } catch (err) {
            await recipeClient.query('ROLLBACK');
            throw err;
        } finally {
            recipeClient.release();
            await recipeDb.end();
        }
    } catch (err) {
        console.error('Error setting up database:', err);
    }
};

createDbAndTables();
