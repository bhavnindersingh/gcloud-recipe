const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure CORS with specific options
const allowedOrigins = process.env.ALLOWED_ORIGINS ? [process.env.ALLOWED_ORIGINS] : [
  'http://localhost:3002', 
  'http://localhost:3000', 
  'https://recipe-frontend-786959629970.us-central1.run.app',
  'https://recipe.consciouscafe.in'
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to handle multiple file uploads
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'delivery_image', maxCount: 1 }
]);

// Database configuration
const dbConfig = process.env.DATABASE_URL
  ? {
      // Production config (Google Cloud)
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      // Local development config
      user: 'postgres',
      password: 'postgres',
      database: 'recipe_db',
      host: 'localhost',
      port: 5432,
      ssl: false
    };

const pool = new Pool(dbConfig);

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to database');
    client.query('SELECT NOW()', (err, result) => {
      done();
      if (err) {
        console.error('Error running test query:', err);
      } else {
        console.log('Database test query successful:', result.rows[0]);
      }
    });
  }
});

// Create ingredients table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    category VARCHAR(100)
  );
`)
.then(() => console.log('Ingredients table created or already exists'))
.catch(err => console.error('Error creating ingredients table:', err));

// Run migration for image_url column
pool.query('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url TEXT;')
  .then(() => console.log('Added image_url column'))
  .catch(err => console.error('Error adding image_url column:', err));

// Run migration for delivery_image_url column
pool.query('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS delivery_image_url TEXT;')
  .then(() => console.log('Added delivery_image_url column'))
  .catch(err => console.error('Error adding delivery_image_url column:', err));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Recipe Manager API Server',
    status: 'running',
    endpoints: {
      recipes: '/api/recipes',
      ingredients: '/api/ingredients'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message
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

// Ingredients routes
app.get('/api/ingredients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching ingredients:', err);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

app.post('/api/ingredients', async (req, res) => {
  try {
    const { name, unit, cost, category } = req.body;
    const result = await pool.query(
      'INSERT INTO ingredients (name, unit, cost, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, unit, cost, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating ingredient:', err);
    res.status(500).json({ error: 'Failed to create ingredient' });
  }
});

app.put('/api/ingredients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, cost, category } = req.body;
    const result = await pool.query(
      'UPDATE ingredients SET name = $1, unit = $2, cost = $3, category = $4 WHERE id = $5 RETURNING *',
      [name, unit, cost, category, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating ingredient:', err);
    res.status(500).json({ error: 'Failed to update ingredient' });
  }
});

app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM ingredients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting ingredient:', err);
    res.status(500).json({ error: 'Failed to delete ingredient' });
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

app.post('/api/recipes', uploadFields, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Validate required fields
    const { name, category, ingredients: ingredientsJson } = req.body;
    
    if (!name || !name.trim()) {
      throw new Error('Recipe name is required');
    }

    if (!category || !category.trim()) {
      throw new Error('Category is required');
    }

    // Parse ingredients array
    let ingredients = [];
    try {
      ingredients = JSON.parse(ingredientsJson || '[]');
    } catch (e) {
      console.error('Error parsing ingredients:', e);
      ingredients = [];
    }

    // Start transaction
    await client.query('BEGIN');

    // Process recipe data
    const recipeData = {
      name: name.trim(),
      category: category.trim(),
      description: req.body.description?.trim() || '',
      preparation_steps: req.body.preparation_steps?.trim() || '',
      cooking_method: req.body.cooking_method?.trim() || '',
      plating_instructions: req.body.plating_instructions?.trim() || '',
      chefs_notes: req.body.chefs_notes?.trim() || '',
      selling_price: parseFloat(req.body.selling_price) || 0,
      sales: parseInt(req.body.sales) || 0,
      overhead: parseFloat(req.body.overhead) || 0,
      total_cost: parseFloat(req.body.total_cost) || 0,
      profit_margin: parseFloat(req.body.profit_margin) || 0,
      revenue: parseFloat(req.body.revenue) || 0,
      profit: parseFloat(req.body.profit) || 0,
      markup_factor: parseFloat(req.body.markup_factor) || 0,
      print_menu_ready: req.body.print_menu_ready === 'true',
      qr_menu_ready: req.body.qr_menu_ready === 'true',
      website_menu_ready: req.body.website_menu_ready === 'true',
      available_for_delivery: req.body.available_for_delivery === 'true',
    };

    // Handle image files
    const getImageUrl = (filename) => {
      if (!filename) return null;
      return process.env.NODE_ENV === 'production'
        ? `https://recipe-backend-786959629970.us-central1.run.app/uploads/${filename}`
        : `/uploads/${filename}`;
    };

    if (req.files?.image) {
      const imagePath = req.files.image[0].filename;
      recipeData.image_url = imagePath; // Store only filename in database
      console.log('Saved image:', imagePath);
    }

    if (req.files?.delivery_image) {
      const deliveryImagePath = req.files.delivery_image[0].filename;
      recipeData.delivery_image_url = deliveryImagePath; // Store only filename in database
      console.log('Saved delivery image:', deliveryImagePath);
    }

    // Insert recipe
    const result = await client.query(
      `INSERT INTO recipes (
        name, category, description, preparation_steps, 
        cooking_method, plating_instructions, chefs_notes,
        selling_price, sales, overhead, total_cost,
        profit_margin, revenue, profit,
        markup_factor, print_menu_ready, qr_menu_ready,
        website_menu_ready, available_for_delivery, 
        image_url, delivery_image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21)
      RETURNING *`,
      [
        recipeData.name,
        recipeData.category,
        recipeData.description,
        recipeData.preparation_steps,
        recipeData.cooking_method,
        recipeData.plating_instructions,
        recipeData.chefs_notes,
        recipeData.selling_price,
        recipeData.sales,
        recipeData.overhead,
        recipeData.total_cost,
        recipeData.profit_margin,
        recipeData.revenue,
        recipeData.profit,
        recipeData.markup_factor,
        recipeData.print_menu_ready,
        recipeData.qr_menu_ready,
        recipeData.website_menu_ready,
        recipeData.available_for_delivery,
        recipeData.image_url || null,
        recipeData.delivery_image_url || null
      ]
    );

    const recipeId = result.rows[0].id;

    // Insert recipe ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientValues = ingredients.map(ing => 
        `(${recipeId}, ${ing.id}, ${parseFloat(ing.quantity)})`
      ).join(',');

      await client.query(`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
        VALUES ${ingredientValues}
      `);
    }

    // Fetch complete recipe with ingredients
    const completeRecipe = await client.query(
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
      [recipeId]
    );

    // Commit transaction
    await client.query('COMMIT');
    
    // Transform image URLs in the response
    const transformedRecipe = {
      ...completeRecipe.rows[0],
      image_url: getImageUrl(completeRecipe.rows[0].image_url),
      delivery_image_url: getImageUrl(completeRecipe.rows[0].delivery_image_url)
    };

    res.json(transformedRecipe);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating recipe:', error);
    res.status(500).json({ 
      error: 'Failed to create recipe', 
      message: error.message 
    });
  } finally {
    client.release();
  }
});

