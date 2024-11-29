import React, { useState } from 'react';
import '../styles/ProfitabilityAnalysis.css';

function ProfitabilityAnalysis({ recipes, ingredients }) {
  const [sortField, setSortField] = useState('margin');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const calculateCOGS = (recipe) => {
    // Calculate raw material cost
    const ingredientCost = recipe.ingredients.reduce((total, item) => {
      const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
      return total + (ingredient ? (ingredient.costPerUnit * item.quantity) : 0);
    }, 0);

    // Add labor cost (estimated 30% of ingredient cost)
    const laborCost = ingredientCost * 0.3;

    // Add overhead cost (estimated 20% of ingredient cost)
    const overheadCost = ingredientCost * 0.2;

    // Calculate total COGS
    const totalCOGS = ingredientCost + laborCost + overheadCost;

    return {
      ingredientCost,
      laborCost,
      overheadCost,
      totalCOGS
    };
  };

  const calculateMetrics = (recipe) => {
    const cogs = calculateCOGS(recipe);
    const totalCost = cogs.totalCOGS;
    
    // Recommended selling price calculation
    const targetMargin = 0.65; // 65% target margin
    const recommendedPrice = totalCost / (1 - targetMargin);
    
    // Actual metrics
    const actualPrice = recipe.sellingPrice || recommendedPrice;
    const profit = actualPrice - totalCost;
    const margin = (profit / actualPrice) * 100;
    const roi = (profit / totalCost) * 100;
    const markupPercentage = ((actualPrice - totalCost) / totalCost) * 100;

    return {
      ...cogs,
      totalCost,
      recommendedPrice,
      actualPrice,
      profit,
      margin,
      roi,
      markupPercentage
    };
  };

  const sortRecipes = (recipes) => {
    return [...recipes].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);

        case 'totalCost':
          aValue = calculateMetrics(a).totalCost;
          bValue = calculateMetrics(b).totalCost;
          break;

        case 'sellingPrice':
          aValue = a.sellingPrice;
          bValue = b.sellingPrice;
          break;

        case 'profit':
          aValue = calculateMetrics(a).profit;
          bValue = calculateMetrics(b).profit;
          break;

        case 'margin':
          aValue = calculateMetrics(a).margin;
          bValue = calculateMetrics(b).margin;
          break;

        case 'roi':
          aValue = calculateMetrics(a).roi;
          bValue = calculateMetrics(b).roi;
          break;

        default:
          return 0;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  const handleSort = (field) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIndicator = (field) => {
    if (field === sortField) {
      return sortOrder === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  };

  const sortedRecipes = sortRecipes(recipes);

  if (recipes.length === 0) {
    return (
      <div className="profitability-analysis empty">
        <h3>No Data Available</h3>
        <p>Add some recipes to see profitability analysis.</p>
      </div>
    );
  }

  return (
    <div className="profitability-analysis">
      <div className="analysis-header">
        <h2>Profitability Analysis</h2>
        <div className="summary-metrics">
          <div className="metric-card">
            <h3>Average Profit Margin</h3>
            <p className="metric-value">
              {(sortedRecipes.reduce((sum, recipe) => 
                sum + calculateMetrics(recipe).margin, 0) / sortedRecipes.length).toFixed(1)}%
            </p>
          </div>
          <div className="metric-card">
            <h3>Average ROI</h3>
            <p className="metric-value">
              {(sortedRecipes.reduce((sum, recipe) => 
                sum + calculateMetrics(recipe).roi, 0) / sortedRecipes.length).toFixed(1)}%
            </p>
          </div>
          <div className="metric-card">
            <h3>Total Quarterly Revenue</h3>
            <p className="metric-value">
              {formatCurrency(sortedRecipes.reduce((sum, recipe) => 
                sum + (recipe.sellingPrice * (recipe.averageMonthlySales || 0)), 0))}
            </p>
          </div>
        </div>
      </div>

      <div className="analysis-content">
        <div className="recipes-table">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>
                  Recipe Name{getSortIndicator('name')}
                </th>
                <th onClick={() => handleSort('totalCost')}>
                  COGS{getSortIndicator('totalCost')}
                </th>
                <th onClick={() => handleSort('sellingPrice')}>
                  Selling Price{getSortIndicator('sellingPrice')}
                </th>
                <th onClick={() => handleSort('profit')}>
                  Profit{getSortIndicator('profit')}
                </th>
                <th onClick={() => handleSort('margin')}>
                  Margin{getSortIndicator('margin')}
                </th>
                <th onClick={() => handleSort('roi')}>
                  ROI{getSortIndicator('roi')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecipes.map(recipe => {
                const metrics = calculateMetrics(recipe);
                return (
                  <tr key={recipe.id} className={selectedRecipe?.id === recipe.id ? 'selected' : ''}>
                    <td>{recipe.name}</td>
                    <td>{formatCurrency(metrics.totalCOGS)}</td>
                    <td>{formatCurrency(recipe.sellingPrice)}</td>
                    <td>{formatCurrency(metrics.profit)}</td>
                    <td>{metrics.margin.toFixed(1)}%</td>
                    <td>{metrics.roi.toFixed(1)}%</td>
                    <td>
                      <button 
                        className="detail-button"
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selectedRecipe && (
          <div className="recipe-detail-card">
            <h3>{selectedRecipe.name} - Detailed Analysis</h3>
            <div className="cost-breakdown">
              <h4>Cost Breakdown</h4>
              {Object.entries(calculateCOGS(selectedRecipe)).map(([key, value]) => (
                <div key={key} className="cost-item">
                  <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                  <span>{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
            <div className="pricing-analysis">
              <h4>Pricing Analysis</h4>
              <div className="price-metrics">
                <div className="metric">
                  <span>Recommended Price</span>
                  <span>{formatCurrency(calculateMetrics(selectedRecipe).recommendedPrice)}</span>
                </div>
                <div className="metric">
                  <span>Current Price</span>
                  <span>{formatCurrency(selectedRecipe.sellingPrice)}</span>
                </div>
                <div className="metric">
                  <span>Markup Percentage</span>
                  <span>{calculateMetrics(selectedRecipe).markupPercentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <button 
              className="close-detail"
              onClick={() => setSelectedRecipe(null)}
            >
              Close Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfitabilityAnalysis;
