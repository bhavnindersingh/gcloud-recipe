// Load environment variables first
require('dotenv').config();

console.log('Starting server with configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
});

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');

// Initialize Express app and router
const app = express();
const apiRouter = express.Router();

// Parse allowed origins from environment variable
let allowedOrigins;
try {
  allowedOrigins = JSON.parse(process.env.ALLOWED_ORIGINS || '["http://localhost:3000"]');
  console.log('Allowed origins:', allowedOrigins);
} catch (error) {
  console.error('Error parsing ALLOWED_ORIGINS:', error);
  allowedOrigins = ['http://localhost:3000'];
}

// Configure CORS
const corsOptions = {
  origin: function(origin, callback) {
    // Allow all origins in development
    console.log('CORS origin check:', { origin, allowedOrigins });
    callback(null, true); // Allow all origins
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 3600
};

// Enable CORS with options
app.use(cors(corsOptions));

// Body parsers before ANY routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log('\n=== Incoming Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Original URL:', req.originalUrl);
  console.log('Path:', req.path);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Params:', req.params);
  console.log('Query:', req.query);
  console.log('======================\n');
  next();
});

// Mount API router at /api
app.use('/api', apiRouter);

// Test endpoints AFTER API router
app.get('/test', (req, res) => {
  console.log('GET /test hit');
  res.json({ message: 'Test endpoint working' });
});

app.delete('/test', (req, res) => {
  console.log('DELETE /test hit');
  res.json({ message: 'Test DELETE working' });
});

// API test endpoints
apiRouter.get('/test', (req, res) => {
  console.log('API GET /test hit');
  res.json({ message: 'API test endpoint working' });
});

apiRouter.delete('/test', (req, res) => {
  console.log('API DELETE /test hit');
  res.json({ message: 'API DELETE test working' });
});

// Configure Database
const pool = new Pool({
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.DB_HOST,
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Test database connection with retries
async function connectWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      console.log('Successfully connected to PostgreSQL');
      client.release();
      return true;
    } catch (err) {
      console.error(`Failed to connect to PostgreSQL (attempt ${i + 1}/${maxRetries}):`, err.message);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  return false;
}

// Configure multer for file uploads
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default

const fileFilter = (req, file, cb) => {
  console.log('Processing file:', file);
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Base multer configuration
const multerConfig = {
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
};

// Create different multer instances for different upload scenarios
const singleUpload = multer(multerConfig).single('image');
const recipeUpload = multer(multerConfig).fields([
  { name: 'image', maxCount: 1 },
  { name: 'deliveryImage', maxCount: 1 }
]);

// Initialize Google Cloud Storage
let storage;
try {
  storage = new Storage({
    keyFilename: path.join(__dirname, 'recipe-storage-sa-key.json'),
    projectId: process.env.GCP_PROJECT_ID
  });
  console.log('Successfully initialized Google Cloud Storage');
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error);
}

const bucket = storage.bucket(process.env.STORAGE_BUCKET);
console.log('Using bucket:', process.env.STORAGE_BUCKET);

// Function to upload file to cloud storage
async function uploadToCloudStorage(file) {
  if (!file || !file.buffer) {
    throw new Error('No file provided for upload');
  }

  const timestamp = Date.now();
  const originalName = file.originalname;
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  const newFileName = `${baseName}_${timestamp}${extension}`;

  const blob = bucket.file(newFileName);
  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype
    }
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      console.error('Blob stream error:', err);
      reject(err);
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
}

// Add endpoint for single image upload
apiRouter.post('/upload-to-storage', (req, res) => {
  console.log('Received upload request');
  
  singleUpload(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
          });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'File upload failed: ' + err.message });
    }

    try {
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('File received:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const publicUrl = await uploadToCloudStorage(req.file);
      console.log('File uploaded successfully:', publicUrl);
      res.status(200).json({ url: publicUrl });
    } catch (error) {
      console.error('Error processing upload:', error);
      res.status(500).json({ error: 'Failed to process upload: ' + error.message });
    }
  });
});

