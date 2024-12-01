import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import IngredientsManager from './components/IngredientsManager';
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import RecipeManager from './components/RecipeManager';
import Analytics from './components/Analytics';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { sampleIngredients, sampleRecipes } from './data/sampleData';
import * as XLSX from 'xlsx';
import './styles/App.css';

function App() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  
  // Initialize state from localStorage or use sample data as fallback
  const [ingredients, setIngredients] = useState(() => {
    const savedIngredients = localStorage.getItem('ingredients');
    return savedIngredients ? JSON.parse(savedIngredients) : sampleIngredients;
  });

  const [recipes, setRecipes] = useState(() => {
    const savedRecipes = localStorage.getItem('recipes');
    return savedRecipes ? JSON.parse(savedRecipes) : sampleRecipes;
  });

  const [editingRecipe, setEditingRecipe] = useState(null);
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('ingredients', JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(() => {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  const handleRecipeSubmit = (recipe) => {
    setRecipes(prevRecipes => {
      if (editingRecipe) {
        return prevRecipes.map(r => r.id === editingRecipe.id ? recipe : r);
      } else {
        return [...prevRecipes, { ...recipe, id: Date.now() }];
      }
    });
    setEditingRecipe(null);
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    navigate('/create');
  };

  const handleCreateRecipe = () => {
    setEditingRecipe(null); 
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

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
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
          <Route path="/" element={<Navigate to="/manager" replace />} />
          
          <Route 
            path="/ingredients" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <IngredientsManager ingredients={ingredients} setIngredients={setIngredients} />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/manager" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RecipeManager 
                  recipes={recipes} 
                  onEditRecipe={handleEditRecipe}
                  onDeleteRecipe={handleDeleteRecipe}
                  onViewRecipe={handleViewRecipe}
                />
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
                  mode={editingRecipe ? 'edit' : 'create'}
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
