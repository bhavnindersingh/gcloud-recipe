import React, { useState, useMemo } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import '../styles/RecipeManager.css';

const SORT_FIELDS = {
  LATEST: 'created_at',
  SALES: 'monthly_sales',
  MARKUP: 'markup_factor',
  COGS: 'total_cost'
};

const RecipeManager = ({ recipes = [], onEditRecipe, onDeleteRecipe }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortConfig, setSortConfig] = useState({
    field: SORT_FIELDS.LATEST,
    direction: 'asc'
  });

  const categories = useMemo(() => {
    if (!Array.isArray(recipes)) return ['all'];
    const uniqueCategories = new Set(recipes.map(recipe => recipe?.category).filter(Boolean));
    return ['all', ...Array.from(uniqueCategories)];
  }, [recipes]);

  const handleSort = (field) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedRecipes = useMemo(() => {
    if (!Array.isArray(recipes)) return [];
    let filtered = recipes;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe?.name?.toLowerCase().includes(query) ||
        recipe?.description?.toLowerCase().includes(query) ||
        recipe?.ingredients?.some(ingredient => 
          ingredient?.name?.toLowerCase().includes(query) ||
          ingredient?.description?.toLowerCase().includes(query)
        )
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(recipe => recipe?.category === selectedCategory);
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      const aValue = sortConfig.field === SORT_FIELDS.LATEST 
        ? new Date(a?.[sortConfig.field] || 0)
        : parseFloat(a?.[sortConfig.field] || 0);
      const bValue = sortConfig.field === SORT_FIELDS.LATEST
        ? new Date(b?.[sortConfig.field] || 0)
        : parseFloat(b?.[sortConfig.field] || 0);

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }, [recipes, searchQuery, selectedCategory, sortConfig]);

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  return (
    <div className="recipe-manager">
      <div className="page-title-container">
        <div className="page-title">
          <h1>Recipe Manager</h1>
        </div>
      </div>

      <div className="control-card">
        <div className="control-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search recipes, common ingredients"
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
          <div className="separator"></div>
          <div className="sort-buttons">
            <button 
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.LATEST ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.LATEST)}
            >
              Latest {sortConfig.field === SORT_FIELDS.LATEST && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.COGS ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.COGS)}
            >
              COGS {sortConfig.field === SORT_FIELDS.COGS && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.SALES ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.SALES)}
            >
              Sales {sortConfig.field === SORT_FIELDS.SALES && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.MARKUP ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.MARKUP)}
            >
              Markup {sortConfig.field === SORT_FIELDS.MARKUP && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      <div className="recipe-count">
        Showing {filteredAndSortedRecipes.length} of {recipes.length} recipes
      </div>

      <div className="recipe-grid">
        {filteredAndSortedRecipes.map(recipe => (
          <div key={recipe.id} className="recipe-card">
            <div className="recipe-status">
              {(
                recipe.name &&
                recipe.category &&
                recipe.selling_price &&
                recipe.total_cost &&
                recipe.monthly_sales &&
                recipe.markup_factor &&
                recipe.ingredients &&
                recipe.ingredients.length > 0 &&
                recipe.print_menu_ready === true &&
                recipe.qr_menu_ready === true &&
                recipe.website_menu_ready === true
              ) ? (
                <FaCheckCircle className="status-icon success" title="Recipe complete and available in all menus" />
              ) : (
                <FaTimesCircle className="status-icon error" title="Incomplete recipe or not available in all menus" />
              )}
            </div>
            <div className="recipe-card-header">
              <span className="recipe-category">{recipe.category || 'Uncategorized'}</span>
            </div>
            <h3 className="recipe-title">{recipe.name}</h3>
            
            <div className="recipe-metrics">
              <div className="metric">
                <span className="metric-label">Selling Price:</span>
                <span className="metric-value">₹{parseFloat(recipe.selling_price || 0).toFixed(2)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Monthly Sales:</span>
                <span className="metric-value">{recipe.monthly_sales || 0}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Markup Factor:</span>
                <span className={`metric-value ${parseFloat(recipe.markup_factor || 0) >= 4 ? 'markup-good' : 'markup-bad'}`}>
                  {parseFloat(recipe.markup_factor || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="recipe-ingredients">
              <span className="ingredients-count">
                {recipe.ingredients?.length || 0} ingredients, Rs {parseFloat(recipe.total_cost || 0).toFixed(2)}
              </span>
            </div>

            <div className="recipe-actions">
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
