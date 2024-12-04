import React, { useState, useMemo, useEffect } from 'react';
import '../styles/RecipeList.css';

// Define categories here instead of importing
const RECIPE_CATEGORIES = ['Food', 'Bakery', 'Beverages'];
const ITEMS_PER_PAGE = 10;

const RecipeList = ({ 
  recipes = [], 
  ingredients = [], 
  onEdit, 
  onDeleteRecipe, 
  setRecipes, 
  selectedCategory 
}) => {
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
    // Convert to number and handle invalid values
    const numValue = Number(value);
    if (!numValue || isNaN(numValue)) return '₹0.00';
    if (numValue >= 100000) {
      return `₹${(numValue / 100000).toFixed(2)}L`;
    }
    return `₹${numValue.toFixed(2)}`;
  };

  const convertToLakhs = (value) => {
    const numValue = Number(value);
    if (!numValue || isNaN(numValue)) return '₹0.00L';
    const inLakhs = numValue / 100000;
    return `₹${inLakhs.toFixed(2)}L`;
  };

  const formatProfitMargin = (cost, price) => {
    const numCost = Number(cost);
    const numPrice = Number(price);
    if (!numPrice || isNaN(numPrice) || !numCost || isNaN(numCost)) return '0.0%';
    const margin = ((numPrice - numCost) / numPrice) * 100;
    return `${margin.toFixed(1)}%`;
  };

  const formatInLakhs = (value) => {
    const numValue = Number(value);
    if (!numValue || isNaN(numValue)) return '₹0.00L';
    const inLakhs = numValue / 100000;
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
    // Calculate sum of ingredients cost
    const ingredientsCost = recipe.ingredients.reduce((total, ing) => {
      const ingredient = ingredients.find(i => i.id === ing.id);
      return total + (ingredient ? ingredient.cost * ing.quantity : 0);
    }, 0);

    // Calculate COGS with overhead
    const overhead = recipe.overhead || 10; // default 10% if not specified
    const cogs = ingredientsCost + (ingredientsCost * (overhead / 100));
    
    // Other calculations
    const mrp = recipe.sellingPrice || 0;
    const sales = recipe.sales || 0;
    const revenue = sales * mrp;

    return {
      cogs: formatCurrency(cogs),
      mrp: formatCurrency(mrp),
      sales: sales,
      revenue: formatCurrency(revenue)
    };
  };

  const isRecipeComplete = (recipe) => {
    return recipe.ingredients && recipe.ingredients.length > 0;
  };

  // Filter and sort recipes
  const filteredAndSortedRecipes = useMemo(() => {
    return recipes
      .filter(recipe => {
        if (!recipe) return false;
        const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (recipe.chefs_notes && recipe.chefs_notes.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategoryState === 'all' || recipe.category === selectedCategoryState;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (!a || !b) return 0;
        let compareA, compareB;
        switch (sortBy) {
          case 'profitMargin':
            compareA = ((a.selling_price - a.totalCost) / a.selling_price) * 100;
            compareB = ((b.selling_price - b.totalCost) / b.selling_price) * 100;
            break;
          case 'status':
            compareA = a.ingredients && a.ingredients.length > 0 ? 1 : 0;
            compareB = b.ingredients && b.ingredients.length > 0 ? 1 : 0;
            break;
          case 'quarterlySales':
            compareA = parseFloat(a.monthly_sales || 0);
            compareB = parseFloat(b.monthly_sales || 0);
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
      <div className="recipe-manager-container">
        <div className="page-title-container">
          <h1 className="page-title">
            Recipe Manager
            <div className="recipe-stats">
              <div className="stat-item">
                <span className="stat-label">Completed</span>
                <span className="stat-value">{completedCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{pendingCount}</span>
              </div>
            </div>
          </h1>
        </div>
        <div className="recipe-list-container">
          <div className="glass-card text-center text-secondary p-4">
            No recipes created yet. Create your first recipe to get started!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-manager-container">
      <div className="page-title-container">
        <h1 className="page-title">
          Recipe Manager
          <div className="recipe-stats">
            <div className="stat-item">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{completedCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{pendingCount}</span>
            </div>
          </div>
        </h1>
      </div>
      <div className="recipe-list-container">
        <div className="filter-search-card">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="recipe-counts">
              <span>✓ {completedCount}</span>
              <span>⚠️ {pendingCount}</span>
            </div>
          </div>

          <div className="filter-section">
            <button
              className={`filter-button ${selectedCategoryState === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            {RECIPE_CATEGORIES.map(category => (
              <button
                key={category}
                className={`filter-button ${selectedCategoryState === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
            <div className="sort-section">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="name">Name</option>
                <option value="category">Category</option>
                <option value="sales">Sales</option>
                <option value="profit">Profit</option>
              </select>
              <button
                className="filter-button"
                onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <div className="recipe-list">
          {paginatedRecipes.map(recipe => {
            if (!recipe) return null;
            const metrics = calculateMetrics(recipe);
            const isExpanded = expandedRecipes.has(recipe.id);
            
            return (
              <div className="recipe-card" key={recipe.id}>
                <div className="recipe-category">{recipe.category}</div>
                <div className="recipe-header">
                  <h3 className="recipe-title">{recipe.name}</h3>
                </div>

                {/* Status Indicator - Mid Right */}
                {isRecipeComplete(recipe) && (
                  <div className="status-indicator">✓</div>
                )}

                {/* Multiplying Factor - Center */}
                <div className={`multiplier ${metrics.isGoodFactor ? 'good' : 'bad'}`}>
                  {metrics.multiplyingFactor}x
                </div>

                <div className="recipe-actions">
                  <button 
                    className="action-button edit"
                    onClick={() => {
                      console.log('Editing recipe from list:', recipe); // Debug log
                      onEdit(recipe);
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className="action-button delete"
                    onClick={() => handleDeleteRecipe(recipe.id)}
                  >
                    Delete
                  </button>
                </div>

                {isExpanded && (
                  <div className="expanded-metrics">
                    <div className="metrics-grid">
                      <div className="metric">
                        <span className="metric-label">COGS</span>
                        <span className="metric-value">{metrics.cogs}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">MRP</span>
                        <span className="metric-value">{metrics.mrp}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Sales</span>
                        <span className="metric-value">{metrics.sales}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Revenue</span>
                        <span className="metric-value">{metrics.revenue}</span>
                      </div>
                    </div>
                  </div>
                )}
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
    </div>
  );
};

export default RecipeList;
