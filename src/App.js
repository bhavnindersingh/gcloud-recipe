import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import IngredientsManager from './components/IngredientsManager';
import RecipeForm from './components/RecipeForm';
import RecipeManager from './components/RecipeManager';
import Analytics from './components/Analytics';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import DataManager from './components/DataManager';
import config from './config/env';
import './styles/App.css';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [editingRecipe, setEditingRecipe] = useState(() => {
    const saved = sessionStorage.getItem('editingRecipe');
    return saved ? JSON.parse(saved) : null;
  });
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  });
  const [error, setError] = useState(null);

  // Save editingRecipe to sessionStorage whenever it changes
  useEffect(() => {
    if (editingRecipe) {
      sessionStorage.setItem('editingRecipe', JSON.stringify(editingRecipe));
    } else {
      sessionStorage.removeItem('editingRecipe');
    }
  }, [editingRecipe]);

  // Handle login
  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    sessionStorage.setItem('isAuthenticated', 'true');
    navigate('/manager');
  }, [navigate]);

  // Handle logout
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('editingRecipe');
    navigate('/login');
  }, [navigate]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchIngredients();
      fetchRecipes();
    }
  }, [isAuthenticated]);

  const fetchIngredients = async () => {
    try {
      const response = await fetch(`${config.API_URL}/ingredients`);
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  // Helper function to get correct image URL based on environment
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // If it's already a full URL (including Google Cloud Storage URLs), return as is
    if (imageUrl.startsWith('http')) return imageUrl;
    
    // Always use /api/uploads path for consistency between environments
    return `${config.API_URL}/uploads/${imageUrl}`;
  };

  const fetchRecipes = async () => {
    try {
      const response = await fetch(`${config.API_URL}/recipes`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      const data = await response.json();
      console.log('Fetched recipes:', data);
      
      // Fix the image URLs based on environment
      const recipesWithUrls = data.map(recipe => ({
        ...recipe,
        image_url: getImageUrl(recipe.image_url),
        delivery_image_url: getImageUrl(recipe.delivery_image_url)
      }));
      
      console.log('Setting recipes with URLs:', recipesWithUrls);
      setRecipes(recipesWithUrls);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const handleRecipeSubmit = async (recipeData, recipeId = null) => {
    const isUpdate = !!recipeId;
    const url = `${config.API_URL}/recipes${isUpdate ? `/${recipeId}` : ''}`;

    try {
      // Validate ingredients
      if (!Array.isArray(recipeData.ingredients) || recipeData.ingredients.length === 0) {
        throw new Error('At least one ingredient is required');
      }

      // Create clean recipe data without name field
      const cleanRecipeData = {
        category: recipeData.category?.trim(),
        preparation_steps: recipeData.preparation_steps || '',
        cooking_method: recipeData.cooking_method || '',
        plating_instructions: recipeData.plating_instructions || '',
        chefs_notes: recipeData.chefs_notes || '',
        selling_price: Number(recipeData.selling_price) || 0,
        sales: Number(recipeData.sales) || 0,
        overhead: Number(recipeData.overhead) || 0,
        total_cost: Number(recipeData.total_cost) || 0,
        profit_margin: Number(recipeData.profit_margin) || 0,
        revenue: Number(recipeData.revenue) || 0,
        profit: Number(recipeData.profit) || 0,
        markup_factor: Number(recipeData.markup_factor) || 0,
        print_menu_ready: Boolean(recipeData.print_menu_ready),
        qr_menu_ready: Boolean(recipeData.qr_menu_ready),
        website_menu_ready: Boolean(recipeData.website_menu_ready),
        available_for_delivery: Boolean(recipeData.available_for_delivery),
        image_url: recipeData.image_url || null,
        delivery_image_url: recipeData.delivery_image_url || null,
        ingredients: recipeData.ingredients.map(ing => ({
          id: Number(ing.id),
          quantity: Number(ing.quantity)
        }))
      };

      // Only add name for new recipes
      if (!isUpdate) {
        if (!recipeData.name?.trim()) {
          throw new Error('Recipe name is required');
        }
        cleanRecipeData.name = recipeData.name.trim();
      }

      console.log('Making request:', {
        url,
        method: isUpdate ? 'PUT' : 'POST',
        data: cleanRecipeData
      });

      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanRecipeData)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to ${isUpdate ? 'update' : 'save'} recipe`);
      }

      // Update recipes list
      setRecipes(prevRecipes => {
        if (!prevRecipes) return [];
        return isUpdate 
          ? prevRecipes.map(r => r.id === recipeId ? responseData : r)
          : [...prevRecipes, responseData];
      });

      return responseData;
    } catch (error) {
      console.error('Error submitting recipe:', error);
      throw error;
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    try {
      console.log('Deleting recipe with ID:', recipeId);
      console.log('Delete URL:', `${config.API_URL}/recipes/${recipeId}`);
      
      const response = await fetch(`${config.API_URL}/recipes/${recipeId}`, {
        method: 'DELETE',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete recipe');
      }

      // Update recipes state immediately after successful deletion
      setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== recipeId));
      
      // Show success message
      setError({ message: 'Recipe deleted successfully', type: 'success' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      setError({ message: error.message, type: 'error' });
    }
  };

  const handleEditRecipe = (recipe) => {
    // Ensure image URLs are properly set based on environment
    setEditingRecipe({
      ...recipe,
      image_url: getImageUrl(recipe.image_url),
      delivery_image_url: getImageUrl(recipe.delivery_image_url)
    });
    navigate('/manager/recipe-editor');
  };

  const handleViewRecipe = (recipe) => {
    // Make sure we have all the recipe data
    const fullRecipe = {
      ...recipe,
      ingredients: recipe.ingredients || [],
      image_url: recipe.image_url || null,
      delivery_image_url: recipe.delivery_image_url || null
    };
    setViewingRecipe(fullRecipe);
    navigate('/manager/show-recipe');
  };

  const handleSalesUpdate = async (recipesData) => {
    try {
      console.log('Updating sales data:', recipesData);
      
      const response = await fetch(`${config.API_URL}/recipes/sales-import`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipes: recipesData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update sales data');
      }

      const result = await response.json();
      console.log('Sales update result:', result);

      // Refresh recipes list after update
      await fetchRecipes();
      return true;
    } catch (error) {
      console.error('Error updating sales:', error);
      return false;
    }
  };

  // Clear viewing recipe when navigating away
  useEffect(() => {
    return () => {
      setViewingRecipe(null);
    };
  }, []);

  return (
    <div className="app">
      <ScrollToTop />
      {isAuthenticated && (
        <header className="app-header">
          <div className="nav-container">
            <div className="nav-left">
              <img 
                src="https://storage.googleapis.com/recipe.consciouscafe.in/conscious-cafe-logo.svg"
                alt="Conscious Café" 
                className="header-logo"
                loading="eager"
              />
              <nav className="nav-tabs">
                <NavLink to="/manager" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Recipes
                </NavLink>
                <NavLink to="/ingredients" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Ingredients
                </NavLink>
                <NavLink to="/create" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Create Recipe
                </NavLink>
                <NavLink to="/analytics" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Analytics
                </NavLink>
                <NavLink to="/data" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Sales Data
                </NavLink>
              </nav>
            </div>
            <div className="nav-actions">
              <button className="icon-btn" onClick={handleLogout} title="Logout">
                <img 
                  src="https://storage.googleapis.com/recipe.consciouscafe.in/logout-icon.svg"
                  alt="Logout" 
                  className="btn-icon"
                />
              </button>
            </div>
          </div>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? (
              <Navigate to="/manager" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />
          
          <Route path="/" element={
            isAuthenticated ? <Navigate to="/manager" replace /> : <Navigate to="/login" replace />
          } />
          
          <Route path="/manager" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RecipeManager 
                recipes={recipes} 
                onEditRecipe={handleEditRecipe}
                onDeleteRecipe={handleDeleteRecipe}
                onViewRecipe={handleViewRecipe}
              />
            </ProtectedRoute>
          } />

          <Route path="/manager/recipe-editor" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RecipeForm
                ingredients={ingredients}
                onSubmit={handleRecipeSubmit}
                editingRecipe={editingRecipe}
                onCancel={() => {
                  setEditingRecipe(null);
                  navigate('/manager');
                }}
                mode={editingRecipe ? 'edit' : 'create'}
                recipes={recipes}
              />
            </ProtectedRoute>
          } />

          <Route path="/manager/show-recipe" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RecipeForm 
                ingredients={ingredients}
                viewingRecipe={viewingRecipe}
                mode="view"
                recipes={recipes}
              />
            </ProtectedRoute>
          } />

          <Route 
            path="/ingredients" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <IngredientsManager />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/create" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RecipeForm 
                  ingredients={ingredients}
                  mode="create"
                  onSubmit={handleRecipeSubmit}
                  onCancel={() => {
                    setEditingRecipe(null);
                    navigate('/manager');
                  }}
                  recipes={recipes}
                />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Analytics recipes={recipes} />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/data" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <DataManager 
                  recipes={recipes} 
                  ingredients={ingredients}
                  onSalesUpdate={handleSalesUpdate}
                />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/manager" replace />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-text">&copy; 2024 Kavas Conscious Living LLP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Wrapper component that provides router context
function AppWrapper() {
  return (
    <Router>
      <ScrollToTop />
      <App />
    </Router>
  );
}

export default AppWrapper;
