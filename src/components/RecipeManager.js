import React, { useState, useMemo } from 'react';
import { FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaEye } from 'react-icons/fa';
import { RECIPE_CATEGORIES } from '../constants/categories';
import '../styles/RecipeManager.css';

const SORT_FIELDS = {
  LATEST: 'updated_at',
  SALES: 'sales',
  MARKUP: 'markup_factor',
  COGS: 'total_cost'
};

const RecipeManager = ({ recipes = [], onEditRecipe, onDeleteRecipe, onViewRecipe }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPending, setShowPending] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    field: SORT_FIELDS.LATEST,
    direction: 'desc'
  });

  const categories = useMemo(() => {
    return ['all', ...RECIPE_CATEGORIES];
  }, []);

  const handleSort = (field) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const pendingCount = useMemo(() => {
    return recipes.filter(recipe => 
      !recipe.print_menu_ready || 
      !recipe.qr_menu_ready || 
      !recipe.website_menu_ready
    ).length;
  }, [recipes]);

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

    // Apply pending filter
    if (showPending) {
      filtered = filtered.filter(recipe => 
        !recipe.print_menu_ready || 
        !recipe.qr_menu_ready || 
        !recipe.website_menu_ready
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.field) {
        case SORT_FIELDS.LATEST:
          // Use updated_at if available, fall back to created_at
          aValue = new Date(a?.updated_at || a?.created_at || 0).getTime();
          bValue = new Date(b?.updated_at || b?.created_at || 0).getTime();
          break;
        case SORT_FIELDS.SALES:
          aValue = parseInt(a?.sales || 0);
          bValue = parseInt(b?.sales || 0);
          break;
        case SORT_FIELDS.MARKUP:
          aValue = parseFloat(a?.markup_factor || 0);
          bValue = parseFloat(b?.markup_factor || 0);
          break;
        case SORT_FIELDS.COGS:
          aValue = parseFloat(a?.total_cost || 0);
          bValue = parseFloat(b?.total_cost || 0);
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'desc') {
        return bValue - aValue;  
      }
      return aValue - bValue;  
    });
  }, [recipes, searchQuery, selectedCategory, showPending, sortConfig]);

  return (
    <div className="recipe-manager">
      <div className="page-title-card">
        <h1 className="page-title">Recipe Manager</h1>
        <div className="recipe-stats">
          <span className="pending-count">
            {pendingCount} Pending
          </span>
        </div>
      </div>

      <div className="recipe-header">
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
          </div>
          <div className="filter-section">
            <button
              className={`filter-btn ${showPending ? 'active' : ''}`}
              onClick={() => setShowPending(!showPending)}
            >
              Show Pending ({pendingCount})
            </button>
            <button 
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.LATEST ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.LATEST)}
            >
              Latest {sortConfig.field === SORT_FIELDS.LATEST && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
            <button 
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.COGS ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.COGS)}
            >
              COGS {sortConfig.field === SORT_FIELDS.COGS && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
            <button 
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.SALES ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.SALES)}
            >
              Sales {sortConfig.field === SORT_FIELDS.SALES && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
            <button 
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.MARKUP ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.MARKUP)}
            >
              Markup {sortConfig.field === SORT_FIELDS.MARKUP && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>

        <div className="recipe-count">
          Showing {filteredAndSortedRecipes.length} of {recipes.length} recipes
        </div>

        <div className="recipe-grid">
          {filteredAndSortedRecipes.map(recipe => (
            <div key={recipe.id} className="recipe-card">
              <span className="category-tag" data-category={recipe.category}>{recipe.category}</span>
              <div className="recipe-card-header">
                <h3 className="recipe-name">
                  {recipe.name}
                  {(
                    recipe.name &&
                    recipe.category &&
                    recipe.selling_price &&
                    recipe.total_cost &&
                    recipe.sales &&
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
                </h3>
              </div>
              
              <div className="recipe-metrics">
                <div className="metric">
                  <span className="metric-label">Selling Price:</span>
                  <span className="metric-value">₹{Math.round(parseFloat(recipe.selling_price || 0))}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Sales (Units):</span>
                  <span className="metric-value">{recipe.sales || 0}</span>
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
                <div className="left-actions">
                  <button 
                    className="action-button view"
                    onClick={() => {
                      const recipeToView = recipes.find(r => r.id === recipe.id);
                      if (recipeToView) {
                        onViewRecipe(recipeToView);
                      }
                    }}
                    title="View recipe details"
                  >
                    <FaEye />
                  </button>
                </div>
                <div className="right-actions">
                  <button 
                    className="action-button edit"
                    onClick={() => onEditRecipe(recipe)}
                    title="Edit recipe"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="action-button delete"
                    onClick={() => {
                      const confirmDelete = window.confirm('Are you sure you want to delete this recipe?');
                      if (confirmDelete) {
                        onDeleteRecipe(recipe.id);
                      }
                    }}
                    title="Delete recipe"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecipeManager;
