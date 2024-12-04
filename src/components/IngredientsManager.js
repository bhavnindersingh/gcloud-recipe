import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { INGREDIENT_CATEGORIES } from '../constants/ingredientCategories';
import '../styles/shared.css';
import '../styles/IngredientsManager.css';

const API_URL = 'http://localhost:3001/api';

const IngredientsManager = ({ ingredients, setIngredients }) => {
  const fileInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: '',
    cost: '',
    category: 'Vegetables & Fruits'
  });
  const [error, setError] = useState('');

  // Fetch ingredients on component mount
  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      console.log('Fetching ingredients from:', `${API_URL}/ingredients`);
      const response = await fetch(`${API_URL}/ingredients`);
      if (!response.ok) throw new Error('Failed to fetch ingredients');
      const data = await response.json();
      console.log('Raw data from server:', data);
      
      // Ensure all ingredients have properly formatted costs
      const formattedData = data.map(ingredient => {
        // Safely parse the cost value
        let cost = 0;
        try {
          if (ingredient.cost === null || ingredient.cost === undefined) {
            cost = 0;
          } else if (typeof ingredient.cost === 'string') {
            cost = parseFloat(ingredient.cost.replace(/[^\d.-]/g, '')) || 0;
          } else if (typeof ingredient.cost === 'number') {
            cost = isNaN(ingredient.cost) ? 0 : ingredient.cost;
          }
        } catch (e) {
          console.error(`Error parsing cost for ${ingredient.name}:`, e);
          cost = 0;
        }

        console.log(`Processed ${ingredient.name}:`, {
          originalCost: ingredient.cost,
          processedCost: cost
        });

        return {
          ...ingredient,
          cost
        };
      });

      console.log('Final formatted data:', formattedData);
      setIngredients(formattedData);
    } catch (err) {
      setError('Failed to load ingredients');
      console.error('Error fetching ingredients:', err);
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
    setError('');
  };

  const validateIngredient = () => {
    if (!newIngredient.name.trim()) return 'Name is required';
    if (!newIngredient.unit.trim()) return 'Unit is required';
    if (!newIngredient.cost || isNaN(newIngredient.cost) || Number(newIngredient.cost) <= 0) {
      return 'Cost must be a positive number';
    }
    
    // Check for duplicate ingredient names (case-insensitive)
    const isDuplicate = ingredients.some(
      ingredient => ingredient.name.toLowerCase() === newIngredient.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      return 'This ingredient already exists';
    }
    
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateIngredient();
    if (validationError) {
      setError(validationError);
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
          name: newIngredient.name,
          cost: Number(newIngredient.cost),
          unit: newIngredient.unit,
          category: newIngredient.category
        }),
      });

      if (!response.ok) throw new Error('Failed to add ingredient');
      
      const savedIngredient = await response.json();
      console.log('Saved ingredient:', savedIngredient);
      setIngredients(prev => [...prev, savedIngredient]);
      setNewIngredient({
        name: '',
        unit: '',
        cost: '',
        category: 'Vegetables & Fruits'
      });
    } catch (err) {
      setError('Failed to save ingredient');
      console.error('Error saving ingredient:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/ingredients/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete ingredient');
      
      setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
    } catch (err) {
      setError('Failed to delete ingredient');
      console.error('Error deleting ingredient:', err);
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
        alert('Ingredients imported successfully!');

      } catch (error) {
        console.error('Import error:', error);
        alert('Error importing ingredients: ' + error.message);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="ingredients-manager-container">
      <div className="page-title-container">
        <h1 className="page-title">
          Ingredient Management
          <div className="data-buttons">
            <input
              type="file"
              ref={fileInputRef}
              onChange={importIngredients}
              className="file-input-hidden"
              accept=".xlsx,.xls"
            />
            <button className="icon-btn" onClick={exportIngredients} title="Export to Excel">
              <img src={process.env.PUBLIC_URL + '/export-icon.svg'} alt="Export" className="btn-icon" />
            </button>
            <button className="icon-btn" onClick={() => fileInputRef.current.click()} title="Import from Excel">
              <img src={process.env.PUBLIC_URL + '/import-icon.svg'} alt="Import" className="btn-icon" />
            </button>
          </div>
        </h1>
      </div>
      <div className="ingredients-manager">
        <form onSubmit={handleSubmit} className="neo-card mb-4">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                value={newIngredient.name}
                onChange={handleInputChange}
                placeholder="Enter ingredient name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="unit">Unit</label>
              <select
                id="unit"
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
              <label className="form-label" htmlFor="cost">Cost (₹)</label>
              <input
                type="number"
                id="cost"
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
              <label className="form-label" htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                className="form-input form-select"
                value={newIngredient.category}
                onChange={handleInputChange}
              >
                {INGREDIENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="error-message text-error mb-3">{error}</p>}

          <div className="form-actions">
            <div className="actions-left">
              <button type="submit" className="btn btn-success">
                Add Ingredient
              </button>
            </div>
            <div className="actions-right">
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <button
                  type="button"
                  className="btn btn-success search-button"
                  disabled={!searchTerm}
                >
                  Search
                </button>
                {searchTerm && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchTerm('')}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map(ingredient => {
                // Ensure cost is a valid number
                const cost = typeof ingredient.cost === 'number' && !isNaN(ingredient.cost) 
                  ? ingredient.cost 
                  : 0;
                    
                return (
                  <tr key={ingredient.id} className="fade-in">
                    <td>{ingredient.name}</td>
                    <td>{ingredient.unit}</td>
                    <td>₹{cost.toFixed(2)}</td>
                    <td>{ingredient.category || 'Vegetables & Fruits'}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(ingredient.id)}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
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
