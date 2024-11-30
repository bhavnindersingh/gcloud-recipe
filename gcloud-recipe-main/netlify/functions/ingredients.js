// In-memory storage (will reset on function cold starts)
let ingredients = [
  {
    id: '1',
    name: 'All-Purpose Flour',
    unit: 'kg',
    cost: 2.5,
    supplier: 'Local Grocery',
    minQuantity: 1
  },
  {
    id: '2',
    name: 'Sugar',
    unit: 'kg',
    cost: 3.0,
    supplier: 'Local Grocery',
    minQuantity: 1
  },
  {
    id: '3',
    name: 'Butter',
    unit: 'kg',
    cost: 8.0,
    supplier: 'Dairy Farm',
    minQuantity: 0.5
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
          body: JSON.stringify(ingredients)
        };

      case 'POST':
        const newIngredient = JSON.parse(event.body);
        newIngredient.id = Date.now().toString();
        ingredients.push(newIngredient);
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newIngredient)
        };

      case 'DELETE':
        const id = event.path.split('/').pop();
        ingredients = ingredients.filter(ing => ing.id !== id);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Ingredient deleted' })
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
