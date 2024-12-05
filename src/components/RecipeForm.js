import React, { useState, useEffect } from 'react';
import '../styles/NewRecipeForm.css';

const RecipeForm = ({ ingredients, onSubmit, editingRecipe, onCancel, mode = 'create', initialRecipe }) => {
  const [error, setError] = useState('');
  const [recipe, setRecipe] = useState(initialRecipe || editingRecipe || {
    id: null,
    name: '',
    category: 'Food',
    preparation_steps: '',
    cooking_method: '',
    plating_instructions: '',
    chefs_notes: '',
    selling_price: '',
    monthly_sales: '',
    overhead: '10',
    total_cost: '0',
    profit_margin: '0',
    monthly_revenue: '0',
    monthly_profit: '0',
    markup_factor: '0',
    print_menu_ready: false,
    qr_menu_ready: false,
    website_menu_ready: false,
    available_for_delivery: false,
    delivery_image_url: '',
    ingredients: [],
    created_at: null,
    updated_at: null,
    image: null,
    image_preview: null,
    image_url: null,
    delivery_image: null,
    delivery_image_preview: null
  });

  // Initialize form with editing recipe if provided
  useEffect(() => {
    if (initialRecipe) {
      setRecipe({
        ...initialRecipe,
        ingredients: Array.isArray(initialRecipe.ingredients) ? initialRecipe.ingredients : []
      });
    } else if (editingRecipe) {
      setRecipe({
        ...editingRecipe,
        ingredients: Array.isArray(editingRecipe.ingredients) ? editingRecipe.ingredients : []
      });
    }
  }, [initialRecipe, editingRecipe]);

  useEffect(() => {
    const calculateMetrics = () => {
      const totalCost = recipe.ingredients.reduce((total, ing) => {
        const ingredientData = ingredients.find(i => i.id === ing.id);
        if (ingredientData) {
          return total + (parseFloat(ingredientData.cost) * parseFloat(ing.quantity));
        }
        return total;
      }, 0);

      const overheadAmount = totalCost * (parseFloat(recipe.overhead) / 100);
      const finalTotalCost = totalCost + overheadAmount;

      const sellingPrice = parseFloat(recipe.selling_price) || 0;
      const monthlySales = parseInt(recipe.monthly_sales) || 0;

      const monthlyRevenue = Math.min(sellingPrice * monthlySales, 999999999);
      const monthlyProfit = Math.min(monthlyRevenue - (finalTotalCost * monthlySales), 999999999);
      const profitMargin = sellingPrice > 0 ? ((sellingPrice - finalTotalCost) / sellingPrice) * 100 : 0;
      const markupFactor = finalTotalCost > 0 ? Math.min(sellingPrice / finalTotalCost, 999999) : 0;

      setRecipe(prev => ({
        ...prev,
        total_cost: finalTotalCost.toFixed(2),
        monthly_revenue: monthlyRevenue.toFixed(2),
        monthly_profit: monthlyProfit.toFixed(2),
        profit_margin: profitMargin.toFixed(2),
        markup_factor: markupFactor.toFixed(2)
      }));
    };

    if (recipe.ingredients.length > 0 || recipe.selling_price || recipe.monthly_sales) {
      calculateMetrics();
    }
  }, [recipe.ingredients, recipe.selling_price, recipe.monthly_sales, recipe.overhead, ingredients]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let formattedValue = type === 'checkbox' ? checked : value;

    if (value !== '') {
      if (name === 'selling_price') {
        formattedValue = value;
      } else if (name === 'monthly_sales') {
        formattedValue = Math.min(parseInt(value) || 0, 999999).toString();
      } else if (name === 'overhead') {
        formattedValue = Math.min(parseFloat(value) || 0, 100).toString();
      }
    }

    setRecipe(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleMenuToggle = (field) => {
    setRecipe(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Handle ingredient selection
  const handleIngredientSelect = (e) => {
    const selectedId = parseInt(e.target.value);
    const selectedIng = ingredients.find(i => i.id === selectedId);
    
    if (selectedIng) {
      setSelectedIngredient({
        id: selectedId,
        name: selectedIng.name,
        unit: selectedIng.unit,
        cost: selectedIng.cost,
        quantity: '0'
      });
    } else {
      setSelectedIngredient({
        id: '',
        name: '',
        unit: '',
        cost: '0',
        quantity: '0'
      });
    }
  };

  // Handle ingredient quantity change
  const handleQuantityChange = (e) => {
    const value = e.target.value;
    setSelectedIngredient(prev => ({
      ...prev,
      quantity: value
    }));
  };

  // Add ingredient to recipe
  const addIngredient = () => {
    if (!selectedIngredient.id || parseFloat(selectedIngredient.quantity) <= 0) {
      setError('Please select an ingredient and enter a valid quantity');
      return;
    }

    // Check if ingredient already exists
    if (recipe.ingredients.some(i => i.id === selectedIngredient.id)) {
      setError('This ingredient is already added to the recipe');
      return;
    }

    const selectedIng = ingredients.find(i => i.id === selectedIngredient.id);
    if (!selectedIng) {
      setError('Selected ingredient not found');
      return;
    }

    setRecipe(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          id: selectedIngredient.id,
          name: selectedIng.name,
          unit: selectedIng.unit,
          cost: selectedIng.cost,
          quantity: selectedIngredient.quantity
        }
      ]
    }));

    // Reset selected ingredient
    setSelectedIngredient({
      id: '',
      name: '',
      unit: '',
      cost: '0',
      quantity: '0'
    });

    setError('');
  };

  // Remove ingredient from recipe
  const removeIngredient = (ingredientId) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i.id !== ingredientId)
    }));
  };

  const handleReset = () => {
    setRecipe({
      id: null,
      name: '',
      category: 'Food',
      preparation_steps: '',
      cooking_method: '',
      plating_instructions: '',
      chefs_notes: '',
      selling_price: '',
      monthly_sales: '',
      overhead: '10',
      total_cost: '0',
      profit_margin: '0',
      monthly_revenue: '0',
      monthly_profit: '0',
      markup_factor: '0',
      print_menu_ready: false,
      qr_menu_ready: false,
      website_menu_ready: false,
      available_for_delivery: false,
      delivery_image_url: '',
      ingredients: [],
      created_at: null,
      updated_at: null,
      image: null,
      image_preview: null,
      image_url: null,
      delivery_image: null,
      delivery_image_preview: null
    });
    setError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    // Validate required fields
    if (!recipe.name?.trim()) {
      setError('Recipe name is required');
      return;
    }

    if (!recipe.category?.trim()) {
      setError('Category is required');
      return;
    }

    if (!recipe.selling_price) {
      setError('Selling price is required');
      return;
    }

    if (!recipe.monthly_sales) {
      setError('Monthly sales is required');
      return;
    }

    // Format all numeric values before submission
    const formattedRecipe = {
      ...recipe,
      name: recipe.name.trim(),
      category: recipe.category.trim(),
      selling_price: parseFloat(recipe.selling_price).toFixed(2),
      monthly_sales: parseInt(recipe.monthly_sales).toString(),
      overhead: parseFloat(recipe.overhead).toFixed(2),
      total_cost: parseFloat(recipe.total_cost).toFixed(2),
      monthly_revenue: parseFloat(recipe.monthly_revenue).toFixed(2),
      monthly_profit: parseFloat(recipe.monthly_profit).toFixed(2),
      profit_margin: parseFloat(recipe.profit_margin).toFixed(2),
      markup_factor: parseFloat(recipe.markup_factor).toFixed(2)
    };

    // Convert recipe data to FormData
    const formData = new FormData();
    
    // Append basic fields
    Object.keys(formattedRecipe).forEach(key => {
      if (key === 'ingredients') {
        // Handle ingredients array specially
        formData.append('ingredients', JSON.stringify(formattedRecipe.ingredients));
      } else if (key === 'image' && formattedRecipe.image instanceof File) {
        formData.append('image', formattedRecipe.image);
      } else if (key === 'delivery_image' && formattedRecipe.delivery_image instanceof File) {
        formData.append('delivery_image', formattedRecipe.delivery_image);
      } else if (formattedRecipe[key] != null && formattedRecipe[key] !== undefined && key !== 'description' && key !== 'delivery_packaging') {
        formData.append(key, formattedRecipe[key].toString());
      }
    });

    try {
      await onSubmit(formData);
      setError(''); // Clear error on success
    } catch (error) {
      console.error('Error submitting recipe:', error);
      setError(error.message || 'Failed to save recipe. Please try again.');
    }
  };

  const handleResetClick = () => {
    handleReset();
  };

  const [selectedIngredient, setSelectedIngredient] = useState({
    id: '',
    quantity: '0',
    name: '',
    unit: '',
    cost: '0'
  });

  return (
    <div className="recipe-form-container">
      <div className="page-title-container">
        <h1 className="page-title">
          {editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
        </h1>
      </div>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="recipe-form">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="form-section basic-info-section">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label htmlFor="name">Recipe Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={recipe.name}
              onChange={handleInputChange}
              className="form-control"
              required
              placeholder="Enter recipe name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={recipe.category}
              onChange={handleInputChange}
              className="form-select"
              required
            >
              <option value="">Select Category</option>
              <option value="Food">Food</option>
              <option value="Bakery">Bakery</option>
              <option value="Beverages">Beverages</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="image">Recipe Image</label>
            <input
              type="file"
              id="image"
              name="image"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const previewUrl = URL.createObjectURL(file);
                  setRecipe(prev => ({
                    ...prev,
                    image: file,
                    image_preview: previewUrl
                  }));
                }
              }}
              className="form-control"
              accept="image/*"
            />
            {(recipe.image_preview || recipe.image_url) && (
              <div className="image-preview-container">
                <img 
                  src={recipe.image_preview || recipe.image_url} 
                  alt="Recipe preview" 
                  className="image-preview"
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (recipe.image_preview) {
                      URL.revokeObjectURL(recipe.image_preview);
                    }
                    setRecipe(prev => ({
                      ...prev,
                      image: null,
                      image_preview: null,
                      image_url: null
                    }));
                    const fileInput = document.getElementById('image');
                    if (fileInput) fileInput.value = '';
                  }}
                  className="remove-image-btn"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="form-section financial-section">
          <h3>Financial Information</h3>
          <div className="form-group">
            <label htmlFor="selling_price">Selling Price (₹) *</label>
            <input
              type="number"
              id="selling_price"
              name="selling_price"
              value={recipe.selling_price}
              onChange={handleInputChange}
              className="form-control"
              min="0"
              max="999999999"
              step="any"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="monthly_sales">Monthly Sales (Units) *</label>
            <input
              type="number"
              id="monthly_sales"
              name="monthly_sales"
              value={recipe.monthly_sales}
              onChange={handleInputChange}
              className="form-control"
              min="0"
              max="999999"
              step="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="overhead">Overhead % *</label>
            <input
              type="number"
              id="overhead"
              name="overhead"
              value={recipe.overhead}
              onChange={handleInputChange}
              className="form-control"
              min="0"
              max="100"
              step="0.01"
              required
            />
          </div>

          <div className="calculated-metrics">
            <h4>Calculated Metrics</h4>
            <div className="metric-grid">
              <div className="metric-item">
                <label>Total Cost:</label>
                <span className="value">₹ {recipe.total_cost}</span>
              </div>
              <div className="metric-item">
                <label>Profit Margin:</label>
                <span className="value">{recipe.profit_margin}%</span>
              </div>
              <div className="metric-item">
                <label>Monthly Revenue:</label>
                <span className="value">₹ {recipe.monthly_revenue}</span>
              </div>
              <div className="metric-item">
                <label>Monthly Profit:</label>
                <span className="value">₹ {recipe.monthly_profit}</span>
              </div>
              <div className="metric-item">
                <label>Markup Factor:</label>
                <span className="value">{recipe.markup_factor}x</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section menu-tracking-section">
          <h3>Menu Availability</h3>
          <div className="menu-tracking-grid">
            <div className="menu-tracking-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="print_menu_ready"
                  checked={recipe.print_menu_ready}
                  onChange={() => handleMenuToggle('print_menu_ready')}
                />
                Print Menu
              </label>
            </div>
            <div className="menu-tracking-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="qr_menu_ready"
                  checked={recipe.qr_menu_ready}
                  onChange={() => handleMenuToggle('qr_menu_ready')}
                />
                QR Code Menu
              </label>
            </div>
            <div className="menu-tracking-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="website_menu_ready"
                  checked={recipe.website_menu_ready}
                  onChange={() => handleMenuToggle('website_menu_ready')}
                />
                Website Menu
              </label>
            </div>
            <div className="menu-tracking-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="available_for_delivery"
                  checked={recipe.available_for_delivery}
                  onChange={() => handleMenuToggle('available_for_delivery')}
                />
                Available for Delivery
              </label>
            </div>
          </div>
        </div>

        {recipe.available_for_delivery && (
          <div className="form-section delivery-image-section">
            <h3>Delivery Image</h3>
            <div className="form-group">
              <label>Delivery Image</label>
              <div className="image-upload-container">
                {recipe.delivery_image_preview || recipe.delivery_image_url ? (
                  <div className="image-preview-container">
                    <img 
                      src={recipe.delivery_image_preview || recipe.delivery_image_url} 
                      alt="Delivery preview" 
                      className="image-preview"
                      style={{ maxWidth: '200px', marginTop: '10px' }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (recipe.delivery_image_preview) {
                          URL.revokeObjectURL(recipe.delivery_image_preview);
                        }
                        setRecipe(prev => ({
                          ...prev,
                          delivery_image: null,
                          delivery_image_preview: null,
                          delivery_image_url: null
                        }));
                        const fileInput = document.querySelector('input[name="delivery_image"]');
                        if (fileInput) {
                          fileInput.value = '';
                        }
                      }}
                      className="remove-image-btn"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div className="file-input-container">
                    <input
                      type="file"
                      name="delivery_image"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const previewUrl = URL.createObjectURL(file);
                          setRecipe(prev => ({
                            ...prev,
                            delivery_image: file,
                            delivery_image_preview: previewUrl
                          }));
                        }
                      }}
                      className="form-control"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="form-section sop-section">
          <h3>Standard Operating Procedure</h3>
          <div className="sop-container">
            <div className="sop-item">
              <span role="img" aria-label="clipboard">📋</span>
              <textarea
                name="preparation_steps"
                value={recipe.preparation_steps || ''}
                onChange={handleInputChange}
                placeholder="Preparation Steps"
                className="form-control"
              />
            </div>
            <div className="sop-item">
              <span role="img" aria-label="cooking">🍳</span>
              <textarea
                name="cooking_method"
                value={recipe.cooking_method || ''}
                onChange={handleInputChange}
                placeholder="Cooking Method"
                className="form-control"
              />
            </div>
            <div className="sop-item">
              <span role="img" aria-label="plating">🍽️</span>
              <textarea
                name="plating_instructions"
                value={recipe.plating_instructions || ''}
                onChange={handleInputChange}
                placeholder="Plating Instructions"
                className="form-control"
              />
            </div>
            <div className="sop-item">
              <span role="img" aria-label="notes">📝</span>
              <textarea
                name="chefs_notes"
                value={recipe.chefs_notes || ''}
                onChange={handleInputChange}
                placeholder="Chef's Notes"
                className="form-control"
              />
            </div>
          </div>
        </div>

        <div className="form-section ingredients-section">
          <h3>Ingredients</h3>
          <div className="ingredient-input-group">
            <select
              value={selectedIngredient.id}
              onChange={handleIngredientSelect}
              className="form-select"
            >
              <option value="">Select Ingredient</option>
              {ingredients && ingredients.map(ingredient => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} ({ingredient.unit}) - ₹{parseFloat(ingredient.cost).toFixed(2)}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={selectedIngredient.quantity}
              onChange={handleQuantityChange}
              placeholder="Quantity"
              className="form-input quantity-input"
              min="0"
              step="0.1"
            />

            <button
              type="button"
              onClick={addIngredient}
              className="add-ingredient-btn"
            >
              Add
            </button>
          </div>

          <div className="ingredients-list">
            {recipe.ingredients.map((ingredient) => {
              const ingredientData = ingredients.find(i => i.id === ingredient.id);
              return (
                <div key={ingredient.id} className="ingredient-row">
                  <span className="ingredient-name">{ingredientData?.name}</span>
                  <span className="ingredient-quantity">{ingredient.quantity} {ingredientData?.unit}</span>
                  <span className="ingredient-cost">₹{(ingredientData?.cost * ingredient.quantity).toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ingredient.id)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="button primary">
            {editingRecipe ? 'Update Recipe' : 'Create Recipe'}
          </button>
          <button type="button" className="button secondary" onClick={handleResetClick}>
            Reset Form
          </button>
          {onCancel && (
            <button type="button" className="button secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;
