import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import '../styles/DataManager.css';
import config from '../config';

const DataManager = ({ recipes, onSalesUpdate }) => {
  const [error, setError] = useState({ message: '', type: '' });
  const [importLogs, setImportLogs] = useState(() => {
    const defaultLogs = {
      sales: {
        lastImport: null,
        stats: null,
        errors: []
      }
    };

    try {
      const savedLogs = localStorage.getItem('importLogs');
      if (!savedLogs) return defaultLogs;

      const parsedLogs = JSON.parse(savedLogs);
      
      // Ensure the parsed logs have the correct structure
      return {
        sales: {
          lastImport: parsedLogs.sales?.lastImport || null,
          stats: parsedLogs.sales?.stats || null,
          errors: Array.isArray(parsedLogs.sales?.errors) ? parsedLogs.sales.errors : []
        }
      };
    } catch (error) {
      console.error('Error loading import logs:', error);
      return defaultLogs;
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
      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }); // Use header:1 to get array format
      
      // Validate header row
      const headerRow = jsonData[0];
      if (!headerRow || headerRow.length < 2 || 
          !headerRow[0]?.toString().toLowerCase().includes('recipe') ||
          !headerRow[1]?.toString().toLowerCase().includes('sales')) {
        throw new Error('Invalid file format. Expected columns: Recipe Name, Sales Quantity');
      }

      // Transform and validate data
      const recipesData = jsonData
        .slice(1) // Skip header row
        .map((row, index) => {
          const name = row[0]?.toString().trim();
          const sales = parseInt(row[1]);
          
          if (!name || isNaN(sales)) {
            console.warn(`Skipping invalid row ${index + 2}: ${JSON.stringify(row)}`);
            return null;
          }
          
          return { name, sales };
        })
        .filter(Boolean); // Remove null entries

      if (recipesData.length === 0) {
        throw new Error('No valid recipe data found in the file');
      }

      // Update sales data
      const response = await fetch(`${config.API_URL}/recipes/sales-import`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipes: recipesData })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          response.status === 404 
            ? 'API endpoint not found. Please check server configuration.' 
            : `Server error (${response.status}): ${errorText}`
        );
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to import sales data');
      }

      // Update import logs with current state
      const logDetails = {
        lastImport: new Date().toISOString(),
        stats: {
          totalRows: jsonData.length - 1, // Exclude header
          processedRows: recipesData.length,
          updated: result.summary.updated,
          created: result.summary.created,
          failed: result.summary.failed
        },
        errors: result.failedRecipes.map(f => ({
          recipe: f.name,
          error: f.error,
          timestamp: new Date().toISOString()
        }))
      };

      setImportLogs(prev => ({
        ...prev,
        sales: logDetails
      }));
      
      // Set import stats for UI feedback
      setImportStats(logDetails.stats);

      // Show success message with details
      const message = [
        'Sales data imported successfully:',
        `${result.summary.updated} recipes updated`,
        `${result.summary.created} new recipes created`,
        result.summary.failed > 0 ? `${result.summary.failed} failed` : ''
      ].filter(Boolean).join(', ');

      setError({ 
        message, 
        type: result.summary.failed > 0 ? 'warning' : 'success' 
      });

      // Trigger callback to refresh recipes list
      if (onSalesUpdate) {
        onSalesUpdate();
      }
    } catch (error) {
      console.error('Error importing sales:', error);
      
      // Update error logs
      setImportLogs(prev => ({
        ...prev,
        sales: {
          ...prev.sales,
          errors: [
            {
              error: error.message,
              timestamp: new Date().toISOString()
            },
            ...prev.sales.errors
          ].slice(0, 10) // Keep last 10 errors
        }
      }));

      setError({ 
        message: `Failed to import sales data: ${error.message}`, 
        type: 'error' 
      });
    }

    // Clear file input
    event.target.value = '';
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
              {(importLogs.sales?.errors || []).map((log, index) => (
                <div key={index} className={`history-item error`}>
                  <div className="history-header">
                    <span className="history-date">{formatTimestamp(log.timestamp)}</span>
                    <span className="history-status error">✗</span>
                  </div>
                  <div className="history-details">
                    <div className="error-message">
                      Error: {log.error}
                    </div>
                  </div>
                </div>
              ))}
              {importLogs.sales?.stats && (
                <div className={`history-item success`}>
                  <div className="history-header">
                    <span className="history-date">
                      {formatTimestamp(importLogs.sales.lastImport)}
                    </span>
                    <span className="history-status success">✓</span>
                  </div>
                  <div className="history-details">
                    <div className="history-summary">
                      <span>Total Rows: {importLogs.sales.stats.totalRows}</span>
                      <span>Processed: {importLogs.sales.stats.processedRows}</span>
                    </div>
                    <div className="history-section">
                      <strong>Results:</strong>
                      <div className="recipe-list">
                        <div className="recipe-item">
                          {importLogs.sales.stats.updated} recipes updated
                          {importLogs.sales.stats.created > 0 && 
                            `, ${importLogs.sales.stats.created} new recipes created`}
                          {importLogs.sales.stats.failed > 0 && 
                            `, ${importLogs.sales.stats.failed} failed`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManager;