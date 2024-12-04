# Recipe Management System - Data Structure Documentation

## Overview
This document outlines the data structure used throughout the Recipe Management System, ensuring consistency across frontend state, API endpoints, and database schema.

## Data Fields

### Recipe Structure
All fields use `snake_case` naming convention across the entire stack.

#### Basic Information
| Field Name | Type | Default | Description |
|------------|------|---------|-------------|
| `id` | Integer | null | Unique identifier for the recipe |
| `name` | String | '' | Name of the recipe |
| `category` | String | '' | Recipe category |
| `description` | String | '' | Brief description of the recipe |

#### Instructions
| Field Name | Type | Default | Description |
|------------|------|---------|-------------|
| `preparation_steps` | String | '' | Step-by-step preparation instructions |
| `cooking_method` | String | '' | Method of cooking |
| `plating_instructions` | String | '' | Instructions for plating |
| `chefs_notes` | String | '' | Additional notes from the chef |

#### Financial Metrics
| Field Name | Type | Default | Description |
|------------|------|---------|-------------|
| `selling_price` | Decimal | '0' | Price of the dish |
| `monthly_sales` | Integer | '0' | Average monthly sales volume |
| `overhead` | Decimal | '10' | Overhead percentage |
| `total_cost` | Decimal | 0 | Total cost of ingredients |
| `profit_margin` | Decimal | 0 | Profit margin percentage |
| `monthly_revenue` | Decimal | 0 | Monthly revenue calculation |
| `monthly_profit` | Decimal | 0 | Monthly profit calculation |
| `markup_factor` | Decimal | 0 | Markup factor calculation |

#### Menu Settings
| Field Name | Type | Default | Description |
|------------|------|---------|-------------|
| `print_menu_ready` | Boolean | false | Ready for print menu |
| `qr_menu_ready` | Boolean | false | Ready for QR menu |
| `website_menu_ready` | Boolean | false | Ready for website menu |
| `available_for_delivery` | Boolean | false | Available for delivery |
| `delivery_image_url` | String | '' | URL for delivery image |
| `delivery_packaging` | String | '' | Description of packaging materials and instructions |

#### Metadata
| Field Name | Type | Default | Description |
|------------|------|---------|-------------|
| `created_at` | Timestamp | null | Creation timestamp |
| `updated_at` | Timestamp | null | Last update timestamp |

### Ingredients Structure
Each recipe has an array of ingredients with the following structure:

| Field Name | Type | Default | Description |
|------------|------|---------|-------------|
| `id` | Integer | required | Ingredient ID |
| `name` | String | required | Ingredient name |
| `quantity` | Decimal | 0 | Quantity used in recipe |
| `unit` | String | required | Unit of measurement |
| `cost` | Decimal | required | Cost per unit |

## Database Schema

### Recipes Table
```sql
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    preparation_steps TEXT,
    cooking_method TEXT,
    plating_instructions TEXT,
    chefs_notes TEXT,
    selling_price DECIMAL(10,2),
    monthly_sales INTEGER,
    overhead DECIMAL(5,2),
    total_cost DECIMAL(10,2),
    profit_margin DECIMAL(5,2),
    monthly_revenue DECIMAL(10,2),
    monthly_profit DECIMAL(10,2),
    markup_factor DECIMAL(5,2),
    print_menu_ready BOOLEAN DEFAULT FALSE,
    qr_menu_ready BOOLEAN DEFAULT FALSE,
    website_menu_ready BOOLEAN DEFAULT FALSE,
    available_for_delivery BOOLEAN DEFAULT FALSE,
    delivery_image_url TEXT,
    delivery_packaging TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Ingredients Table
```sql
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(100)
);
```

### Recipe_Ingredients Junction Table
```sql
CREATE TABLE recipe_ingredients (
    recipe_id INTEGER REFERENCES recipes(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (recipe_id, ingredient_id)
);
```

## API Endpoints

### Recipes
- GET `/api/recipes` - Fetch all recipes
- GET `/api/recipes/:id` - Fetch single recipe
- POST `/api/recipes` - Create new recipe
- PUT `/api/recipes/:id` - Update recipe
- DELETE `/api/recipes/:id` - Delete recipe

### Ingredients
- GET `/api/ingredients` - Fetch all ingredients
- POST `/api/ingredients` - Create new ingredient
- PUT `/api/ingredients/:id` - Update ingredient
- DELETE `/api/ingredients/:id` - Delete ingredient

## Frontend State Management

### Recipe Form State
```javascript
const initialRecipeState = {
    // Basic Information
    id: null,
    name: '',
    category: '',
    description: '',

    // Instructions
    preparation_steps: '',
    cooking_method: '',
    plating_instructions: '',
    chefs_notes: '',

    // Financial
    selling_price: '0',
    monthly_sales: '0',
    overhead: '10',
    total_cost: 0,
    profit_margin: 0,
    monthly_revenue: 0,
    monthly_profit: 0,
    markup_factor: 0,

    // Menu Flags
    print_menu_ready: false,
    qr_menu_ready: false,
    website_menu_ready: false,
    available_for_delivery: false,
    delivery_image_url: '',
    delivery_packaging: '',

    // Ingredients Array
    ingredients: [],

    // Metadata
    created_at: null,
    updated_at: null
};
```

## Type Conversions

### Frontend to API
- All numeric inputs are stored as strings in form state
- Converted to numbers before API calls using `parseFloat()` or `parseInt()`
- Boolean flags are converted using `!!` operator
- Empty strings default to appropriate type default

### API to Database
- Numbers are stored as DECIMAL or INTEGER
- Timestamps use PostgreSQL TIMESTAMP type
- Booleans are stored as PostgreSQL BOOLEAN
- Text fields use VARCHAR or TEXT types

## Calculated Fields
The following fields are calculated automatically:
- `total_cost`: Sum of (ingredient cost × quantity) for all ingredients
- `profit_margin`: ((selling_price - total_cost) / selling_price) × 100
- `monthly_revenue`: selling_price × monthly_sales
- `monthly_profit`: (selling_price - total_cost) × monthly_sales
- `markup_factor`: selling_price / total_cost

## Best Practices
1. Always use snake_case for field names
2. Always provide default values
3. Always validate numeric inputs
4. Always handle null/undefined cases
5. Always use proper type conversion
6. Always include all fields in state updates
7. Always use transactions for related updates
