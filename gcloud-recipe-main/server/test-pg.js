require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'recipe_db',
    password: 'postgres',
    port: 5432
});

async function testConnection() {
    try {
        await client.connect();
        const res = await client.query('SELECT version()');
        console.log('Connected to PostgreSQL!');
        console.log('PostgreSQL version:', res.rows[0].version);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

testConnection();