// Add endpoint for creating new recipes
apiRouter.post('/recipes', async (req, res) => {
  let client;
  try {
    const {
      name,
      category,
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
      available_for_delivery,
      image_url,
      delivery_image_url,
      ingredients
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Recipe name is required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Insert recipe
    const recipeResult = await client.query(`
      INSERT INTO recipes (
        name, category, preparation_steps, cooking_method, plating_instructions,
        chefs_notes, selling_price, sales, overhead, total_cost, profit_margin,
        revenue, profit, markup_factor, print_menu_ready, qr_menu_ready,
        website_menu_ready, available_for_delivery, image_url, delivery_image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      name, 
      category || 'Uncategorized', 
      preparation_steps || '', 
      cooking_method || '', 
      plating_instructions || '',
      chefs_notes || '', 
      selling_price || 0, 
      sales || 0, 
      overhead || 10, 
      total_cost || 0, 
      profit_margin || 0,
      revenue || 0, 
      profit || 0, 
      markup_factor || 0, 
      print_menu_ready || false, 
      qr_menu_ready || false,
      website_menu_ready || false, 
      available_for_delivery || false, 
      image_url || null, 
      delivery_image_url || null
    ]);

    const recipeId = recipeResult.rows[0].id;

    // Insert recipe ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientValues = ingredients.map(ing => 
        `(${recipeId}, ${ing.id}, ${ing.quantity})`
      ).join(', ');

      await client.query(`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
        VALUES ${ingredientValues}
      `);
    }

    await client.query('COMMIT');

    // Fetch the complete recipe with ingredients
    const completeRecipe = await client.query(`
      SELECT 
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'name', i.name,
              'cost', i.cost,
              'unit', i.unit,
              'quantity', ri.quantity
            )
          ) FILTER (WHERE i.id IS NOT NULL), '[]'
        ) as ingredients
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [recipeId]);

    res.status(201).json(completeRecipe.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Error creating recipe:', err);
    res.status(500).json({ error: 'Failed to create recipe: ' + err.message });
  } finally {
    if (client) client.release();
  }
});

apiRouter.get('/recipes', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT 
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'quantity', ri.quantity,
              'name', i.name,
              'unit', i.unit,
              'cost', i.cost,
              'category', i.category
            ) ORDER BY i.name
          ) FILTER (WHERE i.id IS NOT NULL), '[]'
        ) as ingredients
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      GROUP BY r.id
      ORDER BY r.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  } finally {
    if (client) client.release();
  }
});

apiRouter.delete('/recipes/:id', async (req, res) => {
  let client;
  try {
    console.log('\n=== Delete Recipe Request ===');
    console.log('Params:', req.params);
    console.log('Recipe ID:', req.params.id);
    console.log('URL:', req.url);
    console.log('Original URL:', req.originalUrl);
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('==========================\n');
    
    const recipeId = parseInt(req.params.id, 10);
    console.log('Parsed recipe ID:', recipeId);
    
    if (isNaN(recipeId)) {
      console.log('Invalid recipe ID:', req.params.id);
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    client = await pool.connect();

    // Start transaction immediately
    await client.query('BEGIN');

    // Check if recipe exists and get its image URLs
    const existingRecipe = await client.query(
      'SELECT id, image_url, delivery_image_url FROM recipes WHERE id = $1 FOR UPDATE',
      [recipeId]
    );

    console.log('Query result:', existingRecipe.rows);

    if (existingRecipe.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('Recipe not found:', recipeId);
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipe = existingRecipe.rows[0];
    console.log('Found recipe to delete:', recipe);

    try {
      // Delete recipe ingredients first (due to foreign key constraint)
      const deleteIngredientsResult = await client.query(
        'DELETE FROM recipe_ingredients WHERE recipe_id = $1',
        [recipeId]
      );
      console.log('Deleted ingredients:', deleteIngredientsResult.rowCount);

      // Delete the recipe
      const deleteResult = await client.query(
        'DELETE FROM recipes WHERE id = $1 RETURNING id',
        [recipeId]
      );
      console.log('Delete result:', deleteResult.rowCount);

      if (deleteResult.rowCount === 0) {
        throw new Error('Failed to delete recipe');
      }

      // Delete images from cloud storage if they exist
      if (recipe.image_url || recipe.delivery_image_url) {
        const deletePromises = [];

        const deleteImage = async (url) => {
          if (!url) return;
          const fileName = url.split('/').pop();
          if (!fileName) return;
          
          try {
            console.log('Attempting to delete image:', fileName);
            await bucket.file(fileName).delete();
            console.log('Successfully deleted image:', fileName);
          } catch (err) {
            if (err.code === 404) {
              console.log('Image not found in storage:', fileName);
            } else {
              console.warn(`Warning: Failed to delete image ${fileName}:`, err);
            }
          }
        };

        if (recipe.image_url) {
          deletePromises.push(deleteImage(recipe.image_url));
        }
        if (recipe.delivery_image_url) {
          deletePromises.push(deleteImage(recipe.delivery_image_url));
        }

        await Promise.all(deletePromises);
        console.log('Image deletion completed');
      }

      await client.query('COMMIT');
      console.log('Recipe deleted successfully:', recipeId);
      res.json({ 
        message: 'Recipe deleted successfully',
        recipeId: recipeId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting recipe:', error);
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    res.status(500).json({ 
      error: 'Failed to delete recipe', 
      details: error.message,
      recipeId: req.params.id 
    });
  } finally {
    if (client) client.release();
  }
});

// Ingredients endpoints
apiRouter.get('/ingredients', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT * FROM ingredients ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching ingredients:', err);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  } finally {
    if (client) client.release();
  }
});

apiRouter.post('/ingredients', async (req, res) => {
  let client;
  try {
    const { name, cost, unit, supplier } = req.body;
    client = await pool.connect();
    const result = await client.query(
      'INSERT INTO ingredients (name, cost, unit, supplier) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, cost, unit, supplier]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating ingredient:', err);
    res.status(500).json({ error: 'Failed to create ingredient' });
  } finally {
    if (client) client.release();
  }
});

apiRouter.put('/ingredients/:id', async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    const { name, cost, unit, supplier } = req.body;
    
    client = await pool.connect();
    const result = await client.query(
      'UPDATE ingredients SET name = $1, cost = $2, unit = $3, supplier = $4 WHERE id = $5 RETURNING *',
      [name, cost, unit, supplier, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating ingredient:', err);
    res.status(500).json({ error: 'Failed to update ingredient' });
  } finally {
    if (client) client.release();
  }
});

apiRouter.delete('/ingredients/:id', async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    client = await pool.connect();
    const result = await client.query('DELETE FROM ingredients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json({ message: 'Ingredient deleted successfully' });
  } catch (err) {
    console.error('Error deleting ingredient:', err);
    res.status(500).json({ error: 'Failed to delete ingredient' });
  } finally {
    if (client) client.release();
  }
});

// Recipe endpoints
apiRouter.get('/recipes', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT 
        r.*,
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
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recipes:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  } finally {
    if (client) client.release();
  }
});

apiRouter.put('/recipes/:id', async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    const {
      category,
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
      available_for_delivery,
      image_url,
      delivery_image_url,
      ingredients
    } = req.body;

    client = await pool.connect();
    await client.query('BEGIN');

    // Update recipe
    const recipeResult = await client.query(`
      UPDATE recipes SET
        category = $1,
        preparation_steps = $2,
        cooking_method = $3,
        plating_instructions = $4,
        chefs_notes = $5,
        selling_price = $6,
        sales = $7,
        overhead = $8,
        total_cost = $9,
        profit_margin = $10,
        revenue = $11,
        profit = $12,
        markup_factor = $13,
        print_menu_ready = $14,
        qr_menu_ready = $15,
        website_menu_ready = $16,
        available_for_delivery = $17,
        image_url = $18,
        delivery_image_url = $19,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *
    `, [
      category, preparation_steps, cooking_method, plating_instructions,
      chefs_notes, selling_price, sales, overhead, total_cost, profit_margin,
      revenue, profit, markup_factor, print_menu_ready, qr_menu_ready,
      website_menu_ready, available_for_delivery, image_url, delivery_image_url,
      id
    ]);

    if (recipeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Update recipe ingredients
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
    
    if (ingredients && ingredients.length > 0) {
      const ingredientValues = ingredients.map(ing => 
        `(${id}, ${ing.id}, ${ing.quantity})`
      ).join(', ');

      await client.query(`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
        VALUES ${ingredientValues}
      `);
    }

    await client.query('COMMIT');

    // Fetch the complete updated recipe with ingredients
    const completeRecipe = await client.query(`
      SELECT 
        r.*,
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
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);

    res.json(completeRecipe.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating recipe:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  } finally {
    if (client) client.release();
  }
});

// Sales import endpoint
apiRouter.post('/recipes/sales-import', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const { recipes: salesData } = req.body;
    
    if (!Array.isArray(salesData)) {
      return res.status(400).json({ error: 'Invalid data format. Expected an array of recipes.' });
    }

    const results = {
      updated: [],
      created: [],
      failed: []
    };

    await client.query('BEGIN');

    for (const item of salesData) {
      try {
        // Check if recipe exists
        let recipe = await client.query(
          'SELECT id, name FROM recipes WHERE LOWER(name) = LOWER($1)',
          [item.name]
        );

        if (recipe.rows.length === 0) {
          // Create new recipe if it doesn't exist
          const newRecipe = await client.query(
            'INSERT INTO recipes (name, category, sales) VALUES ($1, $2, $3) RETURNING id, name',
            [item.name, 'Uncategorized', item.sales]
          );
          results.created.push({
            name: item.name,
            id: newRecipe.rows[0].id,
            sales: item.sales
          });
        } else {
          // Update existing recipe
          await client.query(
            'UPDATE recipes SET sales = $1 WHERE id = $2',
            [item.sales, recipe.rows[0].id]
          );
          results.updated.push({
            name: item.name,
            id: recipe.rows[0].id,
            sales: item.sales
          });
        }
      } catch (error) {
        results.failed.push({
          name: item.name,
          error: error.message
        });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      results: {
        updated: results.updated,
        created: results.created,
        failed: results.failed
      }
    });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error in sales import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process sales data',
      details: error.message
    });
  } finally {
    if (client) client.release();
  }
});

// Serve static files if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  
  // Always return JSON response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Catch-all handler for debugging - MUST be last
app.use('*', (req, res) => {
  console.log('Catch-all hit:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path
  });
  // Return JSON for all unmatched routes
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
});