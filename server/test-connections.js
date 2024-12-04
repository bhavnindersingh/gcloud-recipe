const { Pool } = require('pg');
const db = require('./db');

// Test all database connections
async function testConnections() {
    console.log('🔍 Testing all database connections...\n');

    // Test db.js connection
    try {
        console.log('1️⃣ Testing db.js connection...');
        const result = await db.query('SELECT NOW()');
        console.log('✅ db.js connection successful!\n');
    } catch (err) {
        console.error('❌ db.js connection failed:', err.message, '\n');
    }

    // Test server.js style connection
    const serverPool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'recipe_db',
        password: 'postgres',
        port: 5432
    });

    try {
        console.log('2️⃣ Testing server.js connection...');
        const result = await serverPool.query('SELECT NOW()');
        console.log('✅ server.js connection successful!\n');
    } catch (err) {
        console.error('❌ server.js connection failed:', err.message, '\n');
    } finally {
        await serverPool.end();
    }

    // Test menu-related columns
    try {
        console.log('3️⃣ Testing menu columns...');
        const result = await db.query(`
            SELECT column_name, data_type 
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
        console.log('Menu columns found:', result.rows);
        console.log('✅ Menu columns check successful!\n');
    } catch (err) {
        console.error('❌ Menu columns check failed:', err.message, '\n');
    }
}

testConnections();
