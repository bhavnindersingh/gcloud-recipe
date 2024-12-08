require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'recipe_db'




    =\
    \
    password: 'postgres',
    port: 5432
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
