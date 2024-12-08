const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'recipe_db',
    password: 'postgres',
    port: 5432
});

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, 'migrations', 'add_recipe_fields.sql');
        const sql = await fs.readFile(migrationPath, 'utf8');
        
        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
