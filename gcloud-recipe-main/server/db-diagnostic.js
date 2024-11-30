require('dotenv').config();
const { Client } = require('pg');

async function runDiagnostics() {
    console.log('🔍 Starting Database Diagnostics...\n');

    // Step 1: Try connecting to PostgreSQL
    const mainClient = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: 'postgres',
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    try {
        console.log('1️⃣ Checking PostgreSQL Connection...');
        await mainClient.connect();
        console.log('✅ Successfully connected to PostgreSQL\n');

        // Step 2: Check if recipe_db exists
        console.log('2️⃣ Checking if recipe_db exists...');
        const dbCheckResult = await mainClient.query(
            "SELECT datname FROM pg_database WHERE datname = 'recipe_db'"
        );
        
        if (dbCheckResult.rows.length === 0) {
            console.log('❌ recipe_db does not exist!\n');
            return;
        }
        console.log('✅ recipe_db exists\n');

        // Connect to recipe_db
        const recipeClient = new Client({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: 'recipe_db',
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
        });

        await recipeClient.connect();

        // Step 3: Check if tables exist
        console.log('3️⃣ Checking database tables...');
        const tables = ['ingredients', 'recipes', 'recipe_ingredients'];
        
        for (const table of tables) {
            const tableResult = await recipeClient.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
                [table]
            );
            if (tableResult.rows[0].exists) {
                console.log(`✅ Table '${table}' exists`);
                
                // Check row count
                const countResult = await recipeClient.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   - Contains ${countResult.rows[0].count} rows`);
                
                // Show sample data if any exists
                if (countResult.rows[0].count > 0) {
                    const sampleData = await recipeClient.query(`SELECT * FROM ${table} LIMIT 3`);
                    console.log('   - Sample data:');
                    console.table(sampleData.rows);
                }
            } else {
                console.log(`❌ Table '${table}' does not exist`);
            }
        }

        // Step 4: Test insert operations
        console.log('\n4️⃣ Testing database operations...');
        
        // Test ingredient insert
        try {
            await recipeClient.query('BEGIN');
            
            const testIngredient = await recipeClient.query(
                'INSERT INTO ingredients (name, cost, unit) VALUES ($1, $2, $3) RETURNING *',
                ['TEST_INGREDIENT', 10.00, 'kg']
            );
            console.log('✅ Successfully inserted test ingredient');
            
            // Clean up test data
            await recipeClient.query('ROLLBACK');
            console.log('✅ Successfully rolled back test data');
        } catch (err) {
            console.log('❌ Failed to test insert operation:', err.message);
            await recipeClient.query('ROLLBACK');
        }

        await recipeClient.end();
    } catch (err) {
        console.error('❌ Error during diagnostics:', err.message);
    } finally {
        await mainClient.end();
    }
}

runDiagnostics();
