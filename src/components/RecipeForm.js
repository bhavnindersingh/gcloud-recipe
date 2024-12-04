import React, { useState, useEffect } from 'react';
import '../styles/shared.css';
import '../styles/NewRecipeForm.css';

const RecipeForm = ({ ingredients, onSubmit, editingRecipe, onCancel, mode = 'create' }) => {
  const [currentMode, setMode] = useState(mode);

  // Initial recipe state structure with standardized field names matching database
  const initialRecipeState = {
    // Basic Information
    id: null,
    name: '',
    category: '',
    description: '',

    // Instructions
    preparation_steps: '',
    cooking_method: '',
    plating_instructions: '',
    chefs_notes: '',

    // Financial
    selling_price: '0',
    monthly_sales: '0',
    overhead: '10',
    total_cost: '0',
    profit_margin: '0',
    monthly_revenue: '0',
    monthly_profit: '0',
    markup_factor: '0',

    // Menu Flags
    print_menu_ready: false,
    qr_menu_ready: false,
    website_menu_ready: false,
    available_for_delivery: false,
    delivery_image_url: '',

    // Ingredients Array
    ingredients: [],

    // Metadata
    created_at: null,
    updated_at: null
  };

  const [recipe, setRecipe] = useState(() => {
    if (editingRecipe) {
      console.log('Initializing with editing recipe:', editingRecipe);
      
      // Convert numeric fields to strings and handle null/undefined values
      const numericFields = [
        'selling_price', 'monthly_sales', 'overhead',
        'total_cost', 'profit_margin', 'monthly_revenue',
        'monthly_profit', 'markup_factor'
      ];
      
      const processedRecipe = {
        ...initialRecipeState,
        ...editingRecipe,
        ingredients: editingRecipe.ingredients || []
      };

      // Ensure numeric fields are properly formatted strings
      numericFields.forEach(field => {
        const value = editingRecipe[field];
        processedRecipe[field] = (value !== null && value !== undefined) 
            ? Number(value).toString()
            : '0';
      });

      return processedRecipe;
    }
    return initialRecipeState;
  });

  const [error, setError] = useState('');

  // Effect to initialize form with editing recipe data
  useEffect(() => {
    if (editingRecipe) {
      console.log('Setting editing recipe:', editingRecipe);
      
      // Convert numeric fields to strings and handle null/undefined values
      const numericFields = [
        'selling_price', 'monthly_sales', 'overhead',
        'total_cost', 'profit_margin', 'monthly_revenue',
        'monthly_profit', 'markup_factor'
      ];
      
      const processedRecipe = {
        ...initialRecipeState,
        ...editingRecipe,
        ingredients: editingRecipe.ingredients || []
      };

      // Ensure numeric fields are properly formatted strings
      numericFields.forEach(field => {
        const value = editingRecipe[field];
        processedRecipe[field] = (value !== null && value !== undefined) 
            ? Number(value).toString()
            : '0';
      });

      setRecipe(processedRecipe);
    }
  }, [editingRecipe]);

  // Initialize selected ingredient state with default values
  const [selectedIngredient, setSelectedIngredient] = useState({
    id: '',
    quantity: '0',
    name: '',
    unit: '',
    cost: '0'
  });

  // Reset form when editingRecipe changes or mode changes
  useEffect(() => {
    if (mode === 'create') {
      setRecipe(initialRecipeState);
    } else if (editingRecipe) {
      setRecipe(editingRecipe);
    }
  }, [editingRecipe, mode]);

  const showNotification = (message, type = 'success') => {
    setError(message);
    setTimeout(() => {
      setError('');
    }, 3000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let newValue = type === 'checkbox' ? checked : value;

    // Handle numeric fields
    const numericFields = [
      'selling_price', 'monthly_sales', 'overhead',
      'total_cost', 'profit_margin', 'monthly_revenue',
      'monthly_profit', 'markup_factor'
    ];

    if (numericFields.includes(name)) {
      newValue = value === '' ? '0' : value.replace(/[^\d.-]/g, '');
      if (isNaN(parseFloat(newValue))) {
        newValue = '0';
      }
    }

    setRecipe(prev => {
      const updated = {
        ...prev,
        [name]: newValue
      };
      
      return updated;
    });
  };

  const handleMenuToggle = (fieldName) => {
    setRecipe(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Handle ingredient selection
  const handleIngredientSelect = (e) => {
    const ingredientId = e.target.value;
    const ingredient = ingredients.find(i => i.id === parseInt(ingredientId));
    
    setSelectedIngredient({
      id: ingredient ? ingredient.id : '',
      quantity: '0',
      name: ingredient ? ingredient.name : '',
      unit: ingredient ? ingredient.unit : '',
      cost: ingredient ? ingredient.cost.toString() : '0'
    });
  };

  // Handle ingredient quantity change
  const handleQuantityChange = (e) => {
    const value = e.target.value;
    setSelectedIngredient(prev => ({
      ...prev,
      quantity: value || '0'
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
      overhead: value.toString()
    }));
  };

  // Add ingredient to recipe
  const addIngredientToRecipe = () => {
    if (!selectedIngredient.id) {
      showNotification('Please select an ingredient', 'error');
      return;
    }

    const quantity = parseFloat(selectedIngredient.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      showNotification('Please enter a valid quantity', 'error');
      return;
    }

    const existingIngredient = recipe.ingredients.find(i => i.id === selectedIngredient.id);
    if (existingIngredient) {
      showNotification('This ingredient is already added', 'error');
      return;
    }

    setRecipe(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          id: selectedIngredient.id,
          name: selectedIngredient.name,
          quantity: quantity,
          unit: selectedIngredient.unit,
          cost: parseFloat(selectedIngredient.cost)
        }
      ]
    }));

    // Reset selected ingredient
    setSelectedIngredient({
      id: '',
      quantity: '0',
      name: '',
      unit: '',
      cost: '0'
    });

    calculateMetrics();
  };

  // Remove ingredient from recipe
  const removeIngredient = (ingredientId) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i.id !== ingredientId)
    }));
    calculateMetrics();
  };

  const calculateMetrics = () => {
    try {
      // Get ingredient costs
      let totalIngredientCost = 0;
      recipe.ingredients.forEach(ing => {
        const ingredientInfo = ingredients.find(i => i.id === ing.id);
        if (ingredientInfo) {
          const cost = parseFloat(ingredientInfo.cost) || 0;
          const quantity = parseFloat(ing.quantity) || 0;
          totalIngredientCost += cost * quantity;
        }
      });

      // Parse numeric values with defaults
      const sellingPrice = parseFloat(recipe.selling_price) || 0;
      const monthlySales = parseInt(recipe.monthly_sales) || 0;
      const overheadPercent = parseFloat(recipe.overhead) || 10;

      // Calculate overhead amount
      const overheadAmount = (totalIngredientCost * (overheadPercent / 100));
      
      // Calculate total cost including overhead
      const totalCost = totalIngredientCost + overheadAmount;

      // Calculate other metrics
      const profitMargin = sellingPrice - totalCost;
      const monthlyRevenue = sellingPrice * monthlySales;
      const monthlyProfit = profitMargin * monthlySales;
      const markupFactor = totalCost > 0 ? (sellingPrice / totalCost) : 0;

      console.log('📊 Calculation details:', {
        totalIngredientCost,
        overheadAmount,
        totalCost,
        sellingPrice,
        profitMargin,
        monthlyRevenue,
        monthlyProfit,
        markupFactor
      });

      setRecipe(prev => ({
        ...prev,
        total_cost: totalCost.toString(),
        profit_margin: profitMargin.toString(),
        monthly_revenue: monthlyRevenue.toString(),
        monthly_profit: monthlyProfit.toString(),
        markup_factor: markupFactor.toString()
      }));
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  // Update calculations when ingredients or numeric values change
  useEffect(() => {
    if (recipe.ingredients.length > 0 || recipe.selling_price || recipe.monthly_sales) {
      calculateMetrics();
    }
  }, [recipe.ingredients, recipe.selling_price, recipe.monthly_sales, recipe.overhead, ingredients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!recipe.name || !recipe.category) {
        setError('Name and category are required');
        return;
      }

      // Ensure delivery packaging is preserved
      const submissionData = {
        name: recipe.name.trim(),
        category: recipe.category.trim(),
        description: recipe.description?.trim() || '',
        preparation_steps: recipe.preparation_steps?.trim() || '',
        cooking_method: recipe.cooking_method?.trim() || '',
        plating_instructions: recipe.plating_instructions?.trim() || '',
        chefs_notes: recipe.chefs_notes?.trim() || '',
        selling_price: parseFloat(recipe.selling_price) || 0,
        monthly_sales: parseInt(recipe.monthly_sales) || 0,
        overhead: parseFloat(recipe.overhead) || 10,
        total_cost: parseFloat(recipe.total_cost) || 0,
        profit_margin: parseFloat(recipe.profit_margin) || 0,
        monthly_revenue: parseFloat(recipe.monthly_revenue) || 0,
        monthly_profit: parseFloat(recipe.monthly_profit) || 0,
        markup_factor: parseFloat(recipe.markup_factor) || 0,
        print_menu_ready: recipe.print_menu_ready || false,
        qr_menu_ready: recipe.qr_menu_ready || false,
        website_menu_ready: recipe.website_menu_ready || false,
        available_for_delivery: recipe.available_for_delivery || false,
        delivery_image_url: recipe.delivery_image_url || '',
        ingredients: recipe.ingredients.map(ing => ({
          id: ing.id,
          quantity: parseFloat(ing.quantity) || 0
        }))
      };

      if (editingRecipe?.id) {
        submissionData.id = editingRecipe.id;
      }

      console.log('Submitting recipe:', submissionData);
      
      await onSubmit(submissionData);
      
    } catch (error) {
      console.error('Error submitting recipe:', error);
      setError('Failed to save recipe. Please try again.');
    }
  };

  const formatInLakhs = (value) => {
    const inLakhs = value / 100000;
    return `₹${inLakhs.toFixed(2)}L`;
  };

  const getMarkupFactorColor = (markupFactor) => {
    return markupFactor >= 4 ? '#059669' : '#dc2626';
  };

  const calculateIngredientCost = (ingredientId, quantity) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return 0;
    
    const cost = parseFloat(ingredient.cost) || 0;
    const qty = parseFloat(quantity) || 0;
    return cost * qty;
  };

  const formatCurrency = (amount) => {
    if (isNaN(amount)) return '₹0';
    return `₹${amount.toFixed(2)}`;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          // Compress image if needed
          const img = new Image();
          img.src = reader.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions while maintaining aspect ratio
            let width = img.width;
            let height = img.height;
            const maxDimension = 800;
            
            if (width > height && width > maxDimension) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else if (height > maxDimension) {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress image
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            setRecipe(prev => ({
              ...prev,
              delivery_image_url: compressedDataUrl
            }));
          };
        } catch (error) {
          console.error('Error processing image:', error);
          setError('Failed to process image. Please try again.');
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        setError('Failed to read image file. Please try again.');
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    if (editingRecipe) {
      setRecipe(editingRecipe);
    } else {
      setRecipe(initialRecipeState);
    }
    setError('');
  };

  return (
    <div className="recipe-form-container">
      <div className="page-title-container">
        <h1 className="page-title">
          {mode === 'view' ? 'Recipe Details' : editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
        </h1>
      </div>
      
      {error && (
        <div className="notification error">
          <span className="notification-icon">
            ❌
          </span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-section basic-info-section">
          <h3>Basic Information</h3>
          <div className="basic-info-grid">
            <input
              type="text"
              name="name"
              value={recipe.name || ''}
              onChange={handleInputChange}
              placeholder="Recipe Name"
              className="form-input"
              required
            />
            <select
              name="category"
              value={recipe.category || ''}
              onChange={handleInputChange}
              className="form-select"
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
                  value={recipe.overhead || '10'}
                  onChange={handleOverheadChange}
                  min="0"
                  max="20"
                  step="1"
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
                name="preparation_steps"
                value={recipe.preparation_steps || ''}
                onChange={handleInputChange}
                placeholder="List all preparation steps..."
                className="form-textarea"
              />
            </div>

            <div className="sop-content">
              <h4>👨‍🍳 Cooking Method</h4>
              <textarea
                name="cooking_method"
                value={recipe.cooking_method || ''}
                onChange={handleInputChange}
                placeholder="Describe the cooking method..."
                className="form-textarea"
              />
            </div>

            <div className="sop-content">
              <h4>🍽️ Plating Instructions</h4>
              <textarea
                name="plating_instructions"
                value={recipe.plating_instructions || ''}
                onChange={handleInputChange}
                placeholder="Describe plating presentation..."
                className="form-textarea"
              />
            </div>

            <div className="sop-content">
              <h4>📝 Chef's Notes</h4>
              <textarea
                name="chefs_notes"
                value={recipe.chefs_notes || ''}
                onChange={handleInputChange}
                placeholder="Additional notes or tips..."
                className="form-textarea"
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
              {ingredients.map(ingredient => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} ({ingredient.unit})
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
              onClick={addIngredientToRecipe}
              className="add-ingredient-btn"
            >
              Add
            </button>
          </div>

          <div className="ingredients-list">
            {recipe.ingredients.map((ingredient) => (
              <div key={ingredient.id} className="ingredient-row">
                <span className="ingredient-name">{ingredient.name}</span>
                <span className="ingredient-quantity">{ingredient.quantity} {ingredient.unit}</span>
                <span className="ingredient-cost">₹{(ingredient.cost * ingredient.quantity).toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => removeIngredient(ingredient.id)}
                  className="remove-btn"
                >
                  Remove
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
          <div className="form-section packaging-section">
            <h3>Delivery Image</h3>
            <div className="packaging-container">
              <div className="packaging-image-container">
                {recipe.delivery_image_url ? (
                  <div className="image-preview">
                    <img 
                      src={recipe.delivery_image_url} 
                      alt="Packaging" 
                      className="packaging-image"
                    />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => setRecipe(prev => ({
                        ...prev,
                        delivery_image_url: ''
                      }))}
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
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
                name="selling_price"
                value={recipe.selling_price || '0'}
                onChange={handleInputChange}
                placeholder="Selling Price (₹)"
                className="form-input"
                step="0.01"
                min="0"
              />
              <input
                type="number"
                name="monthly_sales"
                value={recipe.monthly_sales || '0'}
                onChange={handleInputChange}
                placeholder="Sales Volume"
                className="form-input"
                min="0"
              />
            </div>

            <div className="financial-summary">
              <div className="summary-item">
                <span>Total Cost</span>
                <span>₹{parseFloat(recipe.total_cost).toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span>Profit Margin</span>
                <span>{parseFloat(recipe.profit_margin).toFixed(2)}%</span>
              </div>
              <div className="summary-item">
                <span>Revenue</span>
                <span>{formatInLakhs(parseFloat(recipe.monthly_revenue))}</span>
              </div>
              <div className="summary-item">
                <span>Gross Profit</span>
                <span>{formatInLakhs(parseFloat(recipe.monthly_profit))}</span>
              </div>
              <div className="summary-item markup-factor" data-status={parseFloat(recipe.markup_factor) >= 4 ? 'good' : 'bad'}>
                <span>Markup Factor</span>
                <span>{parseFloat(recipe.markup_factor).toFixed(2)}x</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-btn"
          >
            {mode === 'edit' ? 'Update Recipe' : 'Create Recipe'}
          </button>
          
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="cancel-btn"
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
