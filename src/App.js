import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import IngredientsManager from './components/IngredientsManager';
import RecipeForm from './components/RecipeForm';
import RecipeManager from './components/RecipeManager';
import Analytics from './components/Analytics';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import * as XLSX from 'xlsx';
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
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [editingRecipe, setEditingRecipe] = useState(() => {
    const saved = sessionStorage.getItem('editingRecipe');
    return saved ? JSON.parse(saved) : null;
  });
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
      setRecipes(await response.json());
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const handleRecipeSubmit = async (formData) => {
    try {
      const recipeId = editingRecipe?.id;
      const isUpdate = !!recipeId;

      const url = isUpdate 
        ? `${config.API_URL}/recipes/${recipeId}`
        : `${config.API_URL}/recipes`;

      console.log('Submitting to:', url, 'Method:', isUpdate ? 'PUT' : 'POST');

      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        body: formData
      });

      const responseText = await response.text();
      console.log('Server response text:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to ${isUpdate ? 'update' : 'save'} recipe: ${responseText}`);
      }

      const savedRecipe = JSON.parse(responseText);
      console.log('Recipe saved:', savedRecipe);

      // Update recipes list safely
      setRecipes(prevRecipes => {
        if (!prevRecipes) return [savedRecipe];
        
        if (isUpdate) {
          return prevRecipes.map(r => r.id === savedRecipe.id ? savedRecipe : r);
        }
        return [...prevRecipes, savedRecipe];
      });

      setEditingRecipe(null);
      
      // Navigate back to recipe manager
      navigate('/manager');

    } catch (error) {
      console.error('Error saving recipe:', error);
      alert(`Failed to save recipe: ${error.message}`);
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

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAuthenticated');
    navigate('/login');
  }, [navigate]);

  const handleUpdateRecipe = useCallback(async (recipe) => {
    try {
      // Prepare the data for the API using correct field names
      const recipeData = {
        id: recipe.id,
        name: recipe.name,
        category: recipe.category,
        description: recipe.description || '',
        selling_price: parseFloat(recipe.selling_price),
        monthly_sales: parseInt(recipe.monthly_sales),
        overhead: parseFloat(recipe.overhead),
        preparation_steps: recipe.preparation_steps || '',
        cooking_method: recipe.cooking_method || '',
        plating_instructions: recipe.plating_instructions || '',
        chefs_notes: recipe.chefs_notes || '',
        print_menu_ready: recipe.print_menu_ready,
        qr_menu_ready: recipe.qr_menu_ready,
        website_menu_ready: recipe.website_menu_ready,
        available_for_delivery: recipe.available_for_delivery,
        delivery_image_url: recipe.delivery_image_url || '',
        total_cost: parseFloat(recipe.total_cost) || 0,
        profit_margin: parseFloat(recipe.profit_margin) || 0,
        monthly_revenue: parseFloat(recipe.monthly_revenue) || 0,
        monthly_profit: parseFloat(recipe.monthly_profit) || 0,
        markup_factor: parseFloat(recipe.markup_factor) || 0,
        ingredients: recipe.ingredients.map(ing => ({
          id: ing.id,
          quantity: parseFloat(ing.quantity) || 0
        }))
      };

      // Make the API call
      const response = await fetch(`${config.API_URL}/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`Failed to update recipe: ${errorData.error}`);
      }

      const updatedRecipe = await response.json();
      
      // Update the local state
      setRecipes(prevRecipes => 
        prevRecipes.map(r => r.id === recipe.id ? updatedRecipe : r)
      );

      return updatedRecipe;
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  }, []);

  const exportData = useCallback(() => {
    const wb = XLSX.utils.book_new();
    
    // Export recipes
    const recipesWS = XLSX.utils.json_to_sheet(recipes);
    XLSX.utils.book_append_sheet(wb, recipesWS, "Recipes");
    
    // Export ingredients
    const ingredientsWS = XLSX.utils.json_to_sheet(ingredients);
    XLSX.utils.book_append_sheet(wb, ingredientsWS, "Ingredients");
    
    // Save the file
    XLSX.writeFile(wb, "recipe_calculator_data.xlsx");
  }, [recipes, ingredients]);

  const importData = useCallback((event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Import recipes
      const recipesSheet = workbook.Sheets["Recipes"];
      if (recipesSheet) {
        const importedRecipes = XLSX.utils.sheet_to_json(recipesSheet);
        setRecipes(importedRecipes);
      }
      
      // Import ingredients
      const ingredientsSheet = workbook.Sheets["Ingredients"];
      if (ingredientsSheet) {
        const importedIngredients = XLSX.utils.sheet_to_json(ingredientsSheet);
        setIngredients(importedIngredients);
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, []);

  const importSalesData = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target.result;
        const rows = csvData.split('\n').slice(1); // Skip header row

        const updatedRecipes = [...recipes];
        for (let row of rows) {
          const [recipeName, monthlySales] = row.split(',');
          const recipe = updatedRecipes.find(r => r.name.trim() === recipeName.trim());
          
          if (recipe) {
            recipe.monthly_sales = parseInt(monthlySales) || 0;
          }
        }

        setRecipes(updatedRecipes);
        event.target.value = '';
      } catch (error) {
        console.error('Error processing CSV:', error);
      }
    };
    reader.readAsText(file);
  }, [recipes]);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    sessionStorage.setItem('isAuthenticated', 'true');
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
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
                  Import/Export
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
                <Login onLogin={handleLogin} />
              )
            } />
            
            <Route path="/" element={
              isAuthenticated ? <Navigate to="/manager" /> : <Navigate to="/login" />
            } />
            
            <Route path="/manager" element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RecipeManager 
                  recipes={recipes} 
                  onEditRecipe={(recipe) => {
                    setEditingRecipe(recipe);
                    navigate('/manager/recipe-editor');
                  }}
                  onDeleteRecipe={handleDeleteRecipe}
                />
              </ProtectedRoute>
            } />

            <Route path="/manager/recipe-editor" element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RecipeForm
                  ingredients={ingredients}
                  editingRecipe={editingRecipe}
                  onSubmit={handleRecipeSubmit}
                  onCancel={() => {
                    setEditingRecipe(null);
                    navigate('/manager');
                  }}
                  mode="edit"
                  initialRecipe={editingRecipe}
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
                    onSubmit={handleRecipeSubmit}
                    editingRecipe={editingRecipe}
                    onCancel={() => {
                      setEditingRecipe(null);
                      navigate('/manager');
                    }}
                    mode="create"
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
                  <div className="data-management">
                    <h2>Data Management</h2>
                    <div className="data-actions">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="file-input-hidden"
                        accept=".xlsx, .xls"
                        onChange={importData}
                      />
                      <button className="data-btn" onClick={exportData}>
                        <img src="/recipe/export-icon.svg" alt="Export" />
                        Export App Data
                      </button>
                      <button className="data-btn" onClick={() => fileInputRef.current.click()}>
                        <img src="/recipe/import-icon.svg" alt="Import" />
                        Import App Data
                      </button>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={importSalesData}
                        className="file-input-hidden"
                        id="sales-file-input"
                      />
                      <button className="data-btn" onClick={() => document.getElementById('sales-file-input').click()}>
                        <img src="/recipe/sales-icon.svg" alt="Sales" />
                        Import QTR Sales
                      </button>
                    </div>
                  </div>
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
