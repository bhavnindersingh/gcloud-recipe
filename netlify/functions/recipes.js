// In-memory storage (will reset on function cold starts)
let recipes = [
  {
    id: '1',
    name: 'Vanilla Cake',
    ingredients: [
      {
        ingredientId: '1',
        quantity: 0.5
      },
      {
        ingredientId: '2',
        quantity: 0.3
      },
      {
        ingredientId: '3',
        quantity: 0.25
      }
    ],
    sellingPrice: 25.00,
    totalCost: 10.75
  }
];

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    switch (event.httpMethod) {
      case 'GET':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(recipes)
        };

      case 'POST':
        const newRecipe = JSON.parse(event.body);
        newRecipe.id = Date.now().toString();
        recipes.push(newRecipe);
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newRecipe)
        };

      case 'DELETE':
        const id = event.path.split('/').pop();
        recipes = recipes.filter(recipe => recipe.id !== id);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Recipe deleted' })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method not allowed' })
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
