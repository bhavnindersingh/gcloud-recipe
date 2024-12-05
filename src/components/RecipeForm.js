import React, { useState, useEffect } from 'react';
import '../styles/shared.css';
import '../styles/NewRecipeForm.css';

const RecipeForm = ({ ingredients, onSubmit, editingRecipe, onCancel, mode = 'create', initialRecipe }) => {
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
    updated_at: null,

    // Image
    image: null,
    image_preview: null,
    image_url: null,

    // Delivery Image
    delivery_image: null,
    delivery_image_preview: null,
    delivery_image_url: null
  };

  const [recipe, setRecipe] = useState(initialRecipeState);

  // Initialize recipe state safely
  useEffect(() => {
    if (initialRecipe) {
      setRecipe(prev => ({
        ...prev,
        ...initialRecipe,
        ingredients: Array.isArray(initialRecipe.ingredients) ? initialRecipe.ingredients : [],
        image: null,
        image_preview: initialRecipe.image_url || null,
        image_url: initialRecipe.image_url || null
      }));
    }
  }, [initialRecipe]);

  // Initialize recipe state from editingRecipe if available
  useEffect(() => {
    if (editingRecipe) {
      setRecipe(prev => ({
        ...prev,
        ...editingRecipe,
        image_url: editingRecipe.image_url,
        image: null,
        image_preview: null
      }));
    }
  }, [editingRecipe]);

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
    
    setRecipe(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setRecipe(prev => ({
        ...prev,
        image: file,
        image_preview: previewUrl
      }));
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setRecipe(prev => ({
      ...prev,
      image: null,
      image_preview: null,
      image_url: null
    }));
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Handle delivery image upload
  const handleDeliveryImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      console.log('Created preview URL:', previewUrl);
      
      setRecipe(prev => {
        const updated = {
          ...prev,
          delivery_image: file,
          delivery_image_preview: previewUrl
        };
        console.log('Updated recipe state:', updated);
        return updated;
      });
    }
  };

  // Handle delivery image removal
  const handleRemoveDeliveryImage = () => {
    // Revoke old preview URL to prevent memory leaks
    if (recipe.delivery_image_preview) {
      URL.revokeObjectURL(recipe.delivery_image_preview);
    }

    setRecipe(prev => ({
      ...prev,
      delivery_image: null,
      delivery_image_preview: null,
      delivery_image_url: null
    }));
    
    // Reset file input
    const fileInput = document.querySelector('input[name="delivery_image"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Image upload section JSX
  const renderImageUpload = () => {
    const hasImage = recipe.image_preview || recipe.image_url;
    
    return (
      <div className="form-group">
        <label>Recipe Image</label>
        <div className="image-upload-container">
          {hasImage ? (
            <div className="image-preview-container">
              <img 
                src={recipe.image_preview || recipe.image_url} 
                alt="Recipe preview" 
                className="image-preview"
              />
              <button 
                type="button" 
                onClick={handleRemoveImage}
                className="remove-image-btn"
              >
                Remove Image
              </button>
            </div>
          ) : (
            <div className="file-input-container">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="form-control"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Delivery image upload section JSX
  const renderDeliveryImageUpload = () => {
    const hasImage = recipe.delivery_image_preview || recipe.delivery_image_url;
    
    return (
      <div className="form-group">
        <label>Delivery Image</label>
        <div className="image-upload-container">
          {hasImage ? (
            <div className="image-preview-container">
              <img 
                src={recipe.delivery_image_preview || recipe.delivery_image_url} 
                alt="Delivery preview" 
                className="image-preview"
                style={{ maxWidth: '200px', marginTop: '10px' }}
              />
              <button 
                type="button" 
                onClick={handleRemoveDeliveryImage}
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
                onChange={handleDeliveryImageChange}
                className="form-control"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Validate required fields
      if (!recipe.name?.trim()) {
        setError('Recipe name is required');
        return;
      }

      if (!recipe.category?.trim()) {
        setError('Category is required');
        return;
      }

      const formData = new FormData();
      
      // Add all recipe fields to formData
      Object.keys(recipe).forEach(key => {
        if (key === 'ingredients') {
          // Ensure ingredients is an array and convert to JSON string
          const ingredients = Array.isArray(recipe[key]) ? recipe[key] : [];
          formData.append(key, JSON.stringify(ingredients));
        } else if (key === 'image' && recipe.image instanceof File) {
          formData.append('image', recipe.image);
        } else if (key === 'delivery_image' && recipe.delivery_image instanceof File) {
          formData.append('delivery_image', recipe.delivery_image);
        } else if (!['image_preview', 'image_url', 'delivery_image_preview', 'delivery_image_url'].includes(key)) {
          // For all other fields, ensure we don't send undefined or null values
          const value = recipe[key];
          if (value !== null && value !== undefined) {
            // For boolean values, explicitly convert to string
            if (typeof value === 'boolean') {
              formData.append(key, value.toString());
            } else if (typeof value === 'string') {
              // For string values, trim and only append if not empty
              const trimmedValue = value.trim();
              if (trimmedValue) {
                formData.append(key, trimmedValue);
              }
            } else {
              formData.append(key, value.toString());
            }
          }
        }
      });

      // Log formData contents for debugging
      for (let [key, value] of formData.entries()) {
        console.log(`FormData: ${key} = ${value}`);
      }

      await onSubmit(formData);
      
    } catch (error) {
      console.error('Error submitting recipe:', error);
      setError(error.message || 'Failed to save recipe. Please try again.');
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

  const handleReset = () => {
    if (editingRecipe) {
      setRecipe(editingRecipe);
    } else {
      setRecipe(initialRecipeState);
    }
    setError('');
  };

  const renderBasicInformation = () => (
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
        {renderImageUpload()}
      </div>
    </div>
  );

  const renderMenuAvailability = () => (
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
  );

  const renderDeliveryImageSection = () => (
    recipe.available_for_delivery && (
      <div className="form-section delivery-image-section">
        <h3>Delivery Image</h3>
        {renderDeliveryImageUpload()}
      </div>
    )
  );

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
        {renderBasicInformation()}
        {renderMenuAvailability()}
        {renderDeliveryImageSection()}
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
