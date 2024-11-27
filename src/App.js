import React, { useState, useEffect, useRef } from 'react';
import IngredientsManager from './components/IngredientsManager';
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import Analytics from './components/Analytics';
import Login from './components/Login';
import { sampleIngredients, sampleRecipes } from './data/sampleData';
import * as XLSX from 'xlsx';
import './styles/shared.css';
import './styles/App.css';

function App() {
  const fileInputRef = useRef(null);
  
  // Initialize state from localStorage or use sample data as fallback
  const [ingredients, setIngredients] = useState(() => {
    const savedIngredients = localStorage.getItem('ingredients');
    return savedIngredients ? JSON.parse(savedIngredients) : sampleIngredients;
  });

  const [recipes, setRecipes] = useState(() => {
    const savedRecipes = localStorage.getItem('recipes');
    return savedRecipes ? JSON.parse(savedRecipes) : sampleRecipes;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const lastActiveTab = localStorage.getItem('activeTab');
    return lastActiveTab || 'recipes';
  });

  const [editingRecipe, setEditingRecipe] = useState(null);
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

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setActiveTab('form');
  };

  const handleDeleteRecipe = (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== recipeId));
    }
  };

  const handleCancelEdit = () => {
    setEditingRecipe(null);
    setActiveTab('recipes');
  };

  const handleRecipeSubmit = (recipe) => {
    setRecipes(prevRecipes => {
      if (editingRecipe) {
        return prevRecipes.map(r => r.id === editingRecipe.id ? recipe : r);
      } else {
        return [...prevRecipes, recipe];
      }
    });
    setEditingRecipe(null);
    setActiveTab('recipes');
  };

  const exportData = () => {
    // Prepare recipes worksheet
    const recipeRows = recipes.map(recipe => ({
      'Recipe Name': recipe.name,
      'Description': recipe.description,
      'Selling Price': recipe.sellingPrice,
      'Monthly Sales': recipe.averageMonthlySales,
      'Total Cost': recipe.totalCost,
      'Profit Margin': recipe.profitMargin,
      'Monthly Revenue': recipe.monthlyRevenue,
      'Monthly Profit': recipe.monthlyProfit
    }));

    // Prepare ingredients worksheet
    const ingredientRows = ingredients.map(ingredient => ({
      'Ingredient Name': ingredient.name,
      'Cost': ingredient.cost,
      'Cost Per Unit': ingredient.costPerUnit,
      'Unit': ingredient.unit,
      'Category': ingredient.category
    }));

    // Create recipe ingredients worksheet
    const recipeIngredientsRows = [];
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        recipeIngredientsRows.push({
          'Recipe Name': recipe.name,
          'Ingredient Name': ing.name,
          'Quantity': ing.quantity,
          'Unit': ing.unit
        });
      });
    });

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Add worksheets
    const wsRecipes = XLSX.utils.json_to_sheet(recipeRows);
    const wsIngredients = XLSX.utils.json_to_sheet(ingredientRows);
    const wsRecipeIngredients = XLSX.utils.json_to_sheet(recipeIngredientsRows);
    
    XLSX.utils.book_append_sheet(wb, wsRecipes, 'Recipes');
    XLSX.utils.book_append_sheet(wb, wsIngredients, 'Ingredients');
    XLSX.utils.book_append_sheet(wb, wsRecipeIngredients, 'Recipe Ingredients');

    // Save the file
    XLSX.writeFile(wb, `recipe-data-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          
          // Read ingredients
          const ingredientsSheet = workbook.Sheets['Ingredients'];
          if (ingredientsSheet) {
            const importedIngredients = XLSX.utils.sheet_to_json(ingredientsSheet)
              .map(row => ({
                id: Date.now() + Math.random(),
                name: row['Ingredient Name'],
                cost: parseFloat(row['Cost']) || 0,
                costPerUnit: parseFloat(row['Cost Per Unit']) || 0,
                unit: row['Unit'],
                category: row['Category']
              }));
            setIngredients(importedIngredients);
          }

          // Read recipes
          const recipesSheet = workbook.Sheets['Recipes'];
          const recipeIngredientsSheet = workbook.Sheets['Recipe Ingredients'];
          
          if (recipesSheet && recipeIngredientsSheet) {
            const recipesData = XLSX.utils.sheet_to_json(recipesSheet);
            const recipeIngredientsData = XLSX.utils.sheet_to_json(recipeIngredientsSheet);
            
            const importedRecipes = recipesData.map(row => {
              const recipeIngredients = recipeIngredientsData
                .filter(ri => ri['Recipe Name'] === row['Recipe Name'])
                .map(ri => ({
                  name: ri['Ingredient Name'],
                  quantity: parseFloat(ri['Quantity']) || 0,
                  unit: ri['Unit']
                }));

              return {
                id: Date.now() + Math.random(),
                name: row['Recipe Name'],
                description: row['Description'],
                sellingPrice: parseFloat(row['Selling Price']) || 0,
                averageMonthlySales: parseFloat(row['Monthly Sales']) || 0,
                ingredients: recipeIngredients,
                totalCost: parseFloat(row['Total Cost']) || 0,
                profitMargin: parseFloat(row['Profit Margin']) || 0,
                monthlyRevenue: parseFloat(row['Monthly Revenue']) || 0,
                monthlyProfit: parseFloat(row['Monthly Profit']) || 0
              };
            });

            setRecipes(importedRecipes);
          }

          alert('Data imported successfully!');
        } catch (error) {
          console.error('Import error:', error);
          alert('Error importing data: ' + error.message);
        }
      };
      reader.readAsArrayBuffer(file);
    }
    // Reset file input
    event.target.value = '';
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <header className="glass-card mb-4">
        <div className="header-content">
          <h1>Conscious Cafe Recipe Calculator</h1>
          <p className="text-secondary">Manage your recipe's cost & track margin simbly</p>
        </div>
      </header>

      <nav className="glass-card mb-4">
        <div className="nav-tabs">
          <button 
            className={`btn ${activeTab === 'ingredients' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('ingredients')}
          >
            Ingredients
          </button>
          <button 
            className={`btn ${activeTab === 'recipes' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('recipes')}
          >
            Recipes
          </button>
          <button 
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            className={`btn ${activeTab === 'form' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setEditingRecipe(null);
              setActiveTab('form');
            }}
          >
            {editingRecipe ? 'Editing Recipe' : 'Create Recipe'}
          </button>
          <button 
            className={`btn`}
            onClick={exportData}
          >
            Export to Excel
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".xlsx, .xls"
            onChange={importData}
          />
          <button 
            className={`btn`}
            onClick={() => fileInputRef.current.click()}
          >
            Import from Excel
          </button>
          <button 
            className={`btn`}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'ingredients' && (
          <section className="glass-card fade-in">
            <IngredientsManager 
              ingredients={ingredients} 
              setIngredients={setIngredients} 
            />
          </section>
        )}

        {activeTab === 'recipes' && (
          <section className="glass-card fade-in">
            <RecipeList 
              recipes={recipes} 
              onEditRecipe={handleEditRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="glass-card fade-in">
            <Analytics recipes={recipes} />
          </section>
        )}

        {activeTab === 'form' && (
          <section className="glass-card fade-in">
            <RecipeForm 
              ingredients={ingredients}
              recipes={recipes}
              setRecipes={handleRecipeSubmit}
              editingRecipe={editingRecipe}
              onCancelEdit={handleCancelEdit}
            />
          </section>
        )}
      </main>

      <footer className="glass-card mt-4">
        <div className="footer-content">
          <p className="text-secondary text-center">
            {new Date().getFullYear()} Kavas Conscious Living LLP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
