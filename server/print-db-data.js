const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function printDatabaseData() {
    try {
        console.log('\n=== INGREDIENTS ===');
        const ingredients = await pool.query('SELECT * FROM ingredients ORDER BY id');
        console.table(ingredients.rows);

        console.log('\n=== RECIPES ===');
        const recipes = await pool.query('SELECT * FROM recipes ORDER BY id');
        console.table(recipes.rows);

        console.log('\n=== RECIPE_INGREDIENTS ===');
        const recipeIngredients = await pool.query(`
            SELECT 
                ri.recipe_id,
                r.name as recipe_name,
                ri.ingredient_id,
                i.name as ingredient_name,
                ri.quantity,
                i.unit
            FROM recipe_ingredients ri
            JOIN recipes r ON ri.recipe_id = r.id
            JOIN ingredients i ON ri.ingredient_id = i.id
            ORDER BY ri.recipe_id
        `);
        console.table(recipeIngredients.rows);

    } catch (err) {
        console.error('Error fetching data:', err);
    } finally {
        await pool.end();
    }
}

printDatabaseData();
