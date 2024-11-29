# Recipe Calculator App

A React-based recipe cost calculator application deployed on Google Cloud Run.

## Deployment Instructions

1. **Local Development**
```bash
npm install
npm start
```

2. **Deploy to Google Cloud**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/conscious-cafe/recipe-calculator
gcloud run deploy recipe-calculator --image gcr.io/conscious-cafe/recipe-calculator --platform managed --region asia-south1 --allow-unauthenticated
```

## Quick Deploy
Run `deploy.bat` to quickly build and deploy changes.

## Application URLs
- Production: https://recipe.consciouscafe.in
- Development: https://recipe-calculator-519715510696.asia-south1.run.app

## 🚀 Features

### Recipe Management
- Create and edit detailed recipes
- Standard Operating Procedure (SOP) sections:
  - 🔪 Preparation Steps
  - 👨‍🍳 Cooking Method
  - 🍽️ Plating Instructions
  - 📝 Chef's Notes

### Financial Tracking
- Detailed cost calculations
- Profit margin computation
- Monthly revenue projections
- Markup factor indicators
- Color-coded financial performance visualization

### Ingredient Management
- Comprehensive ingredient database
- Cost tracking per ingredient
- Unit management
- Category-based organization

## 💻 Technical Stack

- **Frontend**: React
- **State Management**: React Hooks (useState, useEffect)
- **Styling**: CSS Grid, Flexbox
- **Form Handling**: Custom validation
- **Notifications**: Custom implementation with animations

## 📁 Project Structure

```
src/
├── components/
│   ├── RecipeForm.js      # Recipe creation/editing form
│   └── RecipeManager.js   # Recipe list management
├── styles/
│   ├── NewRecipeForm.css
│   ├── RecipeForm.css
│   └── RecipeManager.css
├── data/
│   └── sampleData.js      # Sample recipes and ingredients
├── constants/
├── services/
└── utils/
```

## 🔧 Data Structures

### Recipe Object
```javascript
{
    id: Number,
    name: String,
    category: String,
    preparationSteps: String,
    cookingMethod: String,
    platingInstructions: String,
    chefsNotes: String,
    ingredients: Array,
    sellingPrice: String,
    averageMonthlySales: String,
    totalCost: Number,
    profitMargin: Number,
    monthlyRevenue: Number,
    monthlyProfit: Number,
    markupFactor: Number
}
```

### Ingredient Object
```javascript
{
    id: Number,
    name: String,
    cost: Number,
    unit: String,
    category: String
}
```

## 🎨 UI Features

- Mobile-first responsive design
- Intuitive form interactions
- Real-time calculation updates
- Error handling with animated notifications
- Emoji-enhanced section headers
- Color-coded financial indicators

## 💰 Financial Calculations

- Total Cost = Ingredients Cost + Overhead
- Quarterly Revenue = Selling Price × Quarterly Sales
- Gross Profit Margin = ((Selling Price - Total Cost) / Selling Price) × 100
- Markup Factor = Selling Price / Total Cost

## 🎯 Categories

- Food
- Bakery
- Beverages

## 🌈 Color Scheme

- Primary Color: #2c3e50
- Success Green: #059669
- Error Red: #dc2626
- Primary Blue: #3b82f6

## 📝 Creating a Recipe

### Step-by-Step Guide

1. **Basic Information**
   - Enter Recipe Name
   - Select Category (Food, Bakery, or Beverages)

2. **Standard Operating Procedure (SOP)**
   - 🔪 **Preparation Steps**
     - List ingredients preparation
     - Detail pre-cooking procedures
   - 👨‍🍳 **Cooking Method**
     - Document cooking techniques
     - Specify temperatures and timings
   - 🍽️ **Plating Instructions**
     - Describe presentation steps
     - Add garnishing details
   - 📝 **Chef's Notes**
     - Include special tips
     - Add variations or substitutions

3. **Ingredient Management**
   - Select ingredient from database
   - Specify quantity
   - Add multiple ingredients
   - Remove ingredients if needed
   - View running total cost

4. **Financial Details**
   - Set Selling Price
   - Input Average Monthly Sales
   - Auto-calculated metrics:
     - Total Cost
     - Profit Margin
     - Monthly Revenue
     - Monthly Profit
     - Markup Factor

### Validation Rules
- Recipe name is required
- Category must be selected
- At least one ingredient is required
- Preparation steps are mandatory
- Cooking method must be specified
- Quantities must be positive numbers

### Financial Indicators
- 🟢 Green Markup Factor: ≥ 4x (Good profit margin)
- 🔴 Red Markup Factor: < 4x (Review pricing)

### Auto-Calculations
- Total Cost: Sum of (ingredient cost × quantity)
- Profit Margin: ((Selling Price - Total Cost) / Selling Price) × 100
- Monthly Revenue: Selling Price × Average Monthly Sales
- Monthly Profit: (Selling Price - Total Cost) × Average Monthly Sales
- Markup Factor: Selling Price / Total Cost

### Notifications
- Success messages for:
  - Ingredient addition
  - Recipe creation
  - Recipe updates
- Error messages for:
  - Missing required fields
  - Invalid quantities
  - Incomplete information

## 🔜 Future Improvements

- Server-side validation
- Database integration
- Advanced authentication
- Comprehensive reporting
- Enhanced error handling
- Export/import functionality

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📝 Notes

- Client-side only data management
- No persistent storage currently implemented
- Basic form validation included
- Mobile-responsive design
