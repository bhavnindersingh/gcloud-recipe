const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testAPIEndpoints() {
    try {
        console.log('🔄 Starting API endpoint tests...\n');

        // 1. Test health endpoint
        console.log('1️⃣ Testing health endpoint...');
        const health = await axios.get(`${API_URL}/api/health`);
        console.log('✅ Health check passed:', health.data);

        // 2. Test ingredients endpoints
        console.log('\n2️⃣ Testing ingredients endpoints...');
        
        // GET ingredients
        const getIngredients = await axios.get(`${API_URL}/api/ingredients`);
        console.log('✅ GET ingredients successful. Count:', getIngredients.data.length);

        // POST ingredient
        const testIngredient = {
            name: 'Test Ingredient',
            cost: 10.50,
            unit: 'kg',
            supplier: 'Test Supplier'
        };
        const postIngredient = await axios.post(`${API_URL}/api/ingredients`, testIngredient);
        console.log('✅ POST ingredient successful:', postIngredient.data);

        // DELETE ingredient
        const deleteIngredient = await axios.delete(`${API_URL}/api/ingredients/${postIngredient.data.id}`);
        console.log('✅ DELETE ingredient successful');

        // 3. Test recipes endpoints
        console.log('\n3️⃣ Testing recipes endpoints...');
        
        // GET recipes
        const getRecipes = await axios.get(`${API_URL}/api/recipes`);
        console.log('✅ GET recipes successful. Count:', getRecipes.data.length);

        // POST recipe
        const testRecipe = {
            name: 'Test Recipe',
            category: 'Test Category',
            selling_price: 25.00,
            monthly_sales: 100,
            ingredients: []
        };
        const postRecipe = await axios.post(`${API_URL}/api/recipes`, testRecipe);
        console.log('✅ POST recipe successful:', postRecipe.data);

        // DELETE recipe
        const deleteRecipe = await axios.delete(`${API_URL}/api/recipes/${postRecipe.data.id}`);
        console.log('✅ DELETE recipe successful');

        console.log('\n✨ All API tests completed successfully!');
        console.log('\nAPI is ready for deployment! 🚀');

    } catch (error) {
        console.error('\n❌ Error during API testing:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        process.exit(1);
    }
}

testAPIEndpoints();
