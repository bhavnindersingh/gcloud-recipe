import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import IngredientsManager from './components/IngredientsManager';
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import RecipeManager from './components/RecipeManager';
import Analytics from './components/Analytics';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import * as XLSX from 'xlsx';
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
  }, [isAuthenticated]);

  const fetchIngredients = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ingredients');
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
      const response = await fetch('http://localhost:3001/api/recipes');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const handleRecipeSubmit = async (recipe) => {
    try {
      // Process recipe data
      const processedRecipe = {
        ...recipe,
        available_for_delivery: recipe.available_for_delivery || false,
        delivery_image_url: recipe.delivery_image_url || '',
        ingredients: recipe.ingredients || []
      };
      
      // Determine if this is an update or a new recipe
      const isUpdate = processedRecipe.id && recipes.some(r => r.id === processedRecipe.id);
      
      let response;
      if (isUpdate) {
        // Update existing recipe
        response = await fetch(`http://localhost:3001/api/recipes/${processedRecipe.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(processedRecipe)
        });
      } else {
        // Create new recipe
        response = await fetch('http://localhost:3001/api/recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(processedRecipe)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recipe');
      }

      const savedRecipe = await response.json();

      // Update local state
      setRecipes(prevRecipes => {
        if (isUpdate) {
          return prevRecipes.map(r => r.id === savedRecipe.id ? savedRecipe : r);
        } else {
          return [...prevRecipes, savedRecipe];
        }
      });

      // Reset editing state and clear from session storage
      setEditingRecipe(null);
      sessionStorage.removeItem('editingRecipe');
      
      // Navigate back to recipe manager
      navigate('/manager');

    } catch (error) {
      console.error('Error saving recipe:', error);
      alert(`Failed to save recipe: ${error.message}`);
    }
  };

  const handleEditRecipe = (recipe) => {
    // Process recipe for editing
    const processedRecipe = {
      ...recipe,
      // Convert numeric fields to strings
      selling_price: recipe.selling_price?.toString() || '0',
      monthly_sales: recipe.monthly_sales?.toString() || '0',
      overhead: recipe.overhead?.toString() || '10',
      total_cost: recipe.total_cost?.toString() || '0',
      profit_margin: recipe.profit_margin?.toString() || '0',
      monthly_revenue: recipe.monthly_revenue?.toString() || '0',
      monthly_profit: recipe.monthly_profit?.toString() || '0',
      markup_factor: recipe.markup_factor?.toString() || '0',
      // Ensure other fields have proper defaults
      available_for_delivery: recipe.available_for_delivery || false,
      delivery_image_url: recipe.delivery_image_url || '',
      ingredients: recipe.ingredients || []
    };
    
    setEditingRecipe(processedRecipe);
    navigate('/manager/recipe-editor');
  };

  const handleCreateRecipe = () => {
    setEditingRecipe(null);
    sessionStorage.removeItem('editingRecipe');  // Clear from session storage
    navigate('/create');
  };

  const handleDeleteRecipe = (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== recipeId));
    }
  };

  const handleCancelEdit = () => {
    setEditingRecipe(null);
  };

  const handleViewRecipe = (recipe) => {
    setViewingRecipe(recipe);
    navigate('/view');
  };

  const handleCloseView = () => {
    setViewingRecipe(null);
    navigate('/manager');
  };

  const exportData = () => {
    const wb = XLSX.utils.book_new();
    
    // Export recipes
    const recipesWS = XLSX.utils.json_to_sheet(recipes);
    XLSX.utils.book_append_sheet(wb, recipesWS, "Recipes");
    
    // Export ingredients
    const ingredientsWS = XLSX.utils.json_to_sheet(ingredients);
    XLSX.utils.book_append_sheet(wb, ingredientsWS, "Ingredients");
    
    // Save the file
    XLSX.writeFile(wb, "recipe_calculator_data.xlsx");
  };

  const importData = (event) => {
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
  };

  const importSalesData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON (skips empty rows automatically)
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
        const salesData = new Map();

        // Skip header row and process data
        rows.slice(1).forEach(row => {
          if (!row || row.length < 2) return; // Skip empty rows
          
          const recipeName = row[0]?.toString().trim();
          const quantity = parseFloat(row[1]);
          
          if (!recipeName || isNaN(quantity)) return;
          if (/^\d+$/.test(recipeName)) return; // Skip total rows
          
          const normalizedName = recipeName.toLowerCase();
          const currentTotal = salesData.get(normalizedName) || 0;
          salesData.set(normalizedName, currentTotal + quantity);
        });

        // Update existing recipes with sales data
        const updatedRecipes = recipes.map(recipe => {
          const quarterlySales = salesData.get(recipe.name.toLowerCase().trim()) || recipe.quarterlySales || 0;
          return {
            ...recipe,
            quarterlySales: quarterlySales
          };
        });

        setRecipes(updatedRecipes);
        alert('Sales data imported successfully!');

        // Clear file input
        event.target.value = '';

      } catch (error) {
        console.error('Import error:', error);
        alert('Error importing sales data: ' + error.message);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('isAuthenticated', 'true');
    navigate('/manager');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const handleUpdateRecipe = async (recipe) => {
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
      const response = await fetch(`http://localhost:3001/api/recipes/${recipe.id}`, {
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
  };

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
                src={process.env.PUBLIC_URL + '/conscious-cafe-logo.svg'}
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
                <NavLink 
                  to="/create" 
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                  onClick={handleCreateRecipe}
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
                <img src={process.env.PUBLIC_URL + '/logout-icon.svg'} alt="Logout" className="btn-icon" />
              </button>
            </div>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={
              isAuthenticated ? <Navigate to="/manager" /> : <Login onLogin={handleLogin} />
            } />
            
            <Route path="/manager" element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RecipeList 
                  recipes={recipes} 
                  ingredients={ingredients}
                  onEdit={(recipe) => {
                    setEditingRecipe(recipe);
                    navigate('/manager/recipe-editor');
                  }}
                  onDeleteRecipe={handleDeleteRecipe}
                  setRecipes={setRecipes}
                />
              </ProtectedRoute>
            } />

            <Route path="/manager/recipe-editor" element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RecipeForm
                  ingredients={ingredients}
                  editingRecipe={editingRecipe}
                  onSubmit={async (recipe) => {
                    await handleUpdateRecipe(recipe);
                    setEditingRecipe(null);
                    navigate('/manager');
                  }}
                  onCancel={() => {
                    setEditingRecipe(null);
                    navigate('/manager');
                  }}
                  mode="edit"
                />
              </ProtectedRoute>
            } />

            <Route 
              path="/ingredients" 
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <IngredientsManager ingredients={ingredients} setIngredients={setIngredients} />
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
              path="/view" 
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <RecipeForm 
                    ingredients={ingredients}
                    onSubmit={handleRecipeSubmit}
                    editingRecipe={viewingRecipe}
                    onCancel={handleCloseView}
                    mode="view"
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
ca
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
                        <img src="/export-icon.svg" alt="Export" />
                        Export App Data
                      </button>
                      <button className="data-btn" onClick={() => fileInputRef.current.click()}>
                        <img src="/import-icon.svg" alt="Import" />
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
                        <img src="/sales-icon.svg" alt="Sales" />
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
