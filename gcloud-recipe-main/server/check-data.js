require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkData() {
    try {
        await client.connect();
        
        // Check recipes
        const recipes = await client.query('SELECT * FROM recipes');
        console.log('Recipes in database:', recipes.rows);
        
        // Check ingredients
        const ingredients = await client.query('SELECT * FROM ingredients');
        console.log('Ingredients in database:', ingredients.rows);
        
        // Check recipe_ingredients
        const recipeIngredients = await client.query('SELECT * FROM recipe_ingredients');
        console.log('Recipe ingredients in database:', recipeIngredients.rows);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkData();
