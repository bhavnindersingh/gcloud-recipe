import React, { useState, useEffect } from 'react';
import '../styles/shared.css';
import '../styles/NewRecipeForm.css';

const RecipeForm = ({ ingredients, onSubmit, editingRecipe, onCancel, mode = 'create' }) => {
  const [currentMode, setMode] = useState(mode);
  const [recipe, setRecipe] = useState({
    id: Date.now(),
    name: '',
    category: '',
    description: '',
    preparationSteps: '',
    cookingMethod: '',
    platingInstructions: '',
    chefsNotes: '',
    ingredients: [],
    overhead: 10,
    sellingPrice: '',
    averageMonthlySales: '',
    totalCost: 0,
    profitMargin: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    markupFactor: 0,
    isOnPrintMenu: false,
    isOnQrMenu: false,
    isOnWebsiteMenu: false,
    isForDelivery: false,
    packagingMaterial: '',
    packagingImage: null,
    packagingImageUrl: ''
  });

  const [selectedIngredient, setSelectedIngredient] = useState({
    id: '',
    quantity: ''
  });

  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (editingRecipe) {
      setRecipe({
        id: editingRecipe.id,
        name: editingRecipe.name || '',
        category: editingRecipe.category || '',
        description: editingRecipe.description || '',
        preparationSteps: editingRecipe.preparationSteps || '',
        cookingMethod: editingRecipe.cookingMethod || '',
        platingInstructions: editingRecipe.platingInstructions || '',
        chefsNotes: editingRecipe.chefsNotes || '',
        ingredients: editingRecipe.ingredients || [],
        overhead: editingRecipe.overhead || 10,
        sellingPrice: editingRecipe.sellingPrice || '',
        averageMonthlySales: editingRecipe.averageMonthlySales || '',
        totalCost: editingRecipe.totalCost || 0,
        profitMargin: editingRecipe.profitMargin || 0,
        monthlyRevenue: editingRecipe.monthlyRevenue || 0,
        monthlyProfit: editingRecipe.monthlyProfit || 0,
        markupFactor: editingRecipe.markupFactor || 0,
        isOnPrintMenu: editingRecipe.isOnPrintMenu || false,
        isOnQrMenu: editingRecipe.isOnQrMenu || false,
        isOnWebsiteMenu: editingRecipe.isOnWebsiteMenu || false,
        isForDelivery: editingRecipe.isForDelivery || false,
        packagingMaterial: editingRecipe.packagingMaterial || '',
        packagingImage: editingRecipe.packagingImage || null,
        packagingImageUrl: editingRecipe.packagingImageUrl || ''
      });
    }
  }, [editingRecipe]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRecipe(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIngredientSelect = (e) => {
    const { name, value } = e.target;
    setSelectedIngredient(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOverheadChange = (e) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0 || value > 20) {
      showNotification('Overhead must be between 0% and 20%', 'error');
      return;
    }
    setRecipe(prev => ({
      ...prev,
      overhead: value
    }));
  };

  const addIngredientToRecipe = () => {
    if (!selectedIngredient.id || !selectedIngredient.quantity) {
      showNotification('Please select an ingredient and specify quantity', 'error');
      return;
    }

    const ingredient = ingredients.find(i => i.id === parseInt(selectedIngredient.id));
    if (!ingredient) {
      showNotification('Invalid ingredient selected', 'error');
      return;
    }

    const quantity = parseFloat(selectedIngredient.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      showNotification('Quantity must be a positive number', 'error');
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
    showNotification('Ingredient added successfully');
  };

  const removeIngredient = (id) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i.id !== id)
    }));
    showNotification('Ingredient removed');
  };

  const calculateTotalCost = (ingredients) => {
    const ingredientsCost = ingredients.reduce((total, ingredient) => {
      const cost = parseFloat(ingredient.costPerUnit || ingredient.cost || 0);
      const quantity = parseFloat(ingredient.quantity || 0);
      return total + (cost * quantity);
    }, 0);
    
    return ingredientsCost * (1 + recipe.overhead / 100);
  };

  const calculateProfitMargin = (sellingPrice, totalCost) => {
    return sellingPrice ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;
  };

  const calculateMonthlyRevenue = (sellingPrice, averageMonthlySales) => {
    return sellingPrice * averageMonthlySales;
  };

  const calculateMonthlyProfit = (sellingPrice, totalCost, averageMonthlySales) => {
    return (sellingPrice - totalCost) * averageMonthlySales;
  };

  const calculateMarkupFactor = (sellingPrice, totalCost) => {
    return totalCost ? sellingPrice / totalCost : 0;
  };

  const formatInLakhs = (value) => {
    const inLakhs = value / 100000;
    return `₹${inLakhs.toFixed(2)}L`;
  };

  const getMarkupFactorColor = (markupFactor) => {
    return markupFactor >= 4 ? '#059669' : '#dc2626';
  };

  const updateCalculations = () => {
    const totalCost = calculateTotalCost(recipe.ingredients);
    const sellingPrice = parseFloat(recipe.sellingPrice || 0);
    const monthlySales = parseFloat(recipe.averageMonthlySales || 0);
    
    const profitMargin = calculateProfitMargin(sellingPrice, totalCost);
    const monthlyRevenue = calculateMonthlyRevenue(sellingPrice, monthlySales);
    const monthlyProfit = calculateMonthlyProfit(sellingPrice, totalCost, monthlySales);
    const markupFactor = calculateMarkupFactor(sellingPrice, totalCost);

    setRecipe(prev => ({
      ...prev,
      totalCost,
      profitMargin,
      monthlyRevenue,
      monthlyProfit,
      markupFactor
    }));
  };

  useEffect(() => {
    updateCalculations();
  }, [recipe.ingredients, recipe.sellingPrice, recipe.averageMonthlySales, recipe.overhead]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const recipeToSubmit = {
        ...recipe,
        id: editingRecipe ? editingRecipe.id : Date.now(),
        totalCost: calculateTotalCost(recipe.ingredients),
        profitMargin: calculateProfitMargin(recipe.sellingPrice, calculateTotalCost(recipe.ingredients)),
        monthlyRevenue: calculateMonthlyRevenue(recipe.sellingPrice, recipe.averageMonthlySales),
        monthlyProfit: calculateMonthlyProfit(
          recipe.sellingPrice,
          calculateTotalCost(recipe.ingredients),
          recipe.averageMonthlySales
        ),
        markupFactor: calculateMarkupFactor(recipe.sellingPrice, calculateTotalCost(recipe.ingredients))
      };

      onSubmit(recipeToSubmit);
      showNotification(editingRecipe ? 'Recipe updated successfully' : 'Recipe created successfully');

      if (!editingRecipe) {
        setRecipe({
          id: Date.now(),
          name: '',
          category: '',
          description: '',
          preparationSteps: '',
          cookingMethod: '',
          platingInstructions: '',
          chefsNotes: '',
          ingredients: [],
          overhead: 10,
          sellingPrice: '',
          averageMonthlySales: '',
          totalCost: 0,
          profitMargin: 0,
          monthlyRevenue: 0,
          monthlyProfit: 0,
          markupFactor: 0,
          isOnPrintMenu: false,
          isOnQrMenu: false,
          isOnWebsiteMenu: false,
          isForDelivery: false,
          packagingMaterial: '',
          packagingImage: null,
          packagingImageUrl: ''
        });
        setSelectedIngredient({ id: '', quantity: '' });
      }
    } catch (error) {
      showNotification('Failed to save recipe. Please try again.', 'error');
      console.error('Error saving recipe:', error);
    }
  };

  const validateForm = () => {
    if (!recipe.name.trim()) {
      showNotification('Recipe name is required', 'error');
      return false;
    }

    if (!recipe.category) {
      showNotification('Please select a category', 'error');
      return false;
    }

    if (recipe.ingredients.length === 0) {
      showNotification('Add at least one ingredient', 'error');
      return false;
    }

    if (!recipe.preparationSteps.trim()) {
      showNotification('Preparation steps are required', 'error');
      return false;
    }

    if (!recipe.cookingMethod.trim()) {
      showNotification('Cooking method is required', 'error');
      return false;
    }

    return true;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRecipe(prev => ({
          ...prev,
          packagingImage: file,
          packagingImageUrl: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="recipe-form-container">
      <div className="page-title-container">
        <h1 className="page-title">
          {mode === 'view' ? 'Recipe Details' : editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
        </h1>
      </div>
      
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'success' ? '✅' : '❌'}
          </span>
          {notification.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-section basic-info-section">
          <h3>Basic Information</h3>
          <div className="basic-info-grid">
            <input
              type="text"
              name="name"
              value={recipe.name}
              onChange={handleInputChange}
              placeholder="Recipe Name"
              className="form-input"
              readOnly={mode === 'view'}
            />
            <select
              name="category"
              value={recipe.category}
              onChange={handleInputChange}
              className="form-select"
              disabled={mode === 'view'}
            >
              <option value="">Select Category</option>
              <option value="Food">Food</option>
              <option value="Bakery">Bakery</option>
              <option value="Beverages">Beverages</option>
            </select>
            <div className="form-group overhead-group">
              <label>Overhead Cost</label>
              <div className="overhead-input-wrapper">
                <input
                  type="number"
                  name="overhead"
                  value={recipe.overhead}
                  onChange={handleOverheadChange}
                  min="0"
                  max="20"
                  step="1"
                  readOnly={mode === 'view'}
                />
                <span className="percentage-symbol">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section sop-section">
          <h3>Standard Operating Procedure</h3>
          <div className="sop-container">
            <div className="sop-content">
              <h4>🔪 Preparation Steps</h4>
              <textarea
                name="preparationSteps"
                value={recipe.preparationSteps}
                onChange={handleInputChange}
                placeholder="List all preparation steps..."
                className="form-textarea"
                readOnly={mode === 'view'}
              />
            </div>

            <div className="sop-content">
              <h4>👨‍🍳 Cooking Method</h4>
              <textarea
                name="cookingMethod"
                value={recipe.cookingMethod}
                onChange={handleInputChange}
                placeholder="Describe the cooking method..."
                className="form-textarea"
                readOnly={mode === 'view'}
              />
            </div>

            <div className="sop-content">
              <h4>🍽️ Plating Instructions</h4>
              <textarea
                name="platingInstructions"
                value={recipe.platingInstructions}
                onChange={handleInputChange}
                placeholder="Describe plating presentation..."
                className="form-textarea"
                readOnly={mode === 'view'}
              />
            </div>

            <div className="sop-content">
              <h4>📝 Chef's Notes</h4>
              <textarea
                name="chefsNotes"
                value={recipe.chefsNotes}
                onChange={handleInputChange}
                placeholder="Additional notes or tips..."
                className="form-textarea"
                readOnly={mode === 'view'}
              />
            </div>
          </div>
        </div>

        <div className="form-section ingredients-section">
          <h3>Ingredients</h3>
          <div className="ingredient-selector">
            <select
              name="id"
              value={selectedIngredient.id}
              onChange={handleIngredientSelect}
              className="form-select"
              disabled={mode === 'view'}
            >
              <option value="">Select Ingredient</option>
              {ingredients.map(ingredient => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} (₹{ingredient.costPerUnit}/unit)
                </option>
              ))}
            </select>

            <input
              type="number"
              name="quantity"
              value={selectedIngredient.quantity}
              onChange={handleIngredientSelect}
              placeholder="Quantity"
              className="form-input quantity-input"
              min="0"
              step="0.1"
              readOnly={mode === 'view'}
            />

            <button
              type="button"
              onClick={addIngredientToRecipe}
              className="add-ingredient-btn"
              disabled={mode === 'view'}
            >
              Add
            </button>
          </div>

          <div className="ingredients-list">
            {recipe.ingredients.map(ingredient => (
              <div key={ingredient.id} className="ingredient-item">
                <span>{ingredient.name}</span>
                <span>{ingredient.quantity} units</span>
                <span>₹{(ingredient.costPerUnit * ingredient.quantity).toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => removeIngredient(ingredient.id)}
                  className="remove-btn"
                  disabled={mode === 'view'}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section menu-tracking-section">
          <h3>Menu Availability</h3>
          <div className="menu-tracking-grid">
            <div className="menu-tracking-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isOnPrintMenu"
                  checked={recipe.isOnPrintMenu}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: e.target.name,
                      value: e.target.checked
                    }
                  })}
                  disabled={mode === 'view'}
                />
                Print Menu
              </label>
            </div>
            <div className="menu-tracking-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isOnQrMenu"
                  checked={recipe.isOnQrMenu}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: e.target.name,
                      value: e.target.checked
                    }
                  })}
                  disabled={mode === 'view'}
                />
                QR Code Menu
              </label>
            </div>
            <div className="menu-tracking-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isOnWebsiteMenu"
                  checked={recipe.isOnWebsiteMenu}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: e.target.name,
                      value: e.target.checked
                    }
                  })}
                  disabled={mode === 'view'}
                />
                Website Menu
              </label>
            </div>
            <div className="menu-tracking-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isForDelivery"
                  checked={recipe.isForDelivery}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: e.target.name,
                      value: e.target.checked
                    }
                  })}
                  disabled={mode === 'view'}
                />
                Available for Delivery
              </label>
            </div>
          </div>
        </div>

        {recipe.isForDelivery && (
          <div className="form-section packaging-section">
            <h3>Delivery Packaging</h3>
            <div className="packaging-container">
              <div className="packaging-details">
                <textarea
                  name="packagingMaterial"
                  value={recipe.packagingMaterial}
                  onChange={handleInputChange}
                  placeholder="Describe packaging materials and instructions..."
                  className="form-textarea"
                  readOnly={mode === 'view'}
                />
              </div>
              <div className="packaging-image-container">
                {recipe.packagingImageUrl ? (
                  <div className="image-preview">
                    <img 
                      src={recipe.packagingImageUrl} 
                      alt="Packaging" 
                      className="packaging-image"
                    />
                    {mode !== 'view' && (
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() => setRecipe(prev => ({
                          ...prev,
                          packagingImage: null,
                          packagingImageUrl: ''
                        }))}
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                ) : mode !== 'view' && (
                  <div className="image-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="file-input-hidden"
                      id="packaging-image-input"
                    />
                    <button
                      type="button"
                      className="upload-btn"
                      onClick={() => document.getElementById('packaging-image-input').click()}
                    >
                      Upload Packaging Image
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="form-section financial-section">
          <h3>Financial Details</h3>
          <div className="financial-metrics-card">
            <div className="cost-inputs">
              <input
                type="number"
                name="sellingPrice"
                value={recipe.sellingPrice}
                onChange={handleInputChange}
                placeholder="Selling Price (₹)"
                className="form-input"
                min="0"
                step="0.01"
                readOnly={mode === 'view'}
              />
              <input
                type="number"
                name="averageMonthlySales"
                value={recipe.averageMonthlySales}
                onChange={handleInputChange}
                placeholder="Sales Volume"
                className="form-input"
                min="0"
                readOnly={mode === 'view'}
              />
            </div>

            <div className="financial-summary">
              <div className="summary-item">
                <span>Total Cost</span>
                <span>₹{recipe.totalCost.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span>Profit Margin</span>
                <span>{recipe.profitMargin.toFixed(2)}%</span>
              </div>
              <div className="summary-item">
                <span>Revenue</span>
                <span>{formatInLakhs(recipe.monthlyRevenue)}</span>
              </div>
              <div className="summary-item">
                <span>Gross Profit</span>
                <span>{formatInLakhs(recipe.monthlyProfit)}</span>
              </div>
              <div className="summary-item markup-factor" data-status={recipe.markupFactor >= 4 ? 'good' : 'bad'}>
                <span>Markup Factor</span>
                <span>{recipe.markupFactor.toFixed(2)}x</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          {mode === 'view' ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => setMode('edit')}>
                Edit Recipe
              </button>
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Back
              </button>
            </>
          ) : (
            <>
              <button type="submit" className="btn btn-primary">
                {editingRecipe ? 'Update Recipe' : 'Create Recipe'}
              </button>
              {(mode === 'edit' || editingRecipe) && (
                <button type="button" className="btn btn-secondary" onClick={onCancel}>
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;
