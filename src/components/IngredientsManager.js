import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { INGREDIENT_CATEGORIES } from '../constants/ingredientCategories';
import config from '../config/env';
import '../styles/shared.css';
import '../styles/IngredientsManager.css';

const API_URL = config.API_URL;

const IngredientsManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: '',
    cost: '',
    category: 'Vegetables & Fruits'
  });
  const [error, setError] = useState({ message: '', type: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingValues, setEditingValues] = useState({
    cost: '',
    category: ''
  });

  const showToast = (message, type = 'success') => {
    setError({ message, type });
    setTimeout(() => {
      setError({ message: '', type: '' });
    }, 3000);
  };

  // Fetch ingredients on component mount
  useEffect(() => {
    const fetchIngredientsData = async () => {
      try {
        console.log('Fetching ingredients from:', `${API_URL}/ingredients`);
        const response = await fetch(`${API_URL}/ingredients`);
        if (!response.ok) throw new Error('Failed to fetch ingredients');
        const data = await response.json();
        // Ensure all costs are properly parsed as numbers
        const processedData = data.map(ingredient => ({
          ...ingredient,
          cost: parseFloat(ingredient.cost) || 0
        }));
        setIngredients(processedData);
      } catch (error) {
        console.error('Error fetching ingredients:', error);
        setError('Failed to fetch ingredients. Please try again later.');
      }
    };

    fetchIngredientsData();
  }, []); // Run only on mount

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    const validationError = validateIngredient();
    if (validationError) {
      setError({ message: validationError, type: 'error' });
      return;
    }

    try {
      console.log('Saving ingredient:', newIngredient);
      const response = await fetch(`${API_URL}/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newIngredient.name.trim(),
          cost: Number(newIngredient.cost),
          unit: newIngredient.unit.trim(),
          category: newIngredient.category.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add ingredient');
      }
      
      const savedIngredient = await response.json();
      console.log('Saved ingredient:', savedIngredient);
      setIngredients(prev => [...prev, savedIngredient]);
      setNewIngredient({
        name: '',
        unit: '',
        cost: '',
        category: 'Vegetables & Fruits'
      });
      setError({ message: 'Ingredient added successfully', type: 'success' });
    } catch (err) {
      console.error('Error saving ingredient:', err);
      setError({ message: err.message, type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/ingredients/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If ingredient is being used in recipes (foreign key constraint)
        if (response.status === 500) {
          showToast('This ingredient is being used in recipes. You can edit its cost instead of deleting.', 'error');
          return;
        }
        throw new Error('Failed to delete ingredient');
      }
      
      setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
      showToast('Ingredient deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting ingredient:', err);
      showToast(err.message, 'error');
    }
  };

  const exportIngredients = () => {
    // Prepare ingredients data for export
    const exportData = ingredients.map(({ id, ...ingredient }) => ({
      Name: ingredient.name,
      Unit: ingredient.unit,
      'Cost (₹)': ingredient.cost,
      Category: ingredient.category
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Name
      { wch: 10 }, // Unit
      { wch: 12 }, // Cost
      { wch: 20 }  // Category
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Ingredients');

    // Save file
    XLSX.writeFile(wb, 'ingredients.xlsx');
  };

  const importIngredients = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(ws);
        
        // Transform and validate data
        const newIngredients = jsonData.map(row => {
          const ingredient = {
            id: Date.now() + Math.random(),
            name: row.Name || row.name,
            unit: row.Unit || row.unit,
            cost: Number(row['Cost (₹)'] || row.cost || 0),
            category: row.Category || row.category || 'Vegetables & Fruits'
          };

          // Validate required fields
          if (!ingredient.name || !ingredient.unit || ingredient.cost <= 0) {
            throw new Error('Invalid ingredient data: Missing required fields or invalid cost');
          }

          return ingredient;
        });

        // Update ingredients state
        setIngredients(prev => {
          // Create a map of existing ingredients by name
          const existingMap = new Map(prev.map(ing => [ing.name.toLowerCase(), ing]));
          
          // Filter out duplicates and combine with existing
          const uniqueNew = newIngredients.filter(ing => !existingMap.has(ing.name.toLowerCase()));
          return [...prev, ...uniqueNew];
        });

        // Clear file input
        event.target.value = '';
        showToast('Ingredients imported successfully', 'success');
      } catch (error) {
        console.error('Import error:', error);
        showToast('Error importing ingredients: ' + error.message, 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleEdit = (ingredient) => {
    setEditingId(ingredient.id);
    setEditingValues({
      cost: ingredient.cost.toString(),
      category: ingredient.category
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValues({
      cost: '',
      category: ''
    });
  };

  const handleSaveEdit = async (ingredient) => {
    try {
      const response = await fetch(`${API_URL}/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...ingredient,
          cost: parseFloat(editingValues.cost),
          category: editingValues.category
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update ingredient');
      }

      setIngredients(prev => prev.map(ing => 
        ing.id === ingredient.id 
          ? { ...ing, cost: parseFloat(editingValues.cost), category: editingValues.category }
          : ing
      ));
      setEditingId(null);
      setEditingValues({
        cost: '',
        category: ''
      });
      showToast('Ingredient updated successfully', 'success');
    } catch (err) {
      console.error('Error updating ingredient:', err);
      showToast(err.message, 'error');
    }
  };

  // Filter ingredients based on search term
  const filteredIngredients = ingredients.filter(ingredient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      ingredient.name.toLowerCase().includes(searchLower) ||
      ingredient.category?.toLowerCase().includes(searchLower) ||
      ingredient.unit.toLowerCase().includes(searchLower)
    );
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewIngredient(prev => ({
      ...prev,
      [name]: name === 'cost' ? (value === '' ? '' : parseFloat(value) || 0) : value
    }));
    setError({ message: '', type: '' });
  };

  const validateIngredient = () => {
    if (!newIngredient.name?.trim()) {
      return 'Name is required';
    }
    if (!newIngredient.unit?.trim()) {
      return 'Unit is required';
    }
    if (!newIngredient.cost || isNaN(Number(newIngredient.cost))) {
      return 'Cost must be a valid number';
    }
    if (!newIngredient.category?.trim()) {
      return 'Category is required';
    }
    return null;
  };

  return (
    <div className="ingredients-manager-container">
      {error.message && (
        <div className={`toast-message ${error.type}`}>
          {error.message}
        </div>
      )}
      <div className="page-title-card">
        <h1 className="page-title">Ingredients Manager</h1>
        <div className="data-buttons">
          <input
            type="file"
            style={{ display: 'none' }}
            onChange={importIngredients}
            accept=".xlsx,.xls"
          />
          <button className="icon-btn" onClick={exportIngredients} title="Export to Excel">
            <img src={process.env.PUBLIC_URL + '/export-icon.svg'} alt="Export" className="btn-icon" />
          </button>
        </div>
      </div>
      <div className="ingredients-content">
        <form onSubmit={handleAddIngredient}>
          <div className="add-ingredient-form">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={newIngredient.name}
                  onChange={handleInputChange}
                  placeholder="Enter ingredient name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select
                  name="unit"
                  className="form-input form-select"
                  value={newIngredient.unit}
                  onChange={handleInputChange}
                >
                  <option value="">Select unit</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="l">Liter (l)</option>
                  <option value="ml">Milliliter (ml)</option>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="dozen">Dozen</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cost (₹)</label>
                <input
                  type="number"
                  name="cost"
                  className="form-input"
                  value={newIngredient.cost}
                  onChange={handleInputChange}
                  placeholder="Enter cost per unit"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  name="category"
                  className="form-input form-select"
                  value={newIngredient.category}
                  onChange={handleInputChange}
                >
                  {INGREDIENT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="actions-card">
            <div className="form-buttons">
              <div className="form-buttons-left">
                <button type="submit" className="btn-add">
                  Add Ingredient
                </button>
              </div>
              <div className="form-buttons-right">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search ingredients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <button
                    type="button"
                    className="btn-search"
                    disabled={!searchTerm}
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit</th>
                <th>Cost (₹)</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map(ingredient => (
                <tr key={ingredient.id}>
                  <td>{ingredient.name}</td>
                  <td>{ingredient.unit}</td>
                  <td>
                    {editingId === ingredient.id ? (
                      <input
                        type="number"
                        value={editingValues.cost}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, cost: e.target.value }))}
                        className="edit-input"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      `₹${ingredient.cost}`
                    )}
                  </td>
                  <td>
                    {editingId === ingredient.id ? (
                      <select
                        value={editingValues.category}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, category: e.target.value }))}
                        className="edit-input"
                      >
                        {INGREDIENT_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    ) : (
                      ingredient.category
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editingId === ingredient.id ? (
                        <>
                          <button 
                            className="save-btn"
                            onClick={() => handleSaveEdit(ingredient)}
                            title="Save"
                          >
                            <span role="img" aria-label="Save">✔️</span>
                          </button>
                          <button 
                            className="cancel-btn"
                            onClick={handleCancelEdit}
                            title="Cancel"
                          >
                            <span role="img" aria-label="Cancel">❌</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="edit-btn"
                            onClick={() => handleEdit(ingredient)}
                            title="Edit"
                          >
                            <span role="img" aria-label="Edit">✏️</span>
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(ingredient.id)}
                            title="Delete"
                          >
                            <span role="img" aria-label="Delete">🗑️</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredIngredients.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-secondary">
                    {ingredients.length === 0 ? 'No ingredients added yet' : 'No matching ingredients found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IngredientsManager;
