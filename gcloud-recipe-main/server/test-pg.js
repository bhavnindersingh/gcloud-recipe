require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Using postgres database to create our DB
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
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
