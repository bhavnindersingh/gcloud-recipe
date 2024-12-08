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

  // Save editingRecipe to sessionStorage whenever it changes
  useEffect(() => {
    if (editingRecipe) {
      sessionStorage.setItem('editingRecipe', JSON.stringify(editingRecipe));
    } else {
      sessionStorage.removeItem('editingRecipe');
    }
  }, [editingRecipe]);

  // Fetch data and check if we're on the editor page
  useEffect(() => {
    if (isAuthenticated) {
      fetchIngredients();
      fetchRecipes();
      
      // If we're on the editor page but don't have an editing recipe, redirect to manager
      const path = window.location.pathname;
      if (path === '/manager/recipe-editor' && !editingRecipe) {
        navigate('/manager');
      }
    }
  }, [isAuthenticated, navigate, editingRecipe]);

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

  const fetchRecipes = async () => {
    try {
      const response = await fetch(`${config.API_URL}/recipes`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      const data = await response.json();
      console.log('Fetched recipes:', data);
      // Fix the image URLs to use the complete backend URL
      const recipesWithUrls = data.map(recipe => ({
        ...recipe,
        image_url: recipe.image_url ? 
          recipe.image_url.startsWith('http') 
            ? recipe.image_url 
            : `${config.API_URL.replace('/api', '')}/uploads/${recipe.image_url}` 
          : null,
        delivery_image_url: recipe.delivery_image_url ? 
          recipe.delivery_image_url.startsWith('http')
            ? recipe.delivery_image_url
            : `${config.API_URL.replace('/api', '')}/uploads/${recipe.delivery_image_url}` 
          : null
      }));
      console.log('Setting recipes with URLs:', recipesWithUrls);
      setRecipes(recipesWithUrls);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const handleRecipeSubmit = async (recipeData) => {
    const recipeId = editingRecipe?.id;
    const isUpdate = !!recipeId;

    const url = isUpdate 
      ? `${config.API_URL}/recipes/${recipeId}`
      : `${config.API_URL}/recipes`;

    console.log('Submitting to:', url, 'Method:', isUpdate ? 'PUT' : 'POST');

    // Create FormData from the recipe data
    const formData = new FormData();
    Object.keys(recipeData).forEach(key => {
      if (key === 'ingredients') {
        formData.append('ingredients', JSON.stringify(recipeData.ingredients));
      } else if (key === 'image' && recipeData.image instanceof File) {
        formData.append('image', recipeData.image);
      } else if (key === 'delivery_image' && recipeData.delivery_image instanceof File) {
        formData.append('delivery_image', recipeData.delivery_image);
      } else if (recipeData[key] != null && recipeData[key] !== undefined) {
        formData.append(key, recipeData[key].toString());
      }
    });

    try {
      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isUpdate ? 'update' : 'save'} recipe: ${await response.text()}`);
      }

      await response.json();

      // Update recipes list safely
      setRecipes(prevRecipes => {
        if (!prevRecipes) return [];
        
        if (isUpdate) {
          return prevRecipes.map(r => r.id === recipeId ? { ...r, ...recipeData } : r);
        }
        return [...prevRecipes, recipeData];
      });

      setEditingRecipe(null);
    } catch (error) {
      console.error('Error saving recipe:', error);
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    try {
      const response = await fetch(`${config.API_URL}/recipes/${recipeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete recipe');
      }

      // Update recipes state immediately after successful deletion
      setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== recipeId));
      
      // Show success message
      // toast.success('Recipe deleted successfully');
      
      // Refresh recipes list
      await fetch(`${config.API_URL}/recipes`);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      // toast.error(error.message || 'Failed to delete recipe');
    }
  };

  const handleEditRecipe = (recipe) => {
    // Ensure image URLs are properly set with full API URL when editing
    setEditingRecipe({
      ...recipe,
      image_url: recipe.image_url ? recipe.image_url.startsWith('http') 
        ? recipe.image_url 
        : `${config.API_URL.replace('/api', '')}/uploads/${recipe.image_url}` : null,
      delivery_image_url: recipe.delivery_image_url ? recipe.delivery_image_url.startsWith('http')
        ? recipe.delivery_image_url
        : `${config.API_URL.replace('/api', '')}/uploads/${recipe.delivery_image_url}` : null
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

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAuthenticated');
    navigate('/login');
  }, [navigate]);

  const handleSalesUpdate = async (updatedRecipes) => {
    try {
      // Update each recipe with new sales data
      for (const recipe of updatedRecipes) {
        const response = await fetch(`${config.API_URL}/recipes/${recipe.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(recipe)
        });

        if (!response.ok) {
          throw new Error(`Failed to update recipe ${recipe.name}`);
        }
      }

      // Refresh recipes list after all updates
      await fetchRecipes();
      return true;
    } catch (error) {
      console.error('Error updating sales:', error);
      return false;
    }
  };

  const handleSalesUpdate2 = async (updatedRecipes) => {
    try {
      console.log('Starting sales update for recipes:', updatedRecipes);
      
      // First get all recipes to find the correct IDs
      const getAllResponse = await fetch(`${config.API_URL}/recipes`);
      if (!getAllResponse.ok) {
        throw new Error('Failed to fetch recipes list');
      }
      const allRecipes = await getAllResponse.json();
      console.log('All recipes:', allRecipes);

      // Create a map of recipe names to their database records
      const recipeMap = new Map(
        allRecipes.map(recipe => [recipe.name.toLowerCase(), recipe])
      );
      
      // Update each recipe in the database
      for (const recipeToUpdate of updatedRecipes) {
        const recipeName = recipeToUpdate.name.toLowerCase();
        const existingRecipe = recipeMap.get(recipeName);

        if (existingRecipe) {
          // If recipe exists, only update sales using PATCH
          const updateUrl = `${config.API_URL}/recipes/${existingRecipe.id}/sales`;
          console.log(`Updating sales for recipe ${recipeToUpdate.name} (ID: ${existingRecipe.id}) at URL:`, updateUrl);
          
          const updateData = {
            sales: parseInt(recipeToUpdate.sales) || 0
          };
          
          console.log('Updating recipe with new sales quantity:', {
            name: existingRecipe.name,
            oldSales: existingRecipe.sales,
            newSales: updateData.sales
          });
          
          const response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error updating ${recipeToUpdate.name}:`, errorText);
            throw new Error(`Failed to update recipe ${recipeToUpdate.name}: ${errorText}`);
          }

        } else {
          // If recipe doesn't exist, create new with defaults
          console.log(`Creating new recipe ${recipeToUpdate.name}`);
          
          const createData = {
            name: recipeToUpdate.name,
            category: 'Uncategorized',
            ingredients: [],
            sales: parseInt(recipeToUpdate.sales) || 0
          };
          
          const response = await fetch(`${config.API_URL}/recipes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(createData)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error creating ${recipeToUpdate.name}:`, errorText);
            throw new Error(`Failed to create recipe ${recipeToUpdate.name}: ${errorText}`);
          }
        }
      }

      // Refresh the recipes list
      console.log('Refreshing recipes list...');
      await fetchRecipes();
      return true;
    } catch (error) {
      console.error('Error updating recipes:', error);
      return false;
    }
  };

  // Clear viewing recipe when navigating away
  useEffect(() => {
    return () => {
      setViewingRecipe(null);
    };
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={() => {
      setIsAuthenticated(true);
      sessionStorage.setItem('isAuthenticated', 'true');
    }} />;
  }

  return (
    <>
      <ScrollToTop />
      <div className="app">
        <header className="app-header">
          <div className="nav-container">
            <div className="nav-left">
              <img 
                src="/recipe/conscious-cafe-logo.svg"
                alt="Conscious Café" 
                className="header-logo"
                loading="eager"
                onError={(e) => {
                  console.error('Logo load error:', e.target.src);
                  alert(`Failed to load logo from: ${e.target.src}`);
                }}
              />
              <nav className="nav-tabs">
                <NavLink to="/manager" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Recipes
                </NavLink>
                <NavLink to="/ingredients" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Ingredients
                </NavLink>
                <NavLink 
                  to="/create" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  onClick={() => {
                    setEditingRecipe(null);
                    navigate('/create');
                  }}
                >
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
                  src="/recipe/logout-icon.svg" 
                  alt="Logout" 
                  className="btn-icon"
                  onError={(e) => {
                    console.error('Logout icon load error:', e.target.src);
                    alert(`Failed to load logout icon from: ${e.target.src}`);
                  }}
                />
              </button>
            </div>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? (
                <Navigate to="/manager" replace />
              ) : (
                <Login onLogin={() => {
                  setIsAuthenticated(true);
                  sessionStorage.setItem('isAuthenticated', 'true');
                }} />
              )
            } />
            
            <Route path="/" element={
              isAuthenticated ? <Navigate to="/manager" /> : <Navigate to="/login" />
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
                    onSalesUpdate={handleSalesUpdate2}
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
    </>
  );
}

// Wrap App with Router
const AppWrapper = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

export default AppWrapper;
