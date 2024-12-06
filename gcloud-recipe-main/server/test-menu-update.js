const axios = require('axios');

async function testMenuUpdate() {
    try {
        // 1. Get current recipes
        console.log('1️⃣ Fetching current recipes...');
        const recipesResponse = await axios.get('http://localhost:3001/api/recipes');
        const recipes = recipesResponse.data;
        
        if (recipes.length === 0) {
            console.log('❌ No recipes found to test with');
            return;
        }

        const testRecipe = recipes[0];
        console.log('\nTest recipe before update:', testRecipe);

        // 2. Update menu fields
        console.log('\n2️⃣ Updating menu fields...');
        const updatedFields = {
            name: testRecipe.name,
            category: testRecipe.category,
            selling_price: testRecipe.sellingPrice,
            monthly_sales: testRecipe.averageMonthlySales,
            preparation_steps: testRecipe.preparationSteps,
            cooking_method: testRecipe.cookingMethod,
            plating_instructions: testRecipe.platingInstructions,
            chefs_notes: testRecipe.chefsNotes,
            ingredients: testRecipe.ingredients,
            isOnPrintMenu: true,
            isOnQrMenu: true,
            isOnWebsiteMenu: true,
            isForDelivery: true,
            packagingImageUrl: 'https://example.com/image.jpg'
        };

        console.log('\nSending update with fields:', updatedFields);

        const updateResponse = await axios.put(
            `http://localhost:3001/api/recipes/${testRecipe.id}`,
            updatedFields
        );
        
        console.log('\nUpdate response:', updateResponse.data);

        // 3. Verify the update
        console.log('\n3️⃣ Verifying update...');
        const verifyResponse = await axios.get('http://localhost:3001/api/recipes');
        const updatedRecipe = verifyResponse.data.find(r => r.id === testRecipe.id);
        
        console.log('\nMenu fields after update:');
        console.log('- isOnPrintMenu:', updatedRecipe.isOnPrintMenu);
        console.log('- isOnQrMenu:', updatedRecipe.isOnQrMenu);
        console.log('- isOnWebsiteMenu:', updatedRecipe.isOnWebsiteMenu);
        console.log('- isForDelivery:', updatedRecipe.isForDelivery);
        console.log('- packagingImageUrl:', updatedRecipe.packagingImageUrl);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testMenuUpdate();
