import React, { useState } from 'react';
import '../styles/shared.css';
import '../styles/IngredientsManager.css';

const IngredientsManager = ({ ingredients, setIngredients }) => {
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: '',
    cost: '',
    supplier: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewIngredient(prev => ({
      ...prev,
      [name]: value
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateIngredient();
    if (validationError) {
      setError(validationError);
      return;
    }

    const newIngredientWithId = {
      ...newIngredient,
      id: Date.now(),
      cost: Number(newIngredient.cost)
    };

    setIngredients(prev => [...prev, newIngredientWithId]);
    setNewIngredient({
      name: '',
      unit: '',
      cost: '',
      supplier: ''
    });
  };

  const handleDelete = (id) => {
    setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
  };

  return (
    <div className="ingredients-manager">
      <h2 className="mb-4">Manage Ingredients</h2>
      
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
            <label className="form-label" htmlFor="supplier">Supplier</label>
            <input
              type="text"
              id="supplier"
              name="supplier"
              className="form-input"
              value={newIngredient.supplier}
              onChange={handleInputChange}
              placeholder="Enter supplier name (optional)"
            />
          </div>
        </div>

        {error && <p className="error-message text-error mb-3">{error}</p>}

        <button type="submit" className="btn btn-success">
          Add Ingredient
        </button>
      </form>

      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Unit</th>
              <th>Cost (₹)</th>
              <th>Supplier</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map(ingredient => (
              <tr key={ingredient.id} className="fade-in">
                <td>{ingredient.name}</td>
                <td>{ingredient.unit}</td>
                <td>₹{ingredient.cost.toFixed(2)}</td>
                <td>{ingredient.supplier || '-'}</td>
                <td>
                  <button
                    onClick={() => handleDelete(ingredient.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-secondary">
                  No ingredients added yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IngredientsManager;
