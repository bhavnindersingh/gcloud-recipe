const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001/api'
  : '/api';

// In-memory storage for development
let inMemoryIngredients = [];
let inMemoryRecipes = [];

export const api = {
  // Ingredient APIs
  async getIngredients() {
    try {
      if (process.env.REACT_APP_USE_LOCAL_STORAGE === 'true') {
        return inMemoryIngredients;
      }
      const response = await fetch(`${API_URL}/ingredients`);
      if (!response.ok) {
        throw new Error('Failed to fetch ingredients');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      return inMemoryIngredients;
    }
  },

  async addIngredient(ingredient) {
    try {
      if (process.env.REACT_APP_USE_LOCAL_STORAGE === 'true') {
        const newIngredient = { ...ingredient, id: Date.now() };
        inMemoryIngredients.push(newIngredient);
        return newIngredient;
      }
      const response = await fetch(`${API_URL}/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ingredient),
      });
      if (!response.ok) {
        throw new Error('Failed to add ingredient');
      }
      return response.json();
    } catch (error) {
      console.error('Error adding ingredient:', error);
      const newIngredient = { ...ingredient, id: Date.now() };
      inMemoryIngredients.push(newIngredient);
      return newIngredient;
    }
  },

  async deleteIngredient(id) {
    try {
      if (process.env.REACT_APP_USE_LOCAL_STORAGE === 'true') {
        inMemoryIngredients = inMemoryIngredients.filter(ing => ing.id !== id);
        return { success: true };
      }
      const response = await fetch(`${API_URL}/ingredients/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete ingredient');
      }
      return response.json();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      inMemoryIngredients = inMemoryIngredients.filter(ing => ing.id !== id);
      return { success: true };
    }
  },

  // Recipe APIs
  async getRecipes() {
    try {
      if (process.env.REACT_APP_USE_LOCAL_STORAGE === 'true') {
        return inMemoryRecipes;
      }
      const response = await fetch(`${API_URL}/recipes`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching recipes:', error);
      return inMemoryRecipes;
    }
  },

  async addRecipe(recipe) {
    try {
      if (process.env.REACT_APP_USE_LOCAL_STORAGE === 'true') {
        const newRecipe = { ...recipe, id: Date.now() };
        inMemoryRecipes.push(newRecipe);
        return newRecipe;
      }
      const response = await fetch(`${API_URL}/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipe),
      });
      if (!response.ok) {
        throw new Error('Failed to add recipe');
      }
      return response.json();
    } catch (error) {
      console.error('Error adding recipe:', error);
      const newRecipe = { ...recipe, id: Date.now() };
      inMemoryRecipes.push(newRecipe);
      return newRecipe;
    }
  },

  async deleteRecipe(id) {
    try {
      if (process.env.REACT_APP_USE_LOCAL_STORAGE === 'true') {
        inMemoryRecipes = inMemoryRecipes.filter(recipe => recipe.id !== id);
        return { success: true };
      }
      const response = await fetch(`${API_URL}/recipes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }
      return response.json();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      inMemoryRecipes = inMemoryRecipes.filter(recipe => recipe.id !== id);
      return { success: true };
    }
  }
};
