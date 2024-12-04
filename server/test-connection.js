require('dotenv').config();
const { Pool } = require('pg');

const connectionConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'recipe_db',
    password: 'postgres',
    port: 5432
};

console.log('Attempting to connect with these parameters:');
console.log('User:', connectionConfig.user);
console.log('Host:', connectionConfig.host);
console.log('Database:', connectionConfig.database);
console.log('Port:', connectionConfig.port);

const pool = new Pool(connectionConfig);

async function testConnection() {
    try {
        console.log('\nTesting connection...');
        const client = await pool.connect();
        
        // Test basic query
        const versionResult = await client.query('SELECT version()');
        console.log('✅ Successfully connected to PostgreSQL!');
        console.log('PostgreSQL version:', versionResult.rows[0].version);

        // Test database specific query
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log('\n✅ Successfully queried recipe_db!');
        console.log('Available tables:', tablesResult.rows.map(row => row.table_name));

        // Test a query on each table
        for (const row of tablesResult.rows) {
            const tableName = row.table_name;
            const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
            console.log(`Table ${tableName}: ${countResult.rows[0].count} rows`);
        }

        // Test ingredient insertion
        console.log('\nTesting ingredient insertion...');
        const testIngredient = {
            name: 'Test Ingredient',
            cost: 5.99,
            unit: 'kg',
            supplier: 'Test Supplier'
        };
        
        const insertResult = await client.query(
            'INSERT INTO ingredients (name, cost, unit, supplier) VALUES ($1, $2, $3, $4) RETURNING *',
            [testIngredient.name, testIngredient.cost, testIngredient.unit, testIngredient.supplier]
        );
        console.log('✅ Successfully inserted test ingredient:', insertResult.rows[0]);

        // Verify ingredients table
        const ingredientsCount = await client.query('SELECT COUNT(*) FROM ingredients');
        console.log(`Ingredients table now has ${ingredientsCount.rows[0].count} rows`);

        client.release();
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('\nTroubleshooting tips:');
        console.error('1. Check if PostgreSQL service is running (PID: 16488)');
        console.error('2. Verify the connection string: postgresql://postgres:postgres@localhost:5432/recipe_db');
        console.error('3. Make sure recipe_db exists in your PostgreSQL instance');
        console.error('4. Check if port 5432 is not blocked');
    } finally {
        await pool.end();
    }
}

testConnection();
