const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432,
});

async function testConnection() {
    try {
        await client.connect();
        const res = await client.query('SELECT version()');
        console.log('Connected to PostgreSQL!');
        console.log('PostgreSQL version:', res.rows[0].version);
        
        // Try to create the database
        await client.query('DROP DATABASE IF EXISTS recipe_db');
        await client.query('CREATE DATABASE recipe_db');
        console.log('Database created successfully!');
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

testConnection();
