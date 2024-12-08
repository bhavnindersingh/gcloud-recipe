import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import '../styles/DataManager.css';
import config from '../config';

const DataManager = ({ recipes, onSalesUpdate }) => {
  const [error, setError] = useState({ message: '', type: '' });
  const [importLogs, setImportLogs] = useState(() => {
    try {
      const savedLogs = localStorage.getItem('importLogs');
      const parsedLogs = savedLogs ? JSON.parse(savedLogs) : {
        sales: []
      };
      return {
        sales: Array.isArray(parsedLogs.sales) ? parsedLogs.sales : []
      };
    } catch (error) {
      console.error('Error loading import logs:', error);
      return {
        sales: []
      };
    }
  });
  const [importStats, setImportStats] = useState(null);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('importLogs', JSON.stringify(importLogs));
  }, [importLogs]);

  const addImportLog = (type, status, details) => {
    const newLog = {
      timestamp: new Date().toISOString(),
      status,
      details
    };

    setImportLogs(prev => ({
      ...prev,
      [type]: [newLog, ...prev[type]].slice(0, 10) // Keep only last 10 logs
    }));
  };

  // Format the timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSalesImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      
      console.log('Imported data:', jsonData);
      
      // Process imported data
      const existingRecipes = new Map(recipes.map(r => [r.name.toLowerCase(), r]));
      console.log('Existing recipes:', [...existingRecipes.entries()].map(([key, value]) => ({ name: key, id: value.id })));
      
      const stats = {
        totalRows: jsonData.length,
        updatedRecipes: [],
        newRecipes: []
      };

      // Transform data and prepare updates
      const updatedRecipes = [];
      const newRecipesToCreate = [];

      jsonData.forEach(row => {
        const recipeName = row['Recipe Name'];
        if (!recipeName) {
          console.warn('Skipping row with no recipe name:', row);
          return;
        }

        const salesQuantity = parseInt(row['Sales Quantity']) || 0;
        const lowerName = recipeName.toLowerCase();
        console.log(`Processing recipe: ${recipeName} (${lowerName}), sales: ${salesQuantity}`);

        if (existingRecipes.has(lowerName)) {
          // Update existing recipe
          const existingRecipe = existingRecipes.get(lowerName);
          console.log('Found existing recipe:', existingRecipe);
          const updatedRecipe = {
            ...existingRecipe,
            sales: salesQuantity  // Directly set sales instead of adding
          };
          console.log('Updating recipe with new data:', updatedRecipe);
          updatedRecipes.push(updatedRecipe);
          stats.updatedRecipes.push(recipeName);
        } else {
          console.log('Creating new recipe:', recipeName);
          // Create new recipe with minimal required fields
          const newRecipe = {
            name: recipeName,
            category: 'Uncategorized',
            selling_price: 0,
            total_cost: 0,
            markup: 0,
            sales: salesQuantity,
            ingredients: []
          };
          newRecipesToCreate.push(newRecipe);
          stats.newRecipes.push(recipeName);
        }
      });

      console.log('Processing summary:', {
        totalRows: stats.totalRows,
        updatingRecipes: updatedRecipes.map(r => ({ name: r.name, sales: r.sales })),
        newRecipes: newRecipesToCreate.map(r => ({ name: r.name, sales: r.sales }))
      });

      // First create all new recipes
      const createdRecipes = [];
      for (const newRecipe of newRecipesToCreate) {
        try {
          console.log('Creating new recipe:', newRecipe.name);
          const response = await fetch(`${config.API_URL}/recipes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newRecipe)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create new recipe ${newRecipe.name}: ${errorText}`);
          }

          const createdRecipe = await response.json();
          console.log('Successfully created recipe:', createdRecipe);
          createdRecipes.push(createdRecipe);
        } catch (error) {
          console.error(`Error creating recipe ${newRecipe.name}:`, error);
          throw error;
        }
      }

      // Combine existing updated recipes with newly created ones
      const allRecipesToUpdate = [...updatedRecipes, ...createdRecipes];
      console.log('All recipes to update:', allRecipesToUpdate);

      // Then update all recipes (both existing and newly created)
      if (allRecipesToUpdate.length > 0) {
        console.log('Updating all recipes with sales data...');
        const updateSuccess = await onSalesUpdate(allRecipesToUpdate);
        
        if (!updateSuccess) {
          throw new Error('Failed to update recipes in the database');
        }
      }

      // Add import log with actual results
      const logDetails = {
        totalRows: jsonData.length,
        updatedRecipes: updatedRecipes.map(r => r.name),
        newRecipes: createdRecipes.map(r => r.name),
        timestamp: new Date().toISOString()
      };

      console.log('Import completed successfully:', logDetails);
      addImportLog('sales', 'success', logDetails);
      setImportStats(stats);
      setError({ message: 'Sales data imported successfully', type: 'success' });
    } catch (error) {
      console.error('Error importing sales:', error);
      setError({ message: error.message || 'Failed to import sales data', type: 'error' });
      addImportLog('sales', 'error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleExport = () => {
    try {
      const template = [
        {
          'Recipe Name': 'Example Recipe',
          'Sales Quantity': 100
        }
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(template);
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Template');
      XLSX.writeFile(wb, 'sales_template.xlsx');
      setError({ message: 'Template downloaded successfully', type: 'success' });
    } catch (error) {
      console.error('Error downloading template:', error);
      setError({ message: 'Failed to download template', type: 'error' });
    }
  };

  const exportRecipes = () => {
    // Prepare recipes data for export
    const exportData = recipes.map(recipe => ({
      'Recipe Name': recipe.name,
      'Category': recipe.category,
      'Preparation Time': recipe.prepTime,
      'Cooking Time': recipe.cookTime,
      'Servings': recipe.servings,
      'Cost (₹)': recipe.cost,
      'Ingredients': recipe.ingredients.map(ing => `${ing.name} (${ing.quantity} ${ing.unit})`).join(', '),
      'Instructions': recipe.instructions
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Recipe Name
      { wch: 20 }, // Category
      { wch: 15 }, // Prep Time
      { wch: 15 }, // Cook Time
      { wch: 10 }, // Servings
      { wch: 12 }, // Cost
      { wch: 50 }, // Ingredients
      { wch: 50 }  // Instructions
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Recipes');

    // Save file
    XLSX.writeFile(wb, 'recipes.xlsx');
  };

  return (
    <div className="data-manager">
      <div className="page-title-card">
        <h1 className="page-title">Data Manager</h1>
        <div className="data-buttons">
          <button className="icon-btn" onClick={exportRecipes} title="Export to Excel">
            <img src={process.env.PUBLIC_URL + '/export-icon.svg'} alt="Export" className="btn-icon" />
          </button>
        </div>
      </div>
      <div className="data-content">
        <div className="section">
          <div className="action-buttons">
            <div className="action-card">
              <h3>Import Data</h3>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleSalesImport}
                style={{ display: 'none' }}
                id="sales-import"
              />
              <label htmlFor="sales-import" className="button">
                Import Sales Data
              </label>
            </div>

            <div className="action-card">
              <h3>Sample Template</h3>
              <button onClick={handleExport} className="button">
                Download Template
              </button>
            </div>
          </div>

          {/* Recent Import History - Limited to 10 entries */}
          <div className="import-history">
            <h3>Recent Import History</h3>
            <div className="history-list">
              {importLogs.sales.slice(0, 10).map((log, index) => (
                <div key={index} className="history-item">
                  <div className="history-header">
                    <span className="history-date">{formatTimestamp(log.timestamp)}</span>
                    <span className="history-rows">Total Rows: {log.details?.totalRows || 0}</span>
                  </div>
                  <div className="history-details">
                    {log.details?.updatedRecipes?.length > 0 && (
                      <p>
                        <strong>Updated Recipes:</strong> {log.details.updatedRecipes.length}
                        {log.details.updatedRecipes.length > 0 && 
                          ` (${log.details.updatedRecipes.join(', ')})`}
                      </p>
                    )}
                    {log.details?.newRecipes?.length > 0 && (
                      <p>
                        <strong>New Recipes:</strong> {log.details.newRecipes.length}
                        {log.details.newRecipes.length > 0 && 
                          ` (${log.details.newRecipes.join(', ')})`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManager;