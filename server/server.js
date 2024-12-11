// Load environment variables first
require('dotenv').config();

const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

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
  // Default origins for development and production
  const defaultOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://recipe.consciouscafe.in']
    : ['http://localhost:3000'];
    
  allowedOrigins = JSON.parse(process.env.ALLOWED_ORIGINS || JSON.stringify(defaultOrigins));
  logger.info('Configured allowed origins:', { 
    origins: allowedOrigins,
    environment: process.env.NODE_ENV 
  });
} catch (error) {
  logger.error('Error parsing ALLOWED_ORIGINS:', error);
  allowedOrigins = ['http://localhost:3000'];
}

// Configure CORS
const corsOptions = {
  origin: function(origin, callback) {
    logger.info(`Incoming request from origin: ${origin || 'no origin'}`);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      logger.info('Allowing request with no origin');
      return callback(null, true);
    }

    // Log the current allowed origins for debugging
    logger.info('Current allowed origins:', allowedOrigins);

    if (allowedOrigins.includes(origin)) {
      logger.info(`Allowing request from origin: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`Rejected request from unauthorized origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS. Allowed origins are: ${allowedOrigins.join(', ')}`));
    }
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
  const logInfo = {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  };
  
  // Use appropriate log levels
  if (req.method === 'GET') {
    logger.debug('Incoming request:', logInfo);
  } else {
    logger.info('Request details:', logInfo);
  }
  next();
});

// Mount API router at /api
app.use('/api', apiRouter);

// Test endpoints AFTER API router
app.get('/test', (req, res) => {
  logger.info('GET /test hit');
  res.json({ message: 'Test endpoint working' });
});

app.delete('/test', (req, res) => {
  logger.info('DELETE /test hit');
  res.json({ message: 'Test DELETE working' });
});

// API test endpoints
apiRouter.get('/test', (req, res) => {
  logger.info('API GET /test hit');
  res.json({ message: 'API test endpoint working' });
});

apiRouter.delete('/test', (req, res) => {
  logger.info('API DELETE /test hit');
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
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 10000,
  max: 5,  // Reduced max connections
  min: 1,  // Minimum connections
  keepAlive: true
});

// Add pool error handler
pool.on('error', (err, client) => {
  logger.error('Database pool error:', err.message);
});

// Test database connection with retries
async function connectWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      logger.info('Successfully connected to PostgreSQL');
      client.release();
      return true;
    } catch (err) {
      logger.error(`Failed to connect to PostgreSQL (attempt ${i + 1}/${maxRetries}):`, err.message);
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
  logger.info('Processing file:', file);
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
  logger.info('Successfully initialized Google Cloud Storage');
} catch (error) {
  logger.error('Error initializing Google Cloud Storage:', error);
}

const bucket = storage.bucket(process.env.STORAGE_BUCKET);
logger.info('Using bucket:', process.env.STORAGE_BUCKET);

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
      logger.error('Blob stream error:', err);
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
  logger.info('Received upload request');
  
  singleUpload(req, res, async (err) => {
    if (err) {
      logger.error('Multer error:', err);
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
        logger.error('No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      logger.info('File received:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const publicUrl = await uploadToCloudStorage(req.file);
      logger.info('File uploaded successfully:', publicUrl);
      res.status(200).json({ url: publicUrl });
    } catch (error) {
      logger.error('Error processing upload:', error);
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
    logger.error('Error creating recipe:', err);
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

    // Calculate total cost for each recipe
    const recipesWithCost = result.rows.map(recipe => {
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        const totalCost = recipe.ingredients.reduce((sum, ing) => {
          return sum + (ing.cost * ing.quantity);
        }, 0);
        return { ...recipe, total_cost: totalCost };
      }
      return recipe;
    });

    res.json(recipesWithCost);
  } catch (err) {
    logger.error('Error fetching recipes:', err);
    res.status(500).json({ 
      error: 'Failed to fetch recipes',
      message: err.message 
    });
  } finally {
    if (client) client.release();
  }
});

apiRouter.delete('/recipes/:id', async (req, res) => {
  let client;
  try {
    logger.info('\n=== Delete Recipe Request ===');
    logger.info('Params:', req.params);
    logger.info('Recipe ID:', req.params.id);
    logger.info('URL:', req.url);
    logger.info('Original URL:', req.originalUrl);
    logger.info('Path:', req.path);
    logger.info('Method:', req.method);
    logger.info('Headers:', req.headers);
    logger.info('==========================\n');
    
    const recipeId = parseInt(req.params.id, 10);
    logger.info('Parsed recipe ID:', recipeId);
    
    if (isNaN(recipeId)) {
      logger.error('Invalid recipe ID:', req.params.id);
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

    logger.info('Query result:', existingRecipe.rows);

    if (existingRecipe.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.error('Recipe not found:', recipeId);
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipe = existingRecipe.rows[0];
    logger.info('Found recipe to delete:', recipe);

    try {
      // Delete recipe ingredients first (due to foreign key constraint)
      const deleteIngredientsResult = await client.query(
        'DELETE FROM recipe_ingredients WHERE recipe_id = $1',
        [recipeId]
      );
      logger.info('Deleted ingredients:', deleteIngredientsResult.rowCount);

      // Delete the recipe
      const deleteResult = await client.query(
        'DELETE FROM recipes WHERE id = $1 RETURNING id',
        [recipeId]
      );
      logger.info('Delete result:', deleteResult.rowCount);

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
            logger.info('Attempting to delete image:', fileName);
            await bucket.file(fileName).delete();
            logger.info('Successfully deleted image:', fileName);
          } catch (err) {
            if (err.code === 404) {
              logger.error('Image not found in storage:', fileName);
            } else {
              logger.warn(`Warning: Failed to delete image ${fileName}:`, err);
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
        logger.info('Image deletion completed');
      }

      await client.query('COMMIT');
      logger.info('Recipe deleted successfully:', recipeId);
      res.json({ 
        message: 'Recipe deleted successfully',
        recipeId: recipeId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error deleting recipe:', error);
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error rolling back transaction:', rollbackError);
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
    logger.error('Error fetching ingredients:', err);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  } finally {
    if (client) client.release();
  }
});

apiRouter.post('/ingredients', async (req, res) => {
  let client;
  try {
    const { name, cost, unit, category } = req.body;
    
    // Validate required fields
    if (!name || !cost || !unit) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Name, cost, and unit are required.'
      });
    }

    client = await pool.connect();
    const result = await client.query(
      'INSERT INTO ingredients (name, cost, unit, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, cost, unit, category || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Error creating ingredient:', err);
    res.status(500).json({ error: 'Failed to create ingredient' });
  } finally {
    if (client) client.release();
  }
});

apiRouter.put('/ingredients/:id', async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    const { name, unit, cost, category } = req.body;
    
    // Validate required fields
    if (!name || !cost || !unit) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Name, cost, and unit are required.'
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Update the ingredient
    const result = await client.query(
      'UPDATE ingredients SET name = $1, unit = $2, cost = $3, category = $4 WHERE id = $5 RETURNING *',
      [name, unit, cost, category || null, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Update total cost for all recipes that use this ingredient
    await client.query(`
      WITH recipe_costs AS (
        SELECT 
          r.id as recipe_id,
          COALESCE(SUM(ri.quantity * i.cost), 0) as new_total_cost
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        GROUP BY r.id
      )
      UPDATE recipes r
      SET total_cost = rc.new_total_cost,
          updated_at = CURRENT_TIMESTAMP
      FROM recipe_costs rc
      WHERE r.id = rc.recipe_id
    `);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating ingredient:', err);
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error rolling back transaction:', rollbackError);
      }
    }
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

    // First check if the ingredient is used in any recipes
    const usageCheck = await client.query(
      'SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Ingredient in use',
        message: 'This ingredient cannot be deleted as it is being used in one or more recipes'
      });
    }

    const result = await client.query('DELETE FROM ingredients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json({ 
      success: true,
      message: 'Ingredient deleted successfully',
      ingredient: result.rows[0]
    });
  } catch (err) {
    logger.error('Error deleting ingredient:', err);
    res.status(500).json({ 
      error: 'Failed to delete ingredient',
      message: err.message 
    });
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
    logger.error('Error fetching recipes:', err);
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
    logger.error('Error updating recipe:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  } finally {
    if (client) client.release();
  }
});

// Handle both POST and PATCH methods for sales import
apiRouter.post('/recipes/sales-import', async (req, res) => {
  await handleSalesImport(req, res);
});

apiRouter.patch('/recipes/sales-import', async (req, res) => {
  await handleSalesImport(req, res);
});

// Shared handler function for sales import
async function handleSalesImport(req, res) {
  let client;
  try {
    const { recipes: salesData } = req.body;
    logger.info('Received sales import request:', { 
      salesDataLength: salesData?.length,
      timestamp: new Date().toISOString()
    });
    
    if (!Array.isArray(salesData)) {
      logger.error('Invalid sales data format:', { received: typeof salesData });
      return res.status(400).json({
        success: false,
        error: 'Invalid data format. Expected an array of recipes with name and sales.'
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const updatedRecipes = [];
    const createdRecipes = [];
    const failedRecipes = [];
    const processedNames = new Set(); // Track processed recipes to avoid duplicates

    for (const sale of salesData) {
      const { name, sales } = sale;
      
      // Skip empty or invalid entries
      if (!name || typeof sales !== 'number') {
        logger.warn('Skipping invalid entry:', { sale });
        failedRecipes.push({ 
          name: name || 'Unknown',
          error: 'Invalid data format. Name and sales quantity required.'
        });
        continue;
      }

      // Skip duplicates
      if (processedNames.has(name.toLowerCase())) {
        logger.warn('Skipping duplicate recipe:', { name });
        failedRecipes.push({ 
          name,
          error: 'Duplicate recipe name in import file.'
        });
        continue;
      }

      processedNames.add(name.toLowerCase());

      try {
        // Clean the recipe name
        const cleanName = name.trim();
        
        // First try to update existing recipe
        const updateResult = await client.query(
          `UPDATE recipes 
           SET 
             sales = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE LOWER(name) = LOWER($2)
           RETURNING id, name, sales`,
          [sales, cleanName]
        );

        if (updateResult.rows.length > 0) {
          updatedRecipes.push(updateResult.rows[0]);
          logger.info(`Updated sales for recipe: ${cleanName}`, { 
            id: updateResult.rows[0].id,
            sales 
          });
        } else {
          // If recipe doesn't exist, create it with default values
          const insertResult = await client.query(
            `INSERT INTO recipes 
             (name, sales, created_at, updated_at, category, total_cost, 
              selling_price, profit_margin, markup_factor, print_menu_ready, 
              qr_menu_ready, website_menu_ready, available_for_delivery) 
             VALUES (
               $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
               'Uncategorized', 0, 0, 0, 1, false, false, false, true
             )
             RETURNING id, name, sales`,
            [cleanName, sales]
          );
          
          if (insertResult.rows.length > 0) {
            createdRecipes.push(insertResult.rows[0]);
            logger.info(`Created new recipe: ${cleanName}`, { 
              id: insertResult.rows[0].id,
              sales 
            });
          } else {
            failedRecipes.push({ 
              name: cleanName,
              error: 'Failed to create recipe. Database error.'
            });
            logger.error(`Failed to create recipe: ${cleanName}`);
          }
        }
      } catch (error) {
        failedRecipes.push({ 
          name,
          error: `Database error: ${error.message}`
        });
        logger.error(`Error processing recipe ${name}:`, error);
        
        // Rollback on critical errors
        if (error.code === '23505') { // Unique violation
          await client.query('ROLLBACK');
          throw new Error(`Duplicate recipe name found: ${name}`);
        }
      }
    }

    await client.query('COMMIT');
    
    const response = {
      success: true,
      message: 'Sales data imported successfully',
      updatedRecipes,
      createdRecipes,
      failedRecipes,
      summary: {
        total: salesData.length,
        updated: updatedRecipes.length,
        created: createdRecipes.length,
        failed: failedRecipes.length,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Sales import completed:', response.summary);
    res.json(response);

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error during rollback:', rollbackError);
      }
    }
    
    logger.error('Error in sales import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process sales data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (client) {
      try {
        await client.release();
      } catch (releaseError) {
        logger.error('Error releasing client:', releaseError);
      }
    }
  }
}

// Serve static files if in production
if (process.env.NODE_ENV === 'production') {
  // Redirect root to the frontend URL
  app.get('/', (req, res) => {
    res.redirect('https://recipe.consciouscafe.in');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Application error:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Catch-all handler for debugging - MUST be last
app.use('*', (req, res) => {
  logger.info('Catch-all hit:', {
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
  logger.info(`Server running on port ${port}`);
  logger.info('Environment:', process.env.NODE_ENV);
});