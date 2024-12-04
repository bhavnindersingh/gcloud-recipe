require('dotenv').config();
const { Client, Pool } = require('pg');

// Create a single pool instance
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'recipe_db',
    password: 'postgres',
    port: 5432
});

async function runDiagnostics() {
    console.log('🔍 Starting Database Diagnostics...\n');

    // Step 1: Try connecting to PostgreSQL
    const mainClient = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'postgres',
        port: 5432,
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
            user: 'postgres',
            host: 'localhost',
            database: 'recipe_db',
            password: 'postgres',
            port: 5432,
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

        // Step 5: Check and add menu-related columns
        console.log('\n5️⃣ Checking and adding menu-related columns...');
        try {
            // Start a transaction
            await recipeClient.query('BEGIN');

            // Check if menu-related columns exist
            const result = await recipeClient.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'recipes' 
                AND column_name IN (
                    'print_menu_ready',
                    'qr_menu_ready',
                    'website_menu_ready',
                    'available_for_delivery',
                    'delivery_image_url'
                );
            `);

            console.log('Existing menu columns:', result.rows);

            // Add missing columns if they don't exist
            await recipeClient.query(`
                ALTER TABLE recipes
                ADD COLUMN IF NOT EXISTS print_menu_ready BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS qr_menu_ready BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS website_menu_ready BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS available_for_delivery BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS delivery_image_url TEXT;
            `);

            // Verify the columns were added
            const verifyResult = await recipeClient.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'recipes';
            `);

            console.log('All columns after update:', verifyResult.rows);

            // Commit the transaction
            await recipeClient.query('COMMIT');
            console.log('Schema update completed successfully');

        } catch (err) {
            await recipeClient.query('ROLLBACK');
            console.error('Error updating schema:', err);
        }

        await recipeClient.end();
    } catch (err) {
        console.error('❌ Error during diagnostics:', err.message);
    } finally {
        await mainClient.end();
    }
}

async function diagnoseMenuFields() {
    try {
        console.log('🔍 Starting menu fields diagnostic...\n');

        // Test database connection first
        console.log('Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful\n');

        // 1. Check if menu columns exist
        console.log('1️⃣ Checking menu columns in schema...');
        const schemaQuery = `
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'recipes'
            AND column_name IN (
                'print_menu_ready',
                'qr_menu_ready',
                'website_menu_ready',
                'available_for_delivery',
                'delivery_image_url'
            )
            ORDER BY ordinal_position;
        `;
        
        const schemaResult = await pool.query(schemaQuery);
        if (schemaResult.rows.length === 0) {
            console.log('❌ No menu columns found in schema! Please run add_menu_columns.sql');
            return;
        }
        console.log('Menu columns found in schema:');
        console.table(schemaResult.rows);

        // 2. Check current values in menu fields
        console.log('\n2️⃣ Checking current menu field values...');
        const valuesQuery = `
            SELECT 
                id,
                name,
                print_menu_ready,
                qr_menu_ready,
                website_menu_ready,
                available_for_delivery,
                delivery_image_url,
                created_at,
                updated_at
            FROM recipes
            ORDER BY id;
        `;
        
        const valuesResult = await pool.query(valuesQuery);
        console.log(`Found ${valuesResult.rows.length} recipes`);
        console.table(valuesResult.rows);

        // 3. Test menu field update
        console.log('\n3️⃣ Testing menu field update...');
        if (valuesResult.rows.length > 0) {
            const testRecipe = valuesResult.rows[0];
            console.log('Selected test recipe:', testRecipe.name, `(ID: ${testRecipe.id})`);
            
            // Start transaction
            await pool.query('BEGIN');
            
            try {
                // Flip all boolean values
                const updateQuery = `
                    UPDATE recipes
                    SET 
                        print_menu_ready = NOT COALESCE(print_menu_ready, false),
                        qr_menu_ready = NOT COALESCE(qr_menu_ready, false),
                        website_menu_ready = NOT COALESCE(website_menu_ready, false),
                        available_for_delivery = NOT COALESCE(available_for_delivery, false),
                        delivery_image_url = $1
                    WHERE id = $2
                    RETURNING *;
                `;
                
                const updateResult = await pool.query(updateQuery, [
                    'https://test-image.com/updated.jpg',
                    testRecipe.id
                ]);
                
                if (updateResult.rows.length === 0) {
                    throw new Error('Recipe not found during update');
                }
                
                console.log('Update successful. New values:');
                console.table(updateResult.rows);

                // Commit transaction
                await pool.query('COMMIT');
                console.log('✅ Transaction committed successfully');
                
            } catch (error) {
                await pool.query('ROLLBACK');
                console.error('❌ Error during update test:', error.message);
                throw error;
            }
        } else {
            console.log('❌ No recipes found to test update');
        }

        console.log('\n✅ Menu fields diagnostic completed successfully');

    } catch (error) {
        console.error('\n❌ Diagnostic error:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        if (error.detail) {
            console.error('Error detail:', error.detail);
        }
    } finally {
        await pool.end();
    }
}

runDiagnostics();
diagnoseMenuFields();
