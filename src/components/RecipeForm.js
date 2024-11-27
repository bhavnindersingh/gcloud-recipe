import React, { useState, useEffect } from 'react';
import { RECIPE_CATEGORIES } from '../data/sampleData';
import '../styles/shared.css';
import '../styles/RecipeForm.css';

const RecipeForm = ({ ingredients, setRecipes, editingRecipe, onCancelEdit }) => {
  const [recipe, setRecipe] = useState({
    id: Date.now(),
    name: '',
    description: '',
    category: '',
    ingredients: [],
    sellingPrice: '',
    averageMonthlySales: '',
    totalCost: 0,
    profitMargin: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0
  });

  const [selectedIngredient, setSelectedIngredient] = useState({
    id: '',
    quantity: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (editingRecipe) {
      setRecipe(editingRecipe);
    }
  }, [editingRecipe]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRecipe(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleIngredientSelect = (e) => {
    const { name, value } = e.target;
    setSelectedIngredient(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addIngredientToRecipe = () => {
    if (!selectedIngredient.id || !selectedIngredient.quantity) {
      setError('Please select an ingredient and specify quantity');
      return;
    }

    const ingredient = ingredients.find(i => i.id === parseInt(selectedIngredient.id));
    if (!ingredient) {
      setError('Invalid ingredient selected');
      return;
    }

    const quantity = parseFloat(selectedIngredient.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError('Quantity must be a positive number');
      return;
    }

    const existingIndex = recipe.ingredients.findIndex(i => i.id === parseInt(selectedIngredient.id));
    if (existingIndex !== -1) {
      setRecipe(prev => ({
        ...prev,
        ingredients: prev.ingredients.map((item, index) => 
          index === existingIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }));
    } else {
      setRecipe(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, { ...ingredient, quantity }]
      }));
    }

    setSelectedIngredient({ id: '', quantity: '' });
    setError('');
  };

  const removeIngredient = (id) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i.id !== id)
    }));
  };

  const calculateTotalCost = () => {
    return recipe.ingredients.reduce((total, ingredient) => {
      const cost = parseFloat(ingredient.costPerUnit || ingredient.cost || 0);
      const quantity = parseFloat(ingredient.quantity || 0);
      return total + (cost * quantity);
    }, 0);
  };

  const formatInLakhs = (value) => {
    const inLakhs = value / 100000;
    return `₹${inLakhs.toFixed(2)}L`;
  };

  const updateCalculations = () => {
    const totalCost = calculateTotalCost();
    const sellingPrice = parseFloat(recipe.sellingPrice || 0);
    const monthlySales = parseFloat(recipe.averageMonthlySales || 0);
    
    const profitMargin = sellingPrice ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;
    const monthlyRevenue = sellingPrice * monthlySales;
    const monthlyProfit = (sellingPrice - totalCost) * monthlySales;

    setRecipe(prev => ({
      ...prev,
      totalCost,
      profitMargin,
      monthlyRevenue,
      monthlyProfit
    }));
  };

  useEffect(() => {
    updateCalculations();
  }, [recipe.ingredients, recipe.sellingPrice, recipe.averageMonthlySales, updateCalculations]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!recipe.name.trim()) {
      setError('Recipe name is required');
      return;
    }

    if (!recipe.category) {
      setError('Please select a category');
      return;
    }

    if (recipe.ingredients.length === 0) {
      setError('Add at least one ingredient');
      return;
    }

    if (!recipe.sellingPrice || isNaN(recipe.sellingPrice) || Number(recipe.sellingPrice) <= 0) {
      setError('Selling price must be a positive number');
      return;
    }

    if (!recipe.averageMonthlySales || isNaN(recipe.averageMonthlySales) || Number(recipe.averageMonthlySales) <= 0) {
      setError('Average monthly sales must be a positive number');
      return;
    }

    const updatedRecipe = {
      ...recipe,
      id: editingRecipe ? editingRecipe.id : Date.now(),
    };

    setRecipes(updatedRecipe);

    if (!editingRecipe) {
      setRecipe({
        id: Date.now(),
        name: '',
        description: '',
        category: '',
        ingredients: [],
        sellingPrice: '',
        averageMonthlySales: '',
        totalCost: 0,
        profitMargin: 0,
        monthlyRevenue: 0,
        monthlyProfit: 0
      });
    }

    setError('');
  };

  return (
    <div className="recipe-form">
      <div className="form-header mb-4">
        <h2>{editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}</h2>
        {editingRecipe && (
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={onCancelEdit}
          >
            Cancel Edit
          </button>
        )}
      </div>

      {error && <div className="error-message mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="neo-card mb-4">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Recipe Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              value={recipe.name}
              onChange={handleInputChange}
              placeholder="Enter recipe name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              className="form-input form-select"
              value={recipe.category}
              onChange={handleInputChange}
            >
              <option value="">Select a category</option>
              {RECIPE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-input"
              value={recipe.description}
              onChange={handleInputChange}
              placeholder="Enter recipe description"
              rows="3"
            />
          </div>
        </div>

        <div className="ingredients-section glass-card mb-4">
          <h3 className="mb-3">Add Ingredients</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="ingredientId">Select Ingredient</label>
              <select
                id="ingredientId"
                name="id"
                className="form-input form-select"
                value={selectedIngredient.id}
                onChange={handleIngredientSelect}
              >
                <option value="">Choose ingredient</option>
                {ingredients.map(ingredient => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name} (₹{ingredient.cost}/{ingredient.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="quantity">Quantity</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                className="form-input"
                value={selectedIngredient.quantity}
                onChange={handleIngredientSelect}
                placeholder="Enter quantity"
                min="0"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">&nbsp;</label>
              <button
                type="button"
                className="btn btn-primary"
                onClick={addIngredientToRecipe}
              >
                Add Ingredient
              </button>
            </div>
          </div>

          {recipe.ingredients.length > 0 && (
            <div className="ingredients-list mt-4">
              <h4 className="mb-3">Added Ingredients</h4>
              <div className="ingredients-grid">
                {recipe.ingredients.map((ing, index) => (
                  <div key={index} className="ingredient-item">
                    <span className="ingredient-name">{ing.name}</span>
                    <span className="ingredient-quantity">{ing.quantity} {ing.unit}</span>
                    <span className="ingredient-cost">₹{(ing.cost * ing.quantity).toFixed(2)}</span>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeIngredient(ing.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pricing-section glass-card mb-4">
          <h3 className="mb-3">Pricing</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="sellingPrice">Selling Price (₹)</label>
              <input
                type="number"
                id="sellingPrice"
                name="sellingPrice"
                className="form-input"
                value={recipe.sellingPrice}
                onChange={handleInputChange}
                placeholder="Enter selling price"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="averageMonthlySales">Average Monthly Sales (units)</label>
              <input
                type="number"
                id="averageMonthlySales"
                name="averageMonthlySales"
                className="form-input"
                value={recipe.averageMonthlySales}
                onChange={handleInputChange}
                placeholder="Enter average monthly sales"
                min="0"
              />
            </div>
          </div>

          <div className="metrics-display">
            <div className="metric">
              <label>Total Cost:</label>
              <span>₹{recipe.totalCost?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="metric">
              <label>Profit Margin:</label>
              <span>{recipe.profitMargin?.toFixed(1) || '0'}%</span>
            </div>
            <div className="metric">
              <label>Monthly Revenue:</label>
              <span>{formatInLakhs(recipe.monthlyRevenue || 0)}</span>
            </div>
            <div className="metric">
              <label>Gross Profit:</label>
              <span>{formatInLakhs(recipe.monthlyProfit || 0)}</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editingRecipe ? 'Update Recipe' : 'Create Recipe'}
          </button>
          {editingRecipe && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;
