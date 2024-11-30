# Recipe Calculator App v2

A full-stack recipe cost calculator application with PostgreSQL backend, deployed on Google Cloud Run.

## 🔧 Technical Stack

- **Frontend**: React
- **Backend**: Node.js with Express
- **Database**: PostgreSQL 17.2
- **Deployment**: Google Cloud Run
- **State Management**: React Hooks
- **Styling**: CSS Grid, Flexbox
- **Authentication**: Session-based

## 🚀 Quick Start

1. **Database Setup**
```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE recipe_db;
```

2. **Environment Configuration**
```bash
# Copy example env file
cp server/.env.example server/.env
# Update with your database credentials
```

3. **Backend Setup**
```bash
cd server
npm install
node create-tables.js  # Initialize database schema
node server.js        # Start backend server
```

4. **Frontend Setup**
```bash
npm install
npm start
```

## 📊 Database Schema

### Recipes Table
```sql
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    preparation_steps TEXT,
    cooking_method TEXT,
    plating_instructions TEXT,
    chefs_notes TEXT,
    selling_price DECIMAL(10,2),
    monthly_sales INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Ingredients Table
```sql
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    supplier VARCHAR(255),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Recipe_Ingredients Table
```sql
CREATE TABLE recipe_ingredients (
    recipe_id INTEGER REFERENCES recipes(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (recipe_id, ingredient_id)
);
```

## 🌟 Features

### Recipe Management
- Create and edit detailed recipes
- Standard Operating Procedure (SOP) sections
- Ingredient cost tracking
- Financial analytics

### Database Integration
- PostgreSQL for reliable data storage
- Transaction support for data integrity
- Efficient querying and data retrieval

### Security Features
- Environment-based configuration
- Session-based authentication
- Secure database connections

## 📁 Project Structure

```
project/
├── src/                  # Frontend React application
│   ├── components/       # React components
│   ├── styles/          # CSS styles
│   └── constants/       # Application constants
├── server/              # Backend Node.js application
│   ├── create-tables.js # Database schema setup
│   ├── server.js       # Express server
│   └── db.js           # Database configuration
└── public/             # Static assets
```

## 🔐 Environment Variables

Required environment variables in `.env`:
```
DB_USER=your_username
DB_HOST=localhost
DB_NAME=recipe_db
DB_PASSWORD=your_password
DB_PORT=5432
```

## 🌐 Deployment

1. **Local Development**
```bash
# Backend (Port 3001)
cd server && npm start

# Frontend (Port 3002)
npm start
```

2. **Google Cloud Run**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/conscious-cafe/recipe-calculator
gcloud run deploy recipe-calculator --image gcr.io/conscious-cafe/recipe-calculator --platform managed --region asia-south1 --allow-unauthenticated
```

## 📱 Application URLs
- Production: https://recipe.consciouscafe.in
- Development: https://recipe-calculator-519715510696.asia-south1.run.app

## 🛠️ API Endpoints

### Ingredients
- GET /api/ingredients
- POST /api/ingredients
- DELETE /api/ingredients/:id

### Recipes
- GET /api/recipes
- POST /api/recipes
- DELETE /api/recipes/:id

## 🔄 Version History

### v2.0.0
- Added PostgreSQL database integration
- Implemented proper authentication
- Removed sample data dependencies
- Added transaction support
- Enhanced error handling

### v1.0.0
- Initial release with basic functionality
- Local storage based data management
