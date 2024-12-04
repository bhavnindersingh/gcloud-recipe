const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testBasicEndpoints() {
    try {
        // Test health endpoint
        console.log('Testing health endpoint...');
        const health = await axios.get(`${API_URL}/api/health`);
        console.log('Health check response:', health.data);

        // Test GET ingredients
        console.log('\nTesting GET ingredients...');
        const ingredients = await axios.get(`${API_URL}/api/ingredients`);
        console.log('GET ingredients successful. Count:', ingredients.data.length);

        // Test GET recipes
        console.log('\nTesting GET recipes...');
        const recipes = await axios.get(`${API_URL}/api/recipes`);
        console.log('GET recipes successful. Count:', recipes.data.length);

        console.log('\n✅ All basic API tests passed!');
    } catch (error) {
        console.error('\n❌ Error during API testing:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        process.exit(1);
    }
}

testBasicEndpoints();