app.put('/api/recipes/:id', uploadFields, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Updating recipe:', id);
        console.log('Received data:', req.body);
        console.log('Received file:', req.file);

        // Parse ingredients if it's a string
        let parsedIngredients = req.body.ingredients;
        if (typeof req.body.ingredients === 'string') {
            parsedIngredients = JSON.parse(req.body.ingredients);
        }

        // Start a transaction
        const client = await pool.connect();
        try {
            // First check if recipe exists
            const existingRecipe = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
            if (existingRecipe.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Recipe not found' });
            }

            const {
                name,
                category,
                description,
                preparation_steps,
                cooking_method,
                plating_instructions,
                chefs_notes,
                selling_price,
                sales,
                overhead,
                total_cost,
                profit_margin,
                revenue,
                profit,
                markup_factor,
                print_menu_ready,
                qr_menu_ready,
                website_menu_ready,
                available_for_delivery
            } = req.body;

            // If a new image is uploaded, use its URL, otherwise keep the existing one
            let imageUrl = req.files.image 
                ? req.files.image[0].filename
                : undefined;  // undefined means don't update the image_url

            let deliveryImageUrl = req.files.delivery_image
                ? req.files.delivery_image[0].filename
                : undefined;  // undefined means don't update the delivery_image_url

            // Update recipe
            const updateFields = [
                'name = $1',
                'category = $2',
                'description = $3',
                'preparation_steps = $4',
                'cooking_method = $5',
                'plating_instructions = $6',
                'chefs_notes = $7',
                'selling_price = $8',
                'sales = $9',
                'overhead = $10',
                'total_cost = $11',
                'profit_margin = $12',
                'revenue = $13',
                'profit = $14',
                'markup_factor = $15',
                'print_menu_ready = $16',
                'qr_menu_ready = $17',
                'website_menu_ready = $18',
                'available_for_delivery = $19'
            ];

            const values = [
                name || '',
                category || '',
                description || '',
                preparation_steps || '',
                cooking_method || '',
                plating_instructions || '',
                chefs_notes || '',
                parseFloat(selling_price) || 0,
                parseInt(sales) || 0,
                parseFloat(overhead) || 0,
                parseFloat(total_cost) || 0,
                parseFloat(profit_margin) || 0,
                parseFloat(revenue) || 0,
                parseFloat(profit) || 0,
                parseFloat(markup_factor) || 0,
                print_menu_ready === 'true',
                qr_menu_ready === 'true',
                website_menu_ready === 'true',
                available_for_delivery === 'true'
            ];

            // Add image_url to update if a new image was uploaded
            if (imageUrl !== undefined) {
                updateFields.push('image_url = $20');
                values.push(imageUrl);
            }

            // Add delivery_image_url to update if a new delivery image was uploaded
            if (deliveryImageUrl !== undefined) {
                updateFields.push('delivery_image_url = $21');
                values.push(deliveryImageUrl);
            }

            values.push(id); // Add id as the last parameter

            const updateQuery = `
                UPDATE recipes 
                SET ${updateFields.join(', ')}
                WHERE id = $${values.length}
                RETURNING *
            `;

            console.log('Update query:', updateQuery);
            console.log('Update values:', values);

            const result = await client.query(updateQuery, values);

            // Delete existing ingredients
            await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);

            // Insert new ingredients
            if (parsedIngredients && Array.isArray(parsedIngredients)) {
                for (const ingredient of parsedIngredients) {
                    await client.query(
                        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES ($1, $2, $3)',
                        [id, ingredient.id, parseFloat(ingredient.quantity) || 0]
                    );
                }
            }

            await client.query('COMMIT');

            // Fetch complete updated recipe with ingredients
            const completeRecipe = await client.query(
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

            // Transform image URLs in the response
            const transformedRecipe = {
              ...finalRecipe,
              image_url: getImageUrl(finalRecipe.image_url),
              delivery_image_url: getImageUrl(finalRecipe.delivery_image_url)
            };

            res.json(transformedRecipe);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.status(500).json({ 
            error: 'Failed to update recipe', 
            message: error.message 
        });
    }
});

