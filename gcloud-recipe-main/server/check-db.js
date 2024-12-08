require('dotenv').config();
const { Client } = require('pg');

async function checkDatabase() {
    // First connect to postgres database to check if our database exists
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: 'postgres', // Connect to default postgres database
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        await client.connect();
        console.log('Connected to postgres database');

        // Check if recipe_db exists
        const result = await client.query(`
            SELECT datname FROM pg_database WHERE datname = 'recipe_db';
        `);

        if (result.rows.length === 0) {
            console.log('recipe_db does not exist, creating it...');
            await client.query('CREATE DATABASE recipe_db;');
            console.log('recipe_db created successfully');
        } else {
            console.log('recipe_db already exists');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkDatabase();
