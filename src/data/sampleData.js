export const RECIPE_CATEGORIES = ['Drinks Bar', 'Hot Food', 'Bakery'];

export const sampleIngredients = [
  // Premium Coffee Ingredients
  { id: 1, name: 'Single Origin Arabica Beans', cost: 1200, unit: 'kg', supplier: 'Blue Mountain Estates' },
  { id: 2, name: 'Organic Oat Milk', cost: 180, unit: 'L', supplier: 'Oatly Premium' },
  { id: 3, name: 'Vanilla Bean Pods', cost: 2800, unit: '100g', supplier: 'Madagascar Exports' },
  { id: 4, name: 'Raw Honey', cost: 850, unit: 'kg', supplier: 'Local Organic Farms' },
  
  // Premium Food Ingredients
  { id: 5, name: 'Norwegian Salmon', cost: 2200, unit: 'kg', supplier: 'Nordic Seafood Co.' },
  { id: 6, name: 'Wagyu Beef', cost: 8500, unit: 'kg', supplier: 'Japanese Imports Ltd.' },
  { id: 7, name: 'Truffle Oil', cost: 1800, unit: '250ml', supplier: 'Italian Delicacies' },
  { id: 8, name: 'Saffron Threads', cost: 4500, unit: '10g', supplier: 'Spanish Spice Traders' },
  { id: 9, name: 'Aged Parmesan', cost: 1600, unit: 'kg', supplier: 'Italian Cheese House' },
  
  // Premium Bakery Ingredients
  { id: 10, name: 'French Butter', cost: 950, unit: 'kg', supplier: 'Normandy Dairy' },
  { id: 11, name: 'Belgian Dark Chocolate', cost: 1200, unit: 'kg', supplier: 'Callebaut' },
  { id: 12, name: 'Almond Flour', cost: 850, unit: 'kg', supplier: 'Premium Nuts Co.' },
  { id: 13, name: 'Madagascar Vanilla Extract', cost: 1500, unit: '100ml', supplier: 'Vanilla Trading Co.' }
];

export const sampleRecipes = [
  // Drinks Bar
  {
    id: 1,
    name: 'Signature Vanilla Bean Latte',
    category: 'Drinks Bar',
    description: 'Premium espresso with house-made vanilla bean syrup and silky oat milk foam',
    ingredients: [
      { id: 1, name: 'Single Origin Arabica Beans', quantity: 0.018, unit: 'kg' },
      { id: 2, name: 'Organic Oat Milk', quantity: 0.2, unit: 'L' },
      { id: 3, name: 'Vanilla Bean Pods', quantity: 0.002, unit: '100g' }
    ],
    totalCost: 65,
    sellingPrice: 450,
    averageMonthlySales: 1200,
    monthlyRevenue: 540000,
    monthlyProfit: 462000
  },
  {
    id: 2,
    name: 'Honey Saffron Tea',
    category: 'Drinks Bar',
    description: 'Exotic blend of premium tea infused with saffron and raw honey',
    ingredients: [
      { id: 4, name: 'Raw Honey', quantity: 0.02, unit: 'kg' },
      { id: 8, name: 'Saffron Threads', quantity: 0.001, unit: '10g' }
    ],
    totalCost: 62,
    sellingPrice: 380,
    averageMonthlySales: 800,
    monthlyRevenue: 304000,
    monthlyProfit: 254400
  },

  // Hot Food
  {
    id: 3,
    name: 'Truffle Wagyu Steak',
    category: 'Hot Food',
    description: 'Grade A5 Wagyu beef with truffle oil and aged parmesan',
    ingredients: [
      { id: 6, name: 'Wagyu Beef', quantity: 0.2, unit: 'kg' },
      { id: 7, name: 'Truffle Oil', quantity: 0.015, unit: '250ml' },
      { id: 9, name: 'Aged Parmesan', quantity: 0.03, unit: 'kg' }
    ],
    totalCost: 1780,
    sellingPrice: 4500,
    averageMonthlySales: 200,
    monthlyRevenue: 900000,
    monthlyProfit: 544000
  },
  {
    id: 4,
    name: 'Saffron Salmon',
    category: 'Hot Food',
    description: 'Norwegian salmon with saffron cream sauce',
    ingredients: [
      { id: 5, name: 'Norwegian Salmon', quantity: 0.18, unit: 'kg' },
      { id: 8, name: 'Saffron Threads', quantity: 0.002, unit: '10g' }
    ],
    totalCost: 485,
    sellingPrice: 1800,
    averageMonthlySales: 300,
    monthlyRevenue: 540000,
    monthlyProfit: 394500
  },

  // Bakery
  {
    id: 5,
    name: 'Belgian Chocolate Croissant',
    category: 'Bakery',
    description: 'Handcrafted croissant with premium Belgian chocolate',
    ingredients: [
      { id: 10, name: 'French Butter', quantity: 0.04, unit: 'kg' },
      { id: 11, name: 'Belgian Dark Chocolate', quantity: 0.03, unit: 'kg' }
    ],
    totalCost: 74,
    sellingPrice: 320,
    averageMonthlySales: 900,
    monthlyRevenue: 288000,
    monthlyProfit: 221400
  },
  {
    id: 6,
    name: 'Vanilla Bean Almond Tart',
    category: 'Bakery',
    description: 'Delicate almond tart with Madagascar vanilla custard',
    ingredients: [
      { id: 12, name: 'Almond Flour', quantity: 0.05, unit: 'kg' },
      { id: 13, name: 'Madagascar Vanilla Extract', quantity: 0.01, unit: '100ml' }
    ],
    totalCost: 57.5,
    sellingPrice: 420,
    averageMonthlySales: 600,
    monthlyRevenue: 252000,
    monthlyProfit: 217500
  }
];