app.delete('/api/recipes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Deleting recipe:', id);

        // Start transaction
        const client = await pool.connect();
        try {
            // First check if recipe exists
            const recipe = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
            if (recipe.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Recipe not found' });
            }

            // Delete associated ingredients first
            await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);

            // Delete the recipe
            const result = await client.query('DELETE FROM recipes WHERE id = $1 RETURNING *', [id]);

            // Delete associated image file if it exists
            if (recipe.rows[0].image_url) {
                const imagePath = recipe.rows[0].image_url;
                if (imagePath) {
                    const fullPath = path.join(__dirname, 'uploads', imagePath);
                    try {
                        await fs.promises.unlink(fullPath);
                        console.log('Deleted image file:', fullPath);
                    } catch (err) {
                        console.error('Error deleting image file:', err);
                        // Continue with deletion even if image removal fails
                    }
                }
            }

            // Delete associated delivery image file if it exists
            if (recipe.rows[0].delivery_image_url) {
                const deliveryImagePath = recipe.rows[0].delivery_image_url;
                if (deliveryImagePath) {
                    const fullPath = path.join(__dirname, 'uploads', deliveryImagePath);
                    try {
                        await fs.promises.unlink(fullPath);
                        console.log('Deleted delivery image file:', fullPath);
                    } catch (err) {
                        console.error('Error deleting delivery image file:', err);
                        // Continue with deletion even if image removal fails
                    }
                }
            }

            await client.query('COMMIT');

            res.json({ success: true, deletedRecipe: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({
            error: 'Failed to delete recipe',
            details: error.message
        });
    }
});

// Update recipe sales
app.patch('/api/recipes/:id/sales', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { sales } = req.body;

        // Validate sales value
        if (typeof sales !== 'number' || sales < 0) {
            return res.status(400).json({ error: 'Invalid sales value' });
        }

        // Update recipe sales
        const result = await client.query(
            'UPDATE recipes SET sales = $1 WHERE id = $2 RETURNING *',
            [sales, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating recipe sales:', error);
        res.status(500).json({
            error: 'Failed to update recipe sales',
            details: error.message
        });
    } finally {
        client.release();
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
        
        // Transform image URLs in the response
        const getImageUrl = (filename) => {
          if (!filename) return null;
          return process.env.NODE_ENV === 'production'
            ? `https://recipe-backend-786959629970.us-central1.run.app/uploads/${filename}`
            : `/uploads/${filename}`;
        };

        const transformedRecipes = recipes.rows.map(recipe => ({
            ...recipe,
            image_url: getImageUrl(recipe.image_url),
            delivery_image_url: getImageUrl(recipe.delivery_image_url)
        }));
        
        console.log('🔵 Fetched recipes:', transformedRecipes);
        res.json(transformedRecipes);
    } catch (err) {
        console.error('Error fetching recipes:', err);
        res.status(500).json({ error: err.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle any requests that don't match the above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Use port 3001 for local development, 8080 for Google Cloud
const PORT = process.env.DATABASE_URL ? (process.env.PORT || 8080) : 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});