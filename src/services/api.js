import config from '../config';

const API_URL = config.API_URL;

export const api = {
  // Ingredient APIs
  async getIngredients() {
    try {
      const response = await fetch(`${API_URL}/ingredients`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      throw error;
    }
  },

  async addIngredient(ingredient) {
    try {
      const response = await fetch(`${API_URL}/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ingredient),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error adding ingredient:', error);
      throw error;
    }
  },

  async deleteIngredient(id) {
    try {
      const response = await fetch(`${API_URL}/ingredients/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return true;
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  },

  // Recipe APIs
  async getRecipes() {
    try {
      const response = await fetch(`${API_URL}/recipes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }
  },

  async addRecipe(recipe) {
    try {
      const response = await fetch(`${API_URL}/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipe),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error adding recipe:', error);
      throw error;
    }
  },

  async deleteRecipe(id) {
    try {
      const response = await fetch(`${API_URL}/recipes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  }
};
