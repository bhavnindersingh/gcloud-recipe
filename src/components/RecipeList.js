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

  const calculateRecipeMetrics = (recipe) => {
    console.group('Recipe Calculations:', recipe.name);
    
    // Calculate total cost
    const totalCost = recipe.ingredients.reduce((sum, ingredient) => {
      const unitCost = parseFloat(ingredient.costPerUnit || ingredient.cost || 0);
      const quantity = parseFloat(ingredient.quantity || 0);
      const itemCost = unitCost * quantity;
      
      console.log('Ingredient:', ingredient.name);
      console.log('Unit Cost:', unitCost);
      console.log('Quantity:', quantity);
      console.log('Item Cost:', itemCost);
      
      return sum + itemCost;
    }, 0);

    // Calculate other metrics
    const sellingPrice = parseFloat(recipe.sellingPrice || 0);
    const monthlySales = parseFloat(recipe.averageMonthlySales || 0);
    const monthlyRevenue = sellingPrice * monthlySales;
    const monthlyProfit = (sellingPrice - totalCost) * monthlySales;
    const profitMargin = sellingPrice ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

    console.log('Total Cost:', totalCost);
    console.log('Selling Price:', sellingPrice);
    console.log('Monthly Sales:', monthlySales);
    console.log('Monthly Revenue:', monthlyRevenue);
    console.log('Monthly Profit:', monthlyProfit);
    console.log('Profit Margin:', profitMargin);
    
    console.groupEnd();

    return {
      totalCost,
      profitMargin,
      monthlyRevenue,
      monthlyProfit
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
          case 'monthlySales':
            compareA = a.averageMonthlySales;
            compareB = b.averageMonthlySales;
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
            onClick={() => handleSort('monthlySales')}
            className={`sort-button ${sortBy === 'monthlySales' ? 'active' : ''}`}
          >
            Monthly Sales {sortBy === 'monthlySales' && (sortOrder === 'asc' ? '↑' : '↓')}
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
          const metrics = calculateRecipeMetrics(recipe);
          
          return (
            <div key={recipe.id} className="recipe-card glass-card">
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
                        const cost = parseFloat(ingredient.costPerUnit || ingredient.cost || 0);
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
                        <label>Monthly Sales</label>
                        <span>{parseInt(recipe.averageMonthlySales || 0)} units</span>
                      </div>
                      <div className="metric-item">
                        <label>Monthly Revenue</label>
                        <span>{formatInLakhs(metrics.monthlyRevenue)}</span>
                      </div>
                      <div className="metric-item highlight">
                        <label>Gross Profit</label>
                        <span>{formatInLakhs(metrics.monthlyProfit)}</span>
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
