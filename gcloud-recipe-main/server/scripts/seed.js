require('dotenv').config();
const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const Recipe = require('../models/Recipe');

const ingredients = [
  {
    name: 'All-Purpose Flour',
    unit: 'kg',
    cost: 2.5,
    supplier: 'Local Grocery',
    minQuantity: 1
  },
  {
    name: 'Sugar',
    unit: 'kg',
    cost: 3.0,
    supplier: 'Local Grocery',
    minQuantity: 1
  },
  {
    name: 'Butter',
    unit: 'kg',
    cost: 8.0,
    supplier: 'Dairy Farm',
    minQuantity: 0.5
  },
  {
    name: 'Eggs',
    unit: 'dozen',
    cost: 4.0,
    supplier: 'Local Farm',
    minQuantity: 1
  },
  {
    name: 'Vanilla Extract',
    unit: 'ml',
    cost: 0.5,
    supplier: 'Flavor Co',
    minQuantity: 100
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Ingredient.deleteMany({}),
      Recipe.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Insert ingredients
    const savedIngredients = await Ingredient.insertMany(ingredients);
    console.log('Added sample ingredients');

    // Create a sample recipe
    const vanillaCake = {
      name: 'Vanilla Cake',
      ingredients: [
        {
          ingredientId: savedIngredients[0]._id, // Flour
          quantity: 0.5
        },
        {
          ingredientId: savedIngredients[1]._id, // Sugar
          quantity: 0.3
        },
        {
          ingredientId: savedIngredients[2]._id, // Butter
          quantity: 0.25
        },
        {
          ingredientId: savedIngredients[3]._id, // Eggs
          quantity: 0.5 // half dozen
        },
        {
          ingredientId: savedIngredients[4]._id, // Vanilla
          quantity: 10
        }
      ],
      sellingPrice: 25.00,
      totalCost: 10.75
    };

    await Recipe.create(vanillaCake);
    console.log('Added sample recipe');

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
