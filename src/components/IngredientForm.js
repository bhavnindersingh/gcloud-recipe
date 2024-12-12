import React, { useState } from 'react';
import { INGREDIENT_CATEGORIES, INGREDIENT_UNITS } from '../constants/ingredientCategories';
import '../styles/shared.css';
import '../styles/IngredientsManager.css';

const IngredientForm = ({ 
  ingredient, 
  onChange, 
  onSubmit, 
  isEditing = false,
  error: externalError,
  clearError,
  existingIngredients = [],
  onSelectExisting
}) => {
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const validateIngredient = () => {
    const errors = {};
    
    // Name validation
    if (!ingredient.name || ingredient.name.trim().length === 0) {
      errors.name = 'Name is required';
    } else if (ingredient.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else {
      // Check for duplicate names:
      // 1. First trim and convert to lowercase for consistent comparison
      const normalizedName = ingredient.name.trim().toLowerCase();
      
      // 2. Check against all existing ingredients
      const isDuplicate = existingIngredients.some(existing => {
        const existingNormalizedName = existing.name.trim().toLowerCase();
        
        // When editing (isEditing = true):
        // - Allow the current ingredient to keep its name (existing.id === ingredient.id)
        // - Prevent using names of other ingredients
        
        // When adding new (isEditing = false):
        // - Prevent using any existing ingredient name
        
        return existingNormalizedName === normalizedName && 
               (!isEditing || existing.id !== ingredient.id);
      });

      if (isDuplicate) {
        errors.name = 'An ingredient with this name already exists';
      }
    }

    // Unit validation
    if (!ingredient.unit || ingredient.unit.trim().length === 0) {
      errors.unit = 'Unit is required';
    } else if (!INGREDIENT_UNITS.includes(ingredient.unit)) {
      errors.unit = 'Please select a valid unit';
    }

    // Cost validation
    const cost = parseFloat(ingredient.cost);
    if (!ingredient.cost || ingredient.cost.trim().length === 0) {
      errors.cost = 'Cost is required';
    } else if (isNaN(cost) || cost <= 0) {
      errors.cost = 'Cost must be a positive number';
    } else if (cost > 100000) { // 1 lakh limit
      errors.cost = 'Cost cannot exceed ₹1,00,000';
    }

    // Category validation
    if (!ingredient.category || ingredient.category.trim().length === 0) {
      errors.category = 'Category is required';
    } else if (!INGREDIENT_CATEGORIES.includes(ingredient.category)) {
      errors.category = 'Please select a valid category';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateSuggestions = (value) => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    
    const normalizedInput = value.toLowerCase().trim();
    const matches = existingIngredients.filter(ing => 
      ing.name.toLowerCase().includes(normalizedInput) &&
      ing.name.toLowerCase() !== normalizedInput // Don't suggest exact matches
    ).slice(0, 5); // Limit to 5 suggestions
    
    setSuggestions(matches);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (externalError && clearError) {
      clearError();
    }

    // Update suggestions if it's the name field
    if (name === 'name') {
      updateSuggestions(value);
      setShowSuggestions(true);
    }

    onChange({ ...ingredient, [name]: value });
  };

  const handleSuggestionClick = (suggestion) => {
    if (onSelectExisting) {
      onSelectExisting(suggestion);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateIngredient()) {
      onSubmit(e);
    }
  };

  const getErrorMessage = (field) => {
    return validationErrors[field] || (externalError && externalError.field === field ? externalError.message : '');
  };

  return (
    <form onSubmit={handleSubmit} className="ingredient-form">
      <div className="form-group">
        <label htmlFor="name">Name:</label>
        <div className="search-input-container">
          <input
            type="text"
            id="name"
            name="name"
            value={ingredient.name}
            onChange={handleChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className={getErrorMessage('name') ? 'error' : ''}
            placeholder="Enter ingredient name"
            disabled={isEditing}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && !isEditing && (
            <div className="suggestions-dropdown">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.name}
                </div>
              ))}
            </div>
          )}
        </div>
        {getErrorMessage('name') && (
          <span className="error-message">{getErrorMessage('name')}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="unit">Unit *</label>
        <select
          id="unit"
          name="unit"
          value={ingredient.unit}
          onChange={handleChange}
          disabled={isEditing}
          className={getErrorMessage('unit') ? 'error' : ''}
        >
          <option value="">Select unit</option>
          {INGREDIENT_UNITS.map(unit => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        {getErrorMessage('unit') && (
          <span className="error-message">{getErrorMessage('unit')}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="cost">Cost (₹) *</label>
        <input
          type="number"
          id="cost"
          name="cost"
          value={ingredient.cost}
          onChange={handleChange}
          placeholder="Enter cost"
          step="0.01"
          min="0"
          max="100000"
          className={getErrorMessage('cost') ? 'error' : ''}
        />
        {getErrorMessage('cost') && (
          <span className="error-message">{getErrorMessage('cost')}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="category">Category *</label>
        <select
          id="category"
          name="category"
          value={ingredient.category}
          onChange={handleChange}
          className={getErrorMessage('category') ? 'error' : ''}
        >
          <option value="">Select category</option>
          {INGREDIENT_CATEGORIES.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {getErrorMessage('category') && (
          <span className="error-message">{getErrorMessage('category')}</span>
        )}
      </div>

      <button 
        type="submit" 
        className="btn btn-primary"
        disabled={Object.keys(validationErrors).length > 0}
      >
        {isEditing ? 'Update Ingredient' : 'Add Ingredient'}
      </button>
    </form>
  );
};

export default IngredientForm;
