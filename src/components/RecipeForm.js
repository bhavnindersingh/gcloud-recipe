import React, { useState, useEffect } from 'react';
import { RECIPE_CATEGORIES } from '../constants/categories';
import '../styles/NewRecipeForm.css';
import { useNavigate } from 'react-router-dom';

// Empty recipe template
const emptyRecipe = {
  id: null,
  name: '',
  category: 'Uncategorized',
  preparation_steps: '',
  cooking_method: '',
  plating_instructions: '',
  chefs_notes: '',
  selling_price: '',
  sales: '',
  overhead: '10',
  total_cost: '0',
  profit_margin: '0',
  revenue: '0',
  profit: '0',
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
};

const RecipeForm = ({ ingredients, onSubmit, editingRecipe, onCancel, mode = 'create', initialRecipe, viewingRecipe, recipes }) => {
  const [error, setError] = useState({ message: '', type: '' });
  const [isDuplicateName, setIsDuplicateName] = useState(false);
  const navigate = useNavigate();
  const isViewMode = mode === 'view';

  // Update the initial recipe state
  const [recipe, setRecipe] = useState(() => {
    if (mode === 'view' && viewingRecipe) {
      return {
        ...viewingRecipe,
        image_preview: viewingRecipe.image_url,
        delivery_image_preview: viewingRecipe.delivery_image_url,
        ingredients: viewingRecipe.ingredients || []
      };
    }
    if (editingRecipe) {
      return {
        ...editingRecipe,
        image_preview: editingRecipe.image_url,
        delivery_image_preview: editingRecipe.delivery_image_url
      };
    }
    return emptyRecipe;
  });

  // Update recipe when viewingRecipe changes
  useEffect(() => {
    if (mode === 'view' && viewingRecipe) {
      setRecipe({
        ...viewingRecipe,
        image_preview: viewingRecipe.image_url,
        delivery_image_preview: viewingRecipe.delivery_image_url,
        ingredients: viewingRecipe.ingredients || [],
        // Ensure all required fields have default values
        total_cost: viewingRecipe.total_cost || '0',
        total_revenue: viewingRecipe.total_revenue || '0',
        profit_margin: viewingRecipe.profit_margin || '0',
        markup_factor: viewingRecipe.markup_factor || '0',
        overhead: viewingRecipe.overhead || '0',
        selling_price: viewingRecipe.selling_price || '0',
        sales: viewingRecipe.sales || '0'
      });
    }
  }, [mode, viewingRecipe]);

  // Log the recipe state in view mode
  useEffect(() => {
    if (mode === 'view') {
      console.log('Recipe in view mode:', recipe);
    }
  }, [recipe, mode]);

  useEffect(() => {
    if (mode === 'view' && viewingRecipe) {
      setRecipe({
        ...viewingRecipe,
        image_preview: viewingRecipe.image_url,
        delivery_image_preview: viewingRecipe.delivery_image_url,
        ingredients: viewingRecipe.ingredients || []
      });
    }
  }, [mode, viewingRecipe]);

  const [showImageModal, setShowImageModal] = useState(false);
  const [showDeliveryImageModal, setShowDeliveryImageModal] = useState(false);
  const [prevMode, setPrevMode] = useState(mode);

  // Track mode changes and clear data when switching from edit to create
  useEffect(() => {
    if (prevMode === 'edit' && mode === 'create') {
      // Clear form data from session storage
      sessionStorage.removeItem('recipeFormData');
      // Reset the recipe state to empty
      setRecipe(emptyRecipe);
      // Reset selected ingredient
      setSelectedIngredient({
        id: '',
        name: '',
        unit: '',
        cost: '0',
        quantity: '0'
      });
      // Clear any error messages
      setError({ message: '', type: '' });
    }
    setPrevMode(mode);
  }, [mode, prevMode]);

  // Save form data to sessionStorage when it changes in create mode
  useEffect(() => {
    if (mode === 'create' && !recipe.id) {
      sessionStorage.setItem('recipeFormData', JSON.stringify(recipe));
    }
  }, [recipe, mode]);

  const [selectedIngredient, setSelectedIngredient] = useState({
    id: '',
    name: '',
    unit: '',
    cost: '0',
    quantity: '0'
  });

  // Track ingredients length changes
  const ingredientsLength = recipe.ingredients?.length || 0;
  
  useEffect(() => {
    if (ingredientsLength) {
      setSelectedIngredient({
        id: '',
        name: '',
        unit: '',
        cost: '0',
        quantity: '0'
      });
    }
  }, [ingredientsLength]);

  const handleImageChange = (e, isDeliveryImage = false) => {
    if (isViewMode) return;
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      if (isDeliveryImage) {
        setRecipe(prev => ({
          ...prev,
          delivery_image: file,
          delivery_image_preview: objectUrl,
          delivery_image_url: null
        }));
      } else {
        setRecipe(prev => ({
          ...prev,
          image: file,
          image_preview: objectUrl,
          image_url: null
        }));
      }
    }
  };

  const handleReset = () => {
    setRecipe(emptyRecipe);
    setError({ message: '', type: '' });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    
    // Validate required fields
    if (!recipe.name || !recipe.category || !recipe.selling_price || !recipe.sales) {
      console.log('Validation failed');
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Check for duplicate recipe names only in create mode
    if (mode === 'create') {
      const isDuplicate = recipes.some(existingRecipe => 
        existingRecipe.name.toLowerCase() === recipe.name.toLowerCase()
      );

      if (isDuplicate) {
        showToast('A recipe with this name already exists. Please use a different name.', 'error');
        return;
      }
    }

    // Format and validate numeric values
    const sellingPrice = parseInt(recipe.selling_price) || 0;
    const sales = parseInt(recipe.sales) || 0;
    const overhead = parseFloat(recipe.overhead || 0);

    // Validate numeric ranges
    if (sellingPrice > 999999) {
      showToast('Selling price cannot exceed 999,999', 'error');
      return;
    }

    if (sales > 999999) {
      showToast('Sales cannot exceed 999,999', 'error');
      return;
    }

    // Calculate revenue and profit as whole numbers
    const totalCost = parseFloat(recipe.total_cost || 0);
    const revenue = Math.round(sellingPrice * sales);
    const profit = Math.round(revenue - (totalCost * sales));
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const markupFactor = totalCost > 0 ? sellingPrice / totalCost : 0;

    // Format numeric values with proper precision
    const formattedRecipe = {
      ...recipe,
      id: recipe.id || null,
      selling_price: sellingPrice,
      sales: sales,
      overhead: overhead.toFixed(2),
      total_cost: parseFloat(recipe.total_cost || 0).toFixed(2),
      revenue: revenue.toString(),
      profit: profit.toString(),
      profit_margin: profitMargin.toFixed(2),
      markup_factor: markupFactor.toFixed(2),
      ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        quantity: parseFloat(ing.quantity || 0).toFixed(2)
      }))
    };

    try {
      console.log('Submitting recipe...', formattedRecipe);
      await onSubmit(formattedRecipe);
      console.log('Recipe submitted successfully');
      const message = recipe.id ? 'Recipe updated successfully!' : 'Recipe created successfully!';
      showToast(message, 'success');
      
      // Wait for a short time to ensure toast is visible
      setTimeout(() => {
        navigate('/manager');
      }, 1000);
    } catch (error) {
      console.error('Error submitting recipe:', error);
      const errorMessage = error.message?.includes('numeric field overflow') 
        ? 'Please check your numeric values are within valid ranges'
        : error.message || 'Failed to save recipe. Please try again.';
      showToast(errorMessage, 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    console.log('Showing toast:', message, type);
    setError({ message, type });

    // Remove the toast after 3 seconds
    setTimeout(() => {
      setError({ message: '', type: '' });
    }, 3000);
  };

  const handleRemoveImage = () => {
    if (isViewMode) return;
    setRecipe(prev => ({
      ...prev,
      image: null,
      image_preview: null,
      image_url: null
    }));
  };

  // Handle delivery image change
  const handleDeliveryImageChange = (e) => {
    handleImageChange(e, true);
  };

  // Handle delivery image removal
  const handleRemoveDeliveryImage = () => {
    if (isViewMode) return;
    setRecipe(prev => ({
      ...prev,
      delivery_image: null,
      delivery_image_preview: null,
      delivery_image_url: null
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitWithLoading = async (e) => {
    setIsSubmitting(true);
    await handleSubmit(e);
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    navigate('/manager');
  };

  const handleIngredientChange = (e) => {
    if (isViewMode) return;
    const selectedId = e.target.value;
    const selectedIng = ingredients.find(i => i.id === parseInt(selectedId));
    
    setSelectedIngredient({
      id: selectedId,
      name: selectedIng?.name || '',
      unit: selectedIng?.unit || '',
      cost: selectedIng?.cost || '0',
      quantity: '0'
    });
  };

  const handleAddIngredient = () => {
    if (isViewMode) return;
    
    if (!selectedIngredient.id) {
      setError({ message: 'Please select an ingredient', type: 'error' });
      return;
    }

    const quantity = parseFloat(selectedIngredient.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError({ message: 'Please enter a valid quantity', type: 'error' });
      return;
    }

    // Check if ingredient already exists
    const existingIngredient = recipe.ingredients.find(ing => ing.id === parseInt(selectedIngredient.id));
    if (existingIngredient) {
      setError({ message: 'This ingredient is already added to the recipe', type: 'error' });
      return;
    }

    const selectedIng = ingredients.find(i => i.id === parseInt(selectedIngredient.id));
    if (!selectedIng) {
      setError({ message: 'Selected ingredient not found', type: 'error' });
      return;
    }

    const cost = parseFloat(selectedIng.cost);
    const totalCost = cost * quantity;

    setRecipe(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          id: parseInt(selectedIngredient.id),
          name: selectedIng.name,
          unit: selectedIng.unit,
          cost: cost.toFixed(2),
          quantity: quantity.toFixed(2),
          totalCost: totalCost.toFixed(2)
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
    setError({ message: '', type: '' });
  };

  useEffect(() => {
    // First, ensure all ingredients have proper totalCost
    const updatedIngredients = recipe.ingredients.map(ing => {
      const quantity = parseFloat(ing.quantity) || 0;
      const cost = parseFloat(ing.cost) || 0;
      const totalCost = quantity * cost;
      return {
        ...ing,
        totalCost: totalCost.toFixed(2)
      };
    });

    // Update recipe with fixed ingredients if there were any NaN values
    if (updatedIngredients.some(ing => ing.totalCost !== recipe.ingredients.find(i => i.id === ing.id)?.totalCost)) {
      setRecipe(prev => ({
        ...prev,
        ingredients: updatedIngredients
      }));
    }

    const totalIngredientsCost = updatedIngredients.reduce((sum, ing) => {
      return sum + parseFloat(ing.totalCost);
    }, 0);

    const overhead = parseFloat(recipe.overhead) || 0;
    const totalCost = totalIngredientsCost * (1 + overhead / 100);
    const sellingPrice = parseFloat(recipe.selling_price) || 0;
    const sales = parseFloat(recipe.sales) || 0;
    const revenue = sellingPrice * sales;
    const profit = revenue - (totalCost * sales);
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const markupFactor = totalCost > 0 ? sellingPrice / totalCost : 0;

    setRecipe(prev => ({
      ...prev,
      total_cost: totalCost.toFixed(2),
      total_revenue: revenue.toFixed(2),
      profit: profit.toFixed(2),
      profit_margin: profitMargin.toFixed(2),
      markup_factor: markupFactor.toFixed(2)
    }));
  }, [recipe.ingredients, recipe.overhead, recipe.selling_price, recipe.sales]);

  const handleNameChange = (e) => {
    if (isViewMode || mode === 'edit') return;
    const newName = e.target.value;
    setRecipe(prev => ({ ...prev, name: newName }));

    // Check for duplicate name only in create mode
    if (mode === 'create') {
      const duplicate = recipes.some(existingRecipe => 
        existingRecipe.name.toLowerCase() === newName.toLowerCase()
      );
      setIsDuplicateName(duplicate);
      if (duplicate) {
        showToast('A recipe with this name already exists. Please use a different name.', 'error');
      }
    }
  };

  return (
    <div className="recipe-form-container">
      {/* Show toast message if error exists */}
      {error.message && (
        <div className={`toast-message ${error.type}`}>
          {error.message}
        </div>
      )}
      <div className="page-title-container">
        <h1 className="page-title">
          {mode === 'edit' ? 'Edit Recipe' : mode === 'view' ? 'Show Recipe' : 'Create Recipe'}
        </h1>
      </div>
      
      <form onSubmit={handleSubmitWithLoading} className={`recipe-form ${mode === 'view' ? 'view-mode' : ''}`}>
        {/* Recipe Details Section */}
        <div className="form-section recipe-details-section">
          <h2>Recipe Details</h2>
          <div className="form-group">
            <label htmlFor="name">Recipe Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={recipe.name}
              onChange={handleNameChange}
              className={`form-control ${isDuplicateName ? 'error-input' : ''}`}
              placeholder="Enter recipe name"
              required
              disabled={isViewMode || mode === 'edit'}
              title={mode === 'edit' ? "Recipe name cannot be changed in edit mode" : ""}
            />
            {isDuplicateName && mode === 'create' && (
              <div className="error-message">This recipe name already exists</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={recipe.category}
              onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
              className="form-control"
              required
              disabled={isViewMode}
            >
              {RECIPE_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Recipe Image</label>
            <div className="image-upload-section">
              {!recipe.image && !recipe.image_preview && !recipe.image_url ? (
                <div className="image-upload-container">
                  <input
                    type="file"
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="recipe-image"
                    disabled={isViewMode}
                  />
                  <label htmlFor="recipe-image" className="image-upload-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7m4 0v4m0 0l-4-4m4 4l4-4"/>
                    </svg>
                    <p>Click to upload recipe image</p>
                  </label>
                </div>
              ) : (
                <div className="image-preview-container">
                  <img
                    src={recipe.image_preview || recipe.image_url}
                    alt="Recipe preview"
                    onClick={() => setShowImageModal(true)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div className="image-actions">
                    <button
                      type="button"
                      className="image-action-btn fullscreen"
                      onClick={() => setShowImageModal(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                      </svg>
                    </button>
                    {!isViewMode && (
                      <button
                        type="button"
                        className="image-action-btn remove"
                        onClick={handleRemoveImage}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preparation Procedure Section */}
        <div className="form-section preparation-section">
          <h2>Preparation Procedure</h2>
          <div className="preparation-content">
            <div className="preparation-item">
              <div className="preparation-item-header">
                <span role="img" aria-label="steps">📝</span>
                <label>Preparation Steps</label>
              </div>
              <textarea
                name="preparation_steps"
                value={recipe.preparation_steps}
                onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="List the steps to prepare this recipe..."
                disabled={isViewMode}
              />
            </div>
            
            <div className="preparation-item">
              <div className="preparation-item-header">
                <span role="img" aria-label="cooking">🍳</span>
                <label>Cooking Method</label>
              </div>
              <textarea
                name="cooking_method"
                value={recipe.cooking_method}
                onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="Describe the cooking method and techniques..."
                disabled={isViewMode}
              />
            </div>

            <div className="preparation-item">
              <div className="preparation-item-header">
                <span role="img" aria-label="plating">🍽️</span>
                <label>Plating Instructions</label>
              </div>
              <textarea
                name="plating_instructions"
                value={recipe.plating_instructions}
                onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="Describe how to plate and present the dish..."
                disabled={isViewMode}
              />
            </div>

            <div className="preparation-item">
              <div className="preparation-item-header">
                <span role="img" aria-label="notes">📌</span>
                <label>Chef's Notes</label>
              </div>
              <textarea
                name="chefs_notes"
                value={recipe.chefs_notes}
                onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                placeholder="Add any special tips, variations, or notes..."
                disabled={isViewMode}
              />
            </div>
          </div>
        </div>

        {/* Recipe Ingredients Section */}
        <div className="form-section ingredients-section">
          <h2>Recipe Ingredients</h2>
          <div className="add-ingredient-form">
            <div className="input-row">
              <div className="form-group">
                <label htmlFor="ingredient">Select Ingredient</label>
                <select
                  id="ingredient"
                  className="form-control ingredient-select"
                  value={selectedIngredient.id}
                  onChange={handleIngredientChange}
                  disabled={isViewMode}
                >
                  <option value="">Select an ingredient...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (₹{parseFloat(ing.cost).toFixed(2)}/{ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Quantity</label>
                <input
                  type="number"
                  id="quantity"
                  className="form-control quantity-input"
                  value={selectedIngredient.quantity}
                  onChange={(e) => !isViewMode && setSelectedIngredient(prev => ({ ...prev, quantity: e.target.value }))}
                  min="0"
                  step="any"
                  disabled={isViewMode}
                />
              </div>
            </div>

            <button 
              type="button" 
              className="add-ingredient-btn" 
              onClick={handleAddIngredient}
              disabled={isViewMode || !selectedIngredient.id || parseFloat(selectedIngredient.quantity) <= 0}
            >
              <span>Add Ingredient</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          {error.message && <div className="error-message">{error.message}</div>}

          <div className="ingredients-table-container">
            <table className="ingredients-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Cost</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ing, index) => (
                  <tr key={ing.uniqueId || `${ing.id}-${Date.now()}-${index}`}>
                    <td className="ingredient-name">{ing.name}</td>
                    <td className="ingredient-quantity">{ing.quantity} {ing.unit}</td>
                    <td className="ingredient-cost">₹{parseFloat(ing.totalCost).toFixed(2)}</td>
                    <td>
                      <button
                        type="button"
                        className="remove-ingredient-btn"
                        onClick={() => {
                          if (isViewMode) return;
                          const removedIngredient = recipe.ingredients[index];
                          setRecipe(prev => ({
                            ...prev,
                            ingredients: prev.ingredients.filter((_, i) => i !== index)
                          }));
                          setError({ message: `Removed ${removedIngredient.name || 'ingredient'} from recipe`, type: 'error' });
                        }}
                        title="Remove ingredient"
                        disabled={isViewMode}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recipe.ingredients.length > 0 && (
            <div className="ingredients-total">
              <span className="total-label">Total Ingredients Cost:</span>
              <span className="total-amount">
                ₹{recipe.ingredients.reduce((sum, ing) => sum + parseFloat(ing.totalCost), 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* MRP Decider Section */}
        <div className="form-section mrp-section">
          <h2>MRP Decider</h2>
          <div className="form-group">
            <label htmlFor="selling_price">Selling Price</label>
            <input
              type="number"
              id="selling_price"
              name="selling_price"
              value={recipe.selling_price || ''}
              placeholder="0"
              onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
              className="form-control"
              min="0"
              max="999999"
              step="1"
              required
              disabled={isViewMode}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sales">Sales (units)</label>
            <input
              type="number"
              id="sales"
              name="sales"
              className="form-control"
              value={recipe.sales}
              onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
              min="0"
              max="999999"
              disabled={isViewMode}
            />
          </div>

          <div className="form-group">
            <label htmlFor="overhead">Overhead % *</label>
            <input
              type="number"
              id="overhead"
              name="overhead"
              value={recipe.overhead}
              onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
              className="form-control"
              min="0"
              max="100"
              step="0.01"
              required
              disabled={isViewMode}
            />
          </div>

          <div className="financial-metrics">
            <div className="metric-card">
              <div className="metric-label">Total Cost</div>
              <div className="metric-value">₹{recipe.total_cost}</div>
            </div>
            <div className={`metric-card ${parseFloat(recipe.markup_factor) >= 4 ? 'metric-success' : 'metric-warning'}`}>
              <div className="metric-label">Markup Factor</div>
              <div className="metric-value">{recipe.markup_factor}x</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Revenue</div>
              <div className="metric-value">₹{recipe.total_revenue}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Profit</div>
              <div className="metric-value">₹{recipe.profit}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Profit Margin</div>
              <div className="metric-value">{recipe.profit_margin}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Sales (units)</div>
              <div className="metric-value">{recipe.sales}</div>
            </div>
          </div>
        </div>

        {/* Menu Availability Section */}
        <div className="form-section menu-availability-section">
          <h2>Menu Availability</h2>
          <div className="form-group">
            <div className="checkbox-group">
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="print_menu_ready"
                  name="print_menu_ready"
                  checked={recipe.print_menu_ready}
                  onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.checked }))}
                  className="styled-checkbox"
                  disabled={isViewMode}
                />
                <label htmlFor="print_menu_ready" className="checkbox-label">Print Menu Ready</label>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="qr_menu_ready"
                  name="qr_menu_ready"
                  checked={recipe.qr_menu_ready}
                  onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.checked }))}
                  className="styled-checkbox"
                  disabled={isViewMode}
                />
                <label htmlFor="qr_menu_ready" className="checkbox-label">QR Menu Ready</label>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="website_menu_ready"
                  name="website_menu_ready"
                  checked={recipe.website_menu_ready}
                  onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.checked }))}
                  className="styled-checkbox"
                  disabled={isViewMode}
                />
                <label htmlFor="website_menu_ready" className="checkbox-label">Website Menu Ready</label>
              </div>
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="available_for_delivery"
                  name="available_for_delivery"
                  checked={recipe.available_for_delivery}
                  onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.checked }))}
                  className="styled-checkbox"
                  disabled={isViewMode}
                />
                <label htmlFor="available_for_delivery" className="checkbox-label">
                  Available for Delivery
                </label>
              </div>
            </div>
          </div>

          {/* Delivery Image Section - Inside Menu Availability */}
          {recipe.available_for_delivery && (
            <div className="delivery-image-section">
              <label>Delivery Image</label>
              <div className="image-upload-section">
                {!recipe.delivery_image && !recipe.delivery_image_preview && !recipe.delivery_image_url ? (
                  <div className="image-upload-container">
                    <input
                      type="file"
                      onChange={handleDeliveryImageChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="delivery-image"
                      disabled={isViewMode}
                    />
                    <label htmlFor="delivery-image" className="image-upload-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7m4 0v4m0 0l-4-4m4 4l4-4"/>
                      </svg>
                      <p>Upload delivery presentation image</p>
                      <span className="upload-hint">This image will be shown to customers during delivery</span>
                    </label>
                  </div>
                ) : (
                  <div className="image-preview-container">
                    <img
                      src={recipe.delivery_image_preview || recipe.delivery_image_url}
                      alt="Delivery preview"
                      onClick={() => setShowDeliveryImageModal(true)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div className="image-actions">
                      <button
                        type="button"
                        className="image-action-btn fullscreen"
                        onClick={() => setShowDeliveryImageModal(true)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                        </svg>
                      </button>
                      {!isViewMode && (
                        <button
                          type="button"
                          className="image-action-btn remove"
                          onClick={handleRemoveDeliveryImage}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Section */}
        <div className="action-buttons-card">
          {mode === 'view' ? (
            <button 
              type="button" 
              className="btn return-btn"
              onClick={handleCancel}
            >
              <span>←</span> Return to Recipe Manager
            </button>
          ) : (
            <>
              <button 
                type="submit" 
                className="btn create-btn"
                disabled={isSubmitting || (mode === 'create' && isDuplicateName)}
              >
                <span>+</span> {mode === 'edit' ? 'Update Recipe' : 'Create Recipe'}
              </button>
              <button 
                type="button" 
                className="btn cancel-btn"
                onClick={handleCancel}
              >
                <span>-</span> Cancel
              </button>
            </>
          )}
        </div>
      </form>
      {showImageModal && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={recipe.image_preview || recipe.image} alt="Recipe full view" />
            <button className="close-modal" onClick={() => setShowImageModal(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}
      {showDeliveryImageModal && (
        <div className="image-modal" onClick={() => setShowDeliveryImageModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">Delivery Presentation Image</div>
            <img src={recipe.delivery_image_preview || recipe.delivery_image_url} alt="Delivery full view" />
            <button className="close-modal" onClick={() => setShowDeliveryImageModal(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeForm;
