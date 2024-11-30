const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Configure CORS for production
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Ingredient routes
app.get('/api/ingredients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ingredients ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ingredients', async (req, res) => {
    const { name, cost, unit, supplier } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO ingredients (name, cost, unit, supplier) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, cost, unit, supplier]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/ingredients/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM ingredients WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Recipe routes
app.get('/api/recipes', async (req, res) => {
    try {
        const recipes = await pool.query('SELECT * FROM recipes ORDER BY name');
        
        // Get ingredients for each recipe
        for (let recipe of recipes.rows) {
            const ingredients = await pool.query(
                `SELECT i.*, ri.quantity 
                FROM ingredients i 
                JOIN recipe_ingredients ri ON i.id = ri.ingredient_id 
                WHERE ri.recipe_id = $1`,
                [recipe.id]
            );
            recipe.ingredients = ingredients.rows;
        }
        
        res.json(recipes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recipes', async (req, res) => {
    const { name, category, selling_price, monthly_sales, ingredients } = req.body;
    try {
        // Start a transaction
        await pool.query('BEGIN');
        
        // Insert recipe
        const recipeResult = await pool.query(
            'INSERT INTO recipes (name, category, selling_price, monthly_sales) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, category, selling_price, monthly_sales]
        );
        
        const recipe = recipeResult.rows[0];
        
        // Insert recipe ingredients
        for (let ingredient of ingredients) {
            await pool.query(
                'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES ($1, $2, $3)',
                [recipe.id, ingredient.id, ingredient.quantity]
            );
        }
        
        await pool.query('COMMIT');
        
        // Get complete recipe with ingredients
        const completeRecipe = await pool.query(
            `SELECT r.*, 
            json_agg(json_build_object(
                'id', i.id,
                'name', i.name,
                'cost', i.cost,
                'unit', i.unit,
                'quantity', ri.quantity
            )) as ingredients
            FROM recipes r
            LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
            LEFT JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE r.id = $1
            GROUP BY r.id`,
            [recipe.id]
        );
        
        res.status(201).json(completeRecipe.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/recipes/:id', async (req, res) => {
    try {
        await pool.query('BEGIN');
        // Delete recipe ingredients first
        await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [req.params.id]);
        // Then delete the recipe
        await pool.query('DELETE FROM recipes WHERE id = $1', [req.params.id]);
        await pool.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});