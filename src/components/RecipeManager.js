import React, { useState, useMemo } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaEye } from 'react-icons/fa';
import '../styles/RecipeManager.css';

const SORT_FIELDS = {
  NAME: 'name'
};

const RecipeManager = ({ recipes, onEditRecipe, onDeleteRecipe, onViewRecipe }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortConfig, setSortConfig] = useState({
    field: SORT_FIELDS.NAME,
    direction: 'asc'
  });

  const categories = useMemo(() => {
    const uniqueCategories = new Set(recipes.map(recipe => recipe.category));
    return ['all', ...Array.from(uniqueCategories)];
  }, [recipes]);

  const handleSort = (field) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedRecipes = useMemo(() => {
    let filtered = recipes;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(recipe => recipe.category === selectedCategory);
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortConfig.direction === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    });
  }, [recipes, searchQuery, selectedCategory, sortConfig]);

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  return (
    <div className="recipe-manager">
      <div className="recipe-header">
        <div className="recipe-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <select
            className="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>

          <button
            className={`sort-button ${sortConfig.field === SORT_FIELDS.NAME ? 'active' : ''}`}
            onClick={() => handleSort(SORT_FIELDS.NAME)}
          >
            Name {getSortIcon(SORT_FIELDS.NAME)}
          </button>
        </div>
      </div>

      <div className="recipe-count">
        Showing {filteredAndSortedRecipes.length} of {recipes.length} recipes
      </div>

      <div className="recipe-list">
        {filteredAndSortedRecipes.map(recipe => (
          <div key={recipe.id} className="recipe-card">
            <span className="recipe-category">{recipe.category || 'Uncategorized'}</span>
            
            <div className="recipe-header">
              <div className="recipe-title-row">
                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                  <FaCheckCircle className="status-icon success" title="Ingredients added" />
                ) : (
                  <FaTimesCircle className="status-icon error" title="No ingredients" />
                )}
                <h3 className="recipe-title">{recipe.name}</h3>
              </div>
              <p className="recipe-description">{recipe.description}</p>
            </div>

            <div className="recipe-actions">
              <button 
                className="action-button view"
                onClick={() => onViewRecipe(recipe)}
                title="View recipe"
              >
                <FaEye />
              </button>
              <button 
                className="action-button edit"
                onClick={() => onEditRecipe(recipe)}
                title="Edit recipe"
              >
                <FaEdit />
              </button>
              <button 
                className="action-button delete"
                onClick={() => onDeleteRecipe(recipe.id)}
                title="Delete recipe"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecipeManager;
