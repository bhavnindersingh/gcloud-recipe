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
      
      // Transform data for the new endpoint
      const recipesData = jsonData.map(row => ({
        name: row['Recipe Name'],
        sales: parseInt(row['Sales Quantity']) || 0
      })).filter(recipe => recipe.name && recipe.sales >= 0);

      console.log('Processing sales data:', recipesData);

      // Update sales data using the new endpoint
      const response = await fetch(`${config.API_URL}/recipes/sales-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipes: recipesData })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(
          response.status === 404 
            ? 'API endpoint not found. Please check server configuration.' 
            : `Server error: ${response.status}`
        );
      }

      const result = await response.json();
      
      // Add import log with detailed information
      const logDetails = {
        totalRows: jsonData.length,
        processedRows: recipesData.length,
        updatedRecipes: result.results.updated.map(r => ({ name: r.name, sales: r.sales })),
        newRecipes: result.results.created.map(r => ({ name: r.name, sales: r.sales })),
        failedRecipes: result.results.failed.map(r => ({ name: r.name, error: r.error })),
        timestamp: new Date().toISOString()
      };

      console.log('Import completed:', logDetails);
      addImportLog('sales', 'success', logDetails);
      
      // Set import stats for UI feedback
      setImportStats({
        totalRows: jsonData.length,
        processedRows: recipesData.length,
        updated: result.results.updated.length,
        created: result.results.created.length,
        failed: result.results.failed.length
      });

      // Show success message with details
      const message = [
        'Sales data imported successfully:',
        `${result.results.updated.length} recipes updated`,
        `${result.results.created.length} new recipes created`,
        result.results.failed.length > 0 ? `${result.results.failed.length} recipes failed` : ''
      ].filter(Boolean).join(', ');

      setError({ message, type: 'success' });

      // Trigger callback to refresh recipes list
      if (onSalesUpdate) {
        onSalesUpdate();
      }
    } catch (error) {
      console.error('Error importing sales:', error);
      setError({ 
        message: error.message || 'Failed to import sales data', 
        type: 'error' 
      });
      addImportLog('sales', 'error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Reset file input
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
              {importLogs.sales.slice(0, 10).map((log, index) => (
                <div key={index} className={`history-item ${log.status}`}>
                  <div className="history-header">
                    <span className="history-date">{formatTimestamp(log.timestamp)}</span>
                    <span className={`history-status ${log.status}`}>
                      {log.status === 'success' ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="history-details">
                    <div className="history-summary">
                      <span>Total Rows: {log.details?.totalRows || 0}</span>
                      <span>Processed: {log.details?.processedRows || 0}</span>
                    </div>
                    {log.status === 'success' && (
                      <>
                        {log.details?.updatedRecipes?.length > 0 && (
                          <div className="history-section">
                            <strong>Updated Recipes:</strong>
                            <div className="recipe-list">
                              {log.details.updatedRecipes.map((recipe, idx) => (
                                <div key={idx} className="recipe-item">
                                  {recipe.name} (Sales: {recipe.sales})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.details?.newRecipes?.length > 0 && (
                          <div className="history-section">
                            <strong>New Recipes:</strong>
                            <div className="recipe-list">
                              {log.details.newRecipes.map((recipe, idx) => (
                                <div key={idx} className="recipe-item">
                                  {recipe.name} (Sales: {recipe.sales})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.details?.failedRecipes?.length > 0 && (
                          <div className="history-section error">
                            <strong>Failed Recipes:</strong>
                            <div className="recipe-list">
                              {log.details.failedRecipes.map((recipe, idx) => (
                                <div key={idx} className="recipe-item">
                                  {recipe.name} - Error: {recipe.error}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {log.status === 'error' && (
                      <div className="error-message">
                        Error: {log.details?.error || 'Unknown error'}
                      </div>
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