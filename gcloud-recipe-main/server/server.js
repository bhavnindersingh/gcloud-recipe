const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Configure CORS with specific options
const corsOptions = {
  origin: ['http://localhost:3002', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'recipe_db',
  password: 'postgres',
  port: 5432
});

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to database');
    client.query('SELECT NOW()', (err, result) => {
      done();
      if (err) {
        console.error('Error executing test query:', err);
      } else {
        console.log('Database test query successful:', result.rows[0]);
      }
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Ingredient routes
app.get('/api/ingredients', async (req, res) => {
    try {
        console.log('Attempting to fetch ingredients...');
        const result = await pool.query('SELECT * FROM ingredients ORDER BY name');
        // Ensure cost is a number for each ingredient
        const ingredients = result.rows.map(ingredient => ({
            ...ingredient,
            cost: parseFloat(ingredient.cost)
        }));
        console.log('Successfully fetched ingredients:', ingredients.length);
        res.json(ingredients);
    } catch (err) {
        console.error('Error fetching ingredients:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ingredients', async (req, res) => {
    const { name, cost, unit, category } = req.body;
    try {
        console.log('Attempting to save ingredient:', { name, cost: parseFloat(cost), unit, category });
        const result = await pool.query(
            'INSERT INTO ingredients (name, cost, unit, category) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, parseFloat(cost), unit, category]
        );
        console.log('Successfully saved ingredient:', result.rows[0]);
        const savedIngredient = {
            ...result.rows[0],
            cost: parseFloat(result.rows[0].cost)
        };
        res.json(savedIngredient);
    } catch (err) {
        console.error('Error saving ingredient:', err);
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
    const { name, category, selling_price, monthly_sales, preparation_steps, cooking_method, plating_instructions, chefs_notes, ingredients } = req.body;
    
    try {
        // Start a transaction
        await pool.query('BEGIN');
        
        // Insert recipe
        const recipeResult = await pool.query(
            `INSERT INTO recipes 
            (name, category, selling_price, monthly_sales, preparation_steps, cooking_method, plating_instructions, chefs_notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [name, category, selling_price, monthly_sales, preparation_steps, cooking_method, plating_instructions, chefs_notes]
        );
        
        const recipe = recipeResult.rows[0];
        
        // Insert recipe ingredients
        for (let ingredient of ingredients) {
            await pool.query(
                'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES ($1, $2, $3)',
                [recipe.id, ingredient.id, ingredient.quantity]
            );
        }
        
        // Commit transaction
        await pool.query('COMMIT');
        
        // Fetch the complete recipe with ingredients
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
        
        res.json(completeRecipe.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/recipes/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category, selling_price, monthly_sales, preparation_steps, cooking_method, plating_instructions, chefs_notes, ingredients } = req.body;
    
    try {
        // Start a transaction
        await pool.query('BEGIN');
        
        // Update recipe
        const recipeResult = await pool.query(
            `UPDATE recipes 
            SET name = $1, category = $2, selling_price = $3, monthly_sales = $4,
                preparation_steps = $5, cooking_method = $6, plating_instructions = $7, chefs_notes = $8
            WHERE id = $9 
            RETURNING *`,
            [name, category, selling_price, monthly_sales, preparation_steps, cooking_method, plating_instructions, chefs_notes, id]
        );
        
        if (recipeResult.rows.length === 0) {
            throw new Error('Recipe not found');
        }
        
        // Delete existing recipe ingredients
        await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
        
        // Insert updated recipe ingredients
        for (let ingredient of ingredients) {
            await pool.query(
                'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES ($1, $2, $3)',
                [id, ingredient.id, ingredient.quantity]
            );
        }
        
        // Commit transaction
        await pool.query('COMMIT');
        
        // Fetch the complete recipe with ingredients
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
            [id]
        );
        
        res.json(completeRecipe.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        if (err.message === 'Recipe not found') {
            res.status(404).json({ error: err.message });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.delete('/api/recipes/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Start a transaction
        await pool.query('BEGIN');
        
        // Delete recipe ingredients first (due to foreign key constraint)
        await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
        
        // Delete recipe
        const result = await pool.query('DELETE FROM recipes WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            throw new Error('Recipe not found');
        }
        
        // Commit transaction
        await pool.query('COMMIT');
        
        res.json({ success: true });
    } catch (err) {
        await pool.query('ROLLBACK');
        if (err.message === 'Recipe not found') {
            res.status(404).json({ error: err.message });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});