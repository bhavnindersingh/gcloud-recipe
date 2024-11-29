import React, { useState, useMemo, useEffect } from 'react';
import { RECIPE_CATEGORIES } from '../data/sampleData';
import '../styles/RecipeList.css';

const ITEMS_PER_PAGE = 10;

const RecipeList = ({ recipes = [], ingredients = [], onEditRecipe, onDeleteRecipe, setRecipes, selectedCategory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryState, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [expandedRecipes, setExpandedRecipes] = useState(new Set());

  // Calculate completed and pending counts
  const completedCount = recipes.filter(r => r.ingredients && r.ingredients.length > 0).length;
  const pendingCount = recipes.length - completedCount;

  const handleDeleteRecipe = (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      onDeleteRecipe(recipeId);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '₹0.00';
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toFixed(2)}`;
  };

  const convertToLakhs = (value) => {
    const inLakhs = value / 100000;
    return `₹${inLakhs.toFixed(2)}L`;
  };

  const formatProfitMargin = (cost, price) => {
    const margin = ((price - cost) / price) * 100;
    return `${margin.toFixed(1)}%`;
  };

  const formatInLakhs = (value) => {
    const inLakhs = value / 100000;
    return `₹${inLakhs.toFixed(2)}L`;
  };

  const toggleRecipeExpand = (id) => {
    setExpandedRecipes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const calculateMetrics = (recipe) => {
    const totalCost = recipe.ingredients.reduce((sum, ingredient) => {
      return sum + (ingredient.cost * ingredient.quantity);
    }, 0);

    const sellingPrice = parseFloat(recipe.sellingPrice || 0);
    const quarterlySales = parseFloat(recipe.quarterlySales || 0);
    const profitMargin = sellingPrice ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;
    const quarterlyRevenue = sellingPrice * quarterlySales;
    const quarterlyProfit = (sellingPrice - totalCost) * quarterlySales;

    return {
      totalCost,
      profitMargin,
      quarterlyRevenue,
      quarterlyProfit
    };
  };

  // Filter and sort recipes
  const filteredAndSortedRecipes = useMemo(() => {
    return recipes
      .filter(recipe => {
        if (!recipe) return false;
        const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            recipe.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategoryState === 'all' || recipe.category === selectedCategoryState;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (!a || !b) return 0;
        let compareA, compareB;
        switch (sortBy) {
          case 'profitMargin':
            compareA = ((a.sellingPrice - a.totalCost) / a.sellingPrice) * 100;
            compareB = ((b.sellingPrice - b.totalCost) / b.sellingPrice) * 100;
            break;
          case 'status':
            compareA = a.ingredients && a.ingredients.length > 0 ? 1 : 0;
            compareB = b.ingredients && b.ingredients.length > 0 ? 1 : 0;
            break;
          case 'quarterlySales':
            compareA = parseFloat(a.quarterlySales || 0);
            compareB = parseFloat(b.quarterlySales || 0);
            break;
          default:
            compareA = a.name.toLowerCase();
            compareB = b.name.toLowerCase();
        }
        return sortOrder === 'asc' 
          ? compareA > compareB ? 1 : -1
          : compareA < compareB ? 1 : -1;
      });
  }, [recipes, searchTerm, selectedCategoryState, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRecipes.length / ITEMS_PER_PAGE);
  const paginatedRecipes = filteredAndSortedRecipes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedRecipes(new Set());
  };

  if (!recipes || recipes.length === 0) {
    return (
      <div className="recipe-list-container">
        <div className="glass-card text-center text-secondary p-4">
          No recipes created yet. Create your first recipe to get started!
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-list-container">
      <div className="recipe-controls">
        <div className="search-and-filter">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
          <select
            value={selectedCategoryState}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="category-select"
          >
            <option value="all">All Categories</option>
            {RECIPE_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="sort-controls">
          <button 
            onClick={() => handleSort('name')}
            className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
          >
            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            onClick={() => handleSort('profitMargin')}
            className={`sort-button ${sortBy === 'profitMargin' ? 'active' : ''}`}
          >
            Gross Profit Margin {sortBy === 'profitMargin' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            onClick={() => handleSort('status')}
            className={`sort-button ${sortBy === 'status' ? 'active' : ''}`}
          >
            Status (✓{completedCount} ⚠️{pendingCount}) {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            onClick={() => handleSort('quarterlySales')}
            className={`sort-button ${sortBy === 'quarterlySales' ? 'active' : ''}`}
          >
            Quarterly Sales {sortBy === 'quarterlySales' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      <div className="recipes-summary">
        <p>Showing {paginatedRecipes.length} of {filteredAndSortedRecipes.length} recipes</p>
      </div>

      <div className="recipe-grid">
        {paginatedRecipes.map(recipe => {
          if (!recipe) return null;
          const isExpanded = expandedRecipes.has(recipe.id);
          const metrics = calculateMetrics(recipe);
          
          return (
            <div key={recipe.id} className="recipe-card glass-card">
              <div 
                className={`recipe-status ${recipe.ingredients && recipe.ingredients.length > 0 ? 'completed' : 'pending'}`}
                title={`${recipe.ingredients && recipe.ingredients.length > 0 ? 'Recipe Complete' : 'Ingredients Needed'}`}
              />
              
              <div className="recipe-category">
                <span>{recipe.category || 'Uncategorized'}</span>
              </div>
              
              <div className="recipe-header">
                <h3 className="recipe-title">{recipe.name}</h3>
                <p className="recipe-description">{recipe.description}</p>
              </div>

              {isExpanded && (
                <div className="recipe-details">
                  <div className="ingredients-section">
                    <h4>Ingredients</h4>
                    <div className="ingredients-list">
                      {(recipe.ingredients || []).map((ingredient, index) => {
                        const cost = parseFloat(ingredient.cost || 0);
                        const quantity = parseFloat(ingredient.quantity || 0);
                        const totalCost = cost * quantity;
                        
                        return (
                          <div key={index} className="ingredient-item">
                            <span className="ingredient-name">{ingredient.name}</span>
                            <span className="ingredient-quantity">
                              {ingredient.quantity} {ingredient.unit}
                            </span>
                            <span className="ingredient-cost">
                              ₹{totalCost.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="metrics-section">
                    <h4>Financial Metrics</h4>
                    <div className="metrics-grid">
                      <div className="metric-item">
                        <label>Cost Per Unit</label>
                        <span>₹{metrics.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="metric-item">
                        <label>Selling Price</label>
                        <span>₹{parseFloat(recipe.sellingPrice || 0).toFixed(2)}</span>
                      </div>
                      <div className="metric-item highlight">
                        <label>Profit Margin</label>
                        <span>{metrics.profitMargin.toFixed(1)}%</span>
                      </div>
                      <div className="metric-item">
                        <label>Quarterly Sales</label>
                        <span>{parseInt(recipe.quarterlySales || 0)} units</span>
                      </div>
                      <div className="metric-item">
                        <label>Quarterly Revenue</label>
                        <span>{formatInLakhs(metrics.quarterlyRevenue)}</span>
                      </div>
                      <div className="metric-item highlight">
                        <label>Gross Profit</label>
                        <span>{formatInLakhs(metrics.quarterlyProfit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="recipe-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => toggleRecipeExpand(recipe.id)}
                >
                  {isExpanded ? 'Show Less' : 'Show More'}
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => onEditRecipe(recipe)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteRecipe(recipe.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => handlePageChange(i + 1)}
              className={currentPage === i + 1 ? 'active' : ''}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default RecipeList;
