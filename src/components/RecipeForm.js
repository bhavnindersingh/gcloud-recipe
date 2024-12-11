import React, { useState, useEffect } from 'react';
import { RECIPE_CATEGORIES } from '../constants/categories';
import '../styles/NewRecipeForm.css';
import { useNavigate } from 'react-router-dom';
import config from '../config/env';
import { createPortal } from 'react-dom';

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

// Image preview component
const ImagePreview = ({ url, onRemove, alt, isViewMode }) => {
  const [showEnlarged, setShowEnlarged] = useState(false);
  
  if (!url) return null;

  // Handle blob URLs, full URLs, and relative paths correctly
  const imageUrl = url.startsWith('blob:') || url.startsWith('http') ? url :
    `https://storage.googleapis.com/conscious-cafe-recipe-2024-uploads/${url}`;

  const handleImageClick = (e) => {
    e.stopPropagation();
    setShowEnlarged(true);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowEnlarged(false);
    }
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    setShowEnlarged(false);
  };

  const EnlargedView = () => (
    <div className="enlarged-image-overlay" onClick={handleOverlayClick}>
      <div className="enlarged-image-container">
        <img src={imageUrl} alt={alt} />
      </div>
      <button 
        className="close-enlarged-btn" 
        onClick={handleCloseClick}
        aria-label="Close enlarged view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  );

  return (
    <div className="image-preview-container">
      <img 
        src={imageUrl} 
        alt={alt} 
        style={{ cursor: 'pointer' }}
        onClick={handleImageClick}
        onError={(e) => {
          console.error('Image failed to load:', {
            originalUrl: imageUrl,
            error: e.error
          });
          // Only try alternative URL if it's not a blob URL
          if (!url.startsWith('blob:') && imageUrl.includes('conscious-cafe-recipe-2024-uploads')) {
            const assetUrl = `https://storage.googleapis.com/recipe.consciouscafe.in/${url.split('/').pop()}`;
            console.log('Trying Assets URL:', assetUrl);
            e.target.src = assetUrl;
          } else {
            e.target.src = '/placeholder-recipe.png';
          }
        }}
      />
      <div className="image-actions">
        <button 
          type="button" 
          className="image-action-btn fullscreen"
          onClick={handleImageClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
          </svg>
        </button>
        {!isViewMode && (
          <button 
            type="button" 
            className="image-action-btn remove" 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
      {showEnlarged && createPortal(<EnlargedView />, document.body)}
    </div>
  );
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
        delivery_image_preview: editingRecipe.delivery_image_url,
        ingredients: editingRecipe.ingredients || []
      };
    }
    return { ...emptyRecipe, ingredients: [] };
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
  const ingredientsLength = (recipe.ingredients || []).length;
  
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

  // Update preview when editing existing recipe
  useEffect(() => {
    if (editingRecipe) {
      setRecipe(prev => ({
        ...editingRecipe,
        image_preview: editingRecipe.image_url,
        delivery_image_preview: editingRecipe.delivery_image_url,
        ingredients: editingRecipe.ingredients || []
      }));
    }
  }, [editingRecipe]);

  const [imageFile, setImageFile] = useState(null);
  const [deliveryImageFile, setDeliveryImageFile] = useState(null);

  const handleImageChange = async (e, type = 'image') => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Create a temporary preview URL for the selected file
        const previewUrl = URL.createObjectURL(file);
        setRecipe(prev => ({
          ...prev,
          [type]: file,
          [`${type}_preview`]: previewUrl,
          // Keep the URL field empty until upload completes
          [`${type}_url`]: null
        }));

        if (type === 'image') {
          setImageFile(file);
        } else {
          setDeliveryImageFile(file);
        }
      } catch (error) {
        console.error('Error handling image change:', error);
      }
    }
  };

  const handleImageUpload = async (file, fieldName) => {
    if (!file) {
      console.log('No file provided for upload');
      return null;
    }

    console.log('Uploading file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const formData = new FormData();
    formData.append('image', file);

    try {
      console.log('Sending upload request to:', `${config.API_URL}/upload-to-storage`);
      const response = await fetch(`${config.API_URL}/upload-to-storage`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();
      console.log('Upload successful:', data);
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      setError({ message: error.message, type: 'error' });
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (mode === 'create') {
        if (!recipe.name?.trim()) {
          setError({ message: 'Recipe name is required', type: 'error' });
          return;
        }
        // Check for duplicate names only in create mode
        if (recipes) {
          const isDuplicate = recipes.some(
            existingRecipe => 
              existingRecipe.name.toLowerCase().trim() === recipe.name.toLowerCase().trim() &&
              existingRecipe.id !== recipe.id
          );
          if (isDuplicate) {
            setError({ message: 'A recipe with this name already exists', type: 'error' });
            return;
          }
        }
      }
      
      if (!recipe.category?.trim()) {
        setError({ message: 'Category is required', type: 'error' });
        return;
      }
      
      // Ensure ingredients array exists and has items
      const currentIngredients = recipe.ingredients || [];
      if (currentIngredients.length === 0) {
        setError({ message: 'At least one ingredient is required', type: 'error' });
        return;
      }

      // Handle image uploads only if there are new files
      let imageUrl = recipe.image_url;
      let deliveryImageUrl = recipe.delivery_image_url;

      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile, 'image');
        if (!imageUrl) return;
      }

      if (deliveryImageFile) {
        deliveryImageUrl = await handleImageUpload(deliveryImageFile, 'deliveryImage');
        if (!deliveryImageUrl) return;
      }

      // Prepare recipe data
      const recipeData = {
        ...recipe,
        category: recipe.category.trim(),
        preparation_steps: recipe.preparation_steps || '',
        cooking_method: recipe.cooking_method || '',
        plating_instructions: recipe.plating_instructions || '',
        chefs_notes: recipe.chefs_notes || '',
        selling_price: Number(recipe.selling_price) || 0,
        sales: Number(recipe.sales) || 0,
        overhead: Number(recipe.overhead) || 0,
        total_cost: Number(recipe.total_cost) || 0,
        profit_margin: Number(recipe.profit_margin) || 0,
        revenue: Number(recipe.revenue) || 0,
        profit: Number(recipe.profit) || 0,
        markup_factor: Number(recipe.markup_factor) || 0,
        print_menu_ready: Boolean(recipe.print_menu_ready),
        qr_menu_ready: Boolean(recipe.qr_menu_ready),
        website_menu_ready: Boolean(recipe.website_menu_ready),
        available_for_delivery: Boolean(recipe.available_for_delivery),
        image_url: imageUrl,
        delivery_image_url: deliveryImageUrl,
        ingredients: currentIngredients.map(ing => ({
          id: Number(ing.id),
          quantity: Number(ing.quantity)
        }))
      };

      // Call onSubmit with the prepared data
      if (onSubmit) {
        await onSubmit(recipeData, recipe.id);
      }

      // Show success message
      setError({ message: `Recipe ${mode === 'edit' ? 'updated' : 'created'} successfully`, type: 'success' });
      
      // Navigate back to manager after success
      navigate('/manager');
    } catch (err) {
      console.error('Error saving recipe:', err);
      setError({ message: err.message, type: 'error' });
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
    handleImageChange(e, 'delivery_image');
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

    // Validate ingredient selection
    if (!selectedIngredient.id) {
      setError({ message: 'Please select an ingredient', type: 'error' });
      return;
    }

    // Validate quantity
    const quantity = parseFloat(selectedIngredient.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError({ message: 'Please enter a valid quantity', type: 'error' });
      return;
    }

    // Find the selected ingredient from the ingredients list
    const selectedIng = ingredients.find(ing => ing.id === parseInt(selectedIngredient.id));
    if (!selectedIng) {
      setError({ message: 'Selected ingredient not found', type: 'error' });
      return;
    }

    const cost = parseFloat(selectedIng.cost) || 0;
    const totalCost = cost * quantity;

    // Ensure recipe.ingredients exists
    const currentIngredients = recipe.ingredients || [];
    
    // Check if ingredient already exists
    const existingIngredientIndex = currentIngredients.findIndex(ing => ing.id === parseInt(selectedIngredient.id));

    setRecipe(prev => {
      const updatedIngredients = [...(prev.ingredients || [])];
      
      if (existingIngredientIndex !== -1) {
        // Update existing ingredient
        updatedIngredients[existingIngredientIndex] = {
          ...updatedIngredients[existingIngredientIndex],
          quantity: (parseFloat(updatedIngredients[existingIngredientIndex].quantity) + quantity).toFixed(2),
          totalCost: (parseFloat(updatedIngredients[existingIngredientIndex].totalCost) + totalCost).toFixed(2)
        };
      } else {
        // Add new ingredient
        updatedIngredients.push({
          id: parseInt(selectedIngredient.id),
          name: selectedIng.name,
          unit: selectedIng.unit,
          cost: cost.toFixed(2),
          quantity: quantity.toFixed(2),
          totalCost: totalCost.toFixed(2)
        });
      }

      return {
        ...prev,
        ingredients: updatedIngredients
      };
    });

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
    // First, ensure recipe exists and has ingredients array
    if (!recipe || !recipe.ingredients) return;
    
    // Then, ensure all ingredients have proper totalCost
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
      return sum + parseFloat(ing.totalCost || 0);
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
        setError({ message: 'A recipe with this name already exists. Please use a different name.', type: 'error' });
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
                <ImagePreview url={recipe.image_preview || recipe.image_url} onRemove={handleRemoveImage} alt="Recipe preview" isViewMode={isViewMode} />
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
                {(recipe.ingredients || []).map((ing, index) => (
                  <tr key={ing.uniqueId || `${ing.id}-${Date.now()}-${index}`}>
                    <td className="ingredient-name">{ing.name}</td>
                    <td className="ingredient-quantity">{ing.quantity} {ing.unit}</td>
                    <td className="ingredient-cost">₹{parseFloat(ing.totalCost)}</td>
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

          {(recipe.ingredients || []).length > 0 && (
            <div className="ingredients-total">
              <span className="total-label">Total Ingredients Cost:</span>
              <span className="total-amount">
                ₹{(recipe.ingredients || []).reduce((sum, ing) => sum + parseFloat(ing.totalCost || 0), 0).toFixed(2)}
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
                  <ImagePreview url={recipe.delivery_image_preview || recipe.delivery_image_url} onRemove={handleRemoveDeliveryImage} alt="Delivery preview" isViewMode={isViewMode} />
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
