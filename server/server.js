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

// Migration endpoint
app.post('/api/migrate', async (req, res) => {
    try {
        // Check if delivery_packaging column exists
        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'recipes' 
            AND column_name = 'delivery_packaging'
        `);

        if (checkColumn.rows.length === 0) {
            // Add delivery_packaging column if it doesn't exist
            await pool.query(`
                ALTER TABLE recipes 
                ADD COLUMN delivery_packaging TEXT DEFAULT ''
            `);
            console.log('Added delivery_packaging column');
        }

        res.json({ message: 'Migration completed successfully' });
    } catch (err) {
        console.error('Migration error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Ingredient routes
app.get('/api/ingredients', async (req, res) => {
    try {
        console.log('Attempting to fetch ingredients...');
        const result = await pool.query('SELECT * FROM ingredients ORDER BY name');
        // Ensure cost is a number for each ingredient
        const ingredients = result.rows.map(ingredient => {
            const rawCost = ingredient.cost;
            let parsedCost;
            
            // Handle different types of cost values
            if (rawCost === null || rawCost === undefined) {
                parsedCost = 0;
            } else if (typeof rawCost === 'string') {
                parsedCost = parseFloat(rawCost.replace(/[^\d.-]/g, '')) || 0;
            } else if (typeof rawCost === 'number') {
                parsedCost = rawCost;
            } else {
                parsedCost = 0;
            }
            
            console.log(`Processing ingredient ${ingredient.name}:`, {
                rawCost,
                rawCostType: typeof rawCost,
                parsedCost
            });

            return {
                ...ingredient,
                cost: parsedCost
            };
        });
        
        console.log('Successfully processed ingredients:', ingredients);
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
        console.log('Fetching recipes...');
        const recipes = await pool.query(`
            SELECT r.*, 
            json_agg(
                json_build_object(
                    'id', i.id,
                    'name', i.name,
                    'cost', i.cost,
                    'unit', i.unit,
                    'quantity', ri.quantity
                )
            ) as ingredients
            FROM recipes r
            LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
            LEFT JOIN ingredients i ON ri.ingredient_id = i.id
            GROUP BY r.id
            ORDER BY r.updated_at DESC
        `);
        console.log('🔵 Fetched recipes:', recipes.rows);
        res.json(recipes.rows);
    } catch (err) {
        console.error('Error fetching recipes:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recipes', async (req, res) => {
    try {
        console.log('Creating new recipe:', req.body);

        // Input validation
        if (!req.body.name || !req.body.category) {
            throw new Error('Name and category are required');
        }

        await pool.query('BEGIN');

        try {
            // Insert recipe
            const result = await pool.query(
                `INSERT INTO recipes (
                    name, category, description,
                    preparation_steps, cooking_method, plating_instructions,
                    chefs_notes, selling_price, monthly_sales,
                    overhead, print_menu_ready, qr_menu_ready,
                    website_menu_ready, available_for_delivery, delivery_image_url,
                    total_cost, profit_margin, monthly_revenue,
                    monthly_profit, markup_factor
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
                ) RETURNING *`,
                [
                    req.body.name,
                    req.body.category,
                    req.body.description || '',
                    req.body.preparation_steps || '',
                    req.body.cooking_method || '',
                    req.body.plating_instructions || '',
                    req.body.chefs_notes || '',
                    req.body.selling_price || 0,
                    req.body.monthly_sales || 0,
                    req.body.overhead || 10,
                    req.body.print_menu_ready || false,
                    req.body.qr_menu_ready || false,
                    req.body.website_menu_ready || false,
                    req.body.available_for_delivery || false,
                    req.body.delivery_image_url || '',
                    req.body.total_cost || 0,
                    req.body.profit_margin || 0,
                    req.body.monthly_revenue || 0,
                    req.body.monthly_profit || 0,
                    req.body.markup_factor || 0
                ]
            );

            // Handle ingredients if provided
            if (req.body.ingredients && Array.isArray(req.body.ingredients)) {
                for (const ingredient of req.body.ingredients) {
                    await pool.query(
                        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES ($1, $2, $3)',
                        [result.rows[0].id, ingredient.id, ingredient.quantity || 0]
                    );
                }
            }

            await pool.query('COMMIT');

            // Fetch complete recipe with ingredients
            const completeRecipe = await pool.query(
                `SELECT r.*, 
                json_agg(
                    CASE WHEN i.id IS NOT NULL THEN
                        json_build_object(
                            'id', i.id,
                            'name', i.name,
                            'cost', i.cost,
                            'unit', i.unit,
                            'quantity', ri.quantity
                        )
                    ELSE NULL END
                ) as ingredients
                FROM recipes r
                LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
                LEFT JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE r.id = $1
                GROUP BY r.id`,
                [result.rows[0].id]
            );

            // Filter out null values from ingredients array
            const finalRecipe = {
                ...completeRecipe.rows[0],
                ingredients: completeRecipe.rows[0].ingredients.filter(i => i !== null)
            };

            res.json(finalRecipe);

        } catch (err) {
            await pool.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Error creating recipe:', err);
        res.status(500).json({ 
            error: 'Failed to create recipe', 
            details: err.message 
        });
    }
});

app.put('/api/recipes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        console.log('Updating recipe:', id);
        console.log('Request body:', req.body);

        // Input validation
        if (!req.body.name || !req.body.category) {
            throw new Error('Name and category are required');
        }

        // Validate image data if present
        if (req.body.delivery_image_url && !req.body.delivery_image_url.startsWith('data:image/')) {
            throw new Error('Invalid image data format');
        }

        await pool.query('BEGIN');

        try {
            // Check if recipe exists
            const existingRecipe = await pool.query(
                'SELECT * FROM recipes WHERE id = $1',
                [id]
            );

            if (existingRecipe.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ error: 'Recipe not found' });
            }

            // Update recipe
            const result = await pool.query(
                `UPDATE recipes 
                SET 
                    name = $1,
                    category = $2,
                    description = $3,
                    preparation_steps = $4,
                    cooking_method = $5,
                    plating_instructions = $6,
                    chefs_notes = $7,
                    selling_price = $8,
                    monthly_sales = $9,
                    overhead = $10,
                    print_menu_ready = $11,
                    qr_menu_ready = $12,
                    website_menu_ready = $13,
                    available_for_delivery = $14,
                    delivery_image_url = $15,
                    total_cost = $16,
                    profit_margin = $17,
                    monthly_revenue = $18,
                    monthly_profit = $19,
                    markup_factor = $20,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $21
                RETURNING *`,
                [
                    req.body.name,
                    req.body.category,
                    req.body.description || '',
                    req.body.preparation_steps || '',
                    req.body.cooking_method || '',
                    req.body.plating_instructions || '',
                    req.body.chefs_notes || '',
                    req.body.selling_price || 0,
                    req.body.monthly_sales || 0,
                    req.body.overhead || 10,
                    req.body.print_menu_ready || false,
                    req.body.qr_menu_ready || false,
                    req.body.website_menu_ready || false,
                    req.body.available_for_delivery || false,
                    req.body.delivery_image_url || '',
                    req.body.total_cost || 0,
                    req.body.profit_margin || 0,
                    req.body.monthly_revenue || 0,
                    req.body.monthly_profit || 0,
                    req.body.markup_factor || 0,
                    id
                ]
            );

            // Update ingredients if provided
            if (req.body.ingredients && Array.isArray(req.body.ingredients)) {
                await pool.query(
                    'DELETE FROM recipe_ingredients WHERE recipe_id = $1',
                    [id]
                );

                for (const ingredient of req.body.ingredients) {
                    await pool.query(
                        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES ($1, $2, $3)',
                        [id, ingredient.id, ingredient.quantity || 0]
                    );
                }
            }

            await pool.query('COMMIT');

            // Fetch complete recipe with ingredients
            const completeRecipe = await pool.query(
                `SELECT r.*, 
                json_agg(
                    CASE WHEN i.id IS NOT NULL THEN
                        json_build_object(
                            'id', i.id,
                            'name', i.name,
                            'cost', i.cost,
                            'unit', i.unit,
                            'quantity', ri.quantity
                        )
                    ELSE NULL END
                ) as ingredients
                FROM recipes r
                LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
                LEFT JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE r.id = $1
                GROUP BY r.id`,
                [id]
            );

            // Filter out null values from ingredients array
            const finalRecipe = {
                ...completeRecipe.rows[0],
                ingredients: completeRecipe.rows[0].ingredients.filter(i => i !== null)
            };

            res.json(finalRecipe);

        } catch (err) {
            await pool.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Error updating recipe:', err);
        res.status(500).json({ 
            error: 'Failed to update recipe', 
            details: err.message 
        });
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