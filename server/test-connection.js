require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT version()');
        console.log('Successfully connected to PostgreSQL!');
        console.log('PostgreSQL version:', result.rows[0].version);
        client.release();
    } catch (err) {
        console.error('Error connecting to the database:', err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
