const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'recipe_db',
    password: 'postgres',
    port: 5432,
});

async function updateSchema() {
    try {
        await client.connect();
        
        // Add missing columns to recipes table
        await client.query(`
            ALTER TABLE recipes 
            ADD COLUMN IF NOT EXISTS preparation_steps TEXT,
            ADD COLUMN IF NOT EXISTS cooking_method TEXT,
            ADD COLUMN IF NOT EXISTS plating_instructions TEXT,
            ADD COLUMN IF NOT EXISTS chefs_notes TEXT;
        `);
        
        // Add category to ingredients table
        await client.query(`
            ALTER TABLE ingredients 
            ADD COLUMN IF NOT EXISTS category VARCHAR(100);
        `);
        
        console.log('Schema updated successfully!');
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

updateSchema();
