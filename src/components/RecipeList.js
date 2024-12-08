import React, { useState, useMemo } from 'react';
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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Calculate completed and pending counts
  const completedCount = recipes.filter(r => r.ingredients && r.ingredients.length > 0).length;
  const pendingCount = recipes.length - completedCount;

  const handleDeleteRecipe = (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      onDeleteRecipe(recipeId);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value);
  };

  const sortedRecipes = useMemo(() => {
    let sortableRecipes = [...recipes];
    if (sortConfig.key !== null) {
      sortableRecipes.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableRecipes;
  }, [recipes, sortConfig]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort recipes
  const filteredAndSortedRecipes = useMemo(() => {
    return sortedRecipes
      .filter(recipe => {
        if (!recipe) return false;
        const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (recipe.chefs_notes && recipe.chefs_notes.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategoryState === 'all' || recipe.category === selectedCategoryState;
        return matchesSearch && matchesCategory;
      })
  }, [sortedRecipes, searchTerm, selectedCategoryState]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRecipes.length / ITEMS_PER_PAGE);
  const paginatedRecipes = filteredAndSortedRecipes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
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
              <span role="img" aria-label="completed">✓ {completedCount}</span>
              <span role="img" aria-label="pending">⚠️ {pendingCount}</span>
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
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>Recipe Name</th>
                <th onClick={() => handleSort('category')}>Category</th>
                <th onClick={() => handleSort('selling_price')}>Selling Price</th>
                <th onClick={() => handleSort('monthly_sales')}>Monthly Sales</th>
                <th onClick={() => handleSort('total_cost')}>Total Cost</th>
                <th onClick={() => handleSort('profit_margin')}>Profit Margin</th>
                <th onClick={() => handleSort('monthly_revenue')}>Monthly Revenue</th>
                <th onClick={() => handleSort('monthly_profit')}>Monthly Profit</th>
                <th onClick={() => handleSort('markup_factor')}>Markup Factor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecipes.map(recipe => {
                if (!recipe) return null;
                
                return (
                  <tr key={recipe.id}>
                    <td>{recipe.name}</td>
                    <td>{recipe.category}</td>
                    <td>₹ {recipe.selling_price}</td>
                    <td>{recipe.monthly_sales}</td>
                    <td>₹ {recipe.total_cost}</td>
                    <td>{recipe.profit_margin}%</td>
                    <td>₹ {recipe.monthly_revenue}</td>
                    <td>₹ {recipe.monthly_profit}</td>
                    <td>{recipe.markup_factor}x</td>
                    <td>
                      <button 
                        className="action-button edit"
                        onClick={() => onEdit(recipe)}
                      >
                        Edit
                      </button>
                      <button 
                        className="action-button delete"
                        onClick={() => handleDeleteRecipe(recipe.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
