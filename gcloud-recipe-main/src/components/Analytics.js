import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import '../styles/Analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const TARGET_MF = 4;
const MF_WARNING = 3.5;

const Analytics = ({ recipes }) => {
  const [activeTab, setActiveTab] = useState('mf');
  const [sortConfig, setSortConfig] = useState({
    key: 'quarterlyImpact',
    direction: 'desc'
  });

  const getMFStatus = (mf) => {
    if (!isFinite(mf) || mf <= 0) return 'danger';
    if (mf >= TARGET_MF) return 'success';
    if (mf >= MF_WARNING) return 'warning';
    return 'danger';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#2ecc71';
      case 'warning': return '#f1c40f';
      case 'danger': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const sortData = (data, key, direction) => {
    return [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      // Handle numeric values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string values
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return 0;
    });
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    const isActive = sortConfig.key === columnKey;
    return (
      <span className={`sort-icon ${isActive ? 'active' : ''}`}>
        {isActive ? (sortConfig.direction === 'asc' ? '△' : '▽') : '▽'}
      </span>
    );
  };

  const metrics = useMemo(() => {
    const categoryMetrics = {};
    let totalMFSum = 0;
    let totalRecipeCount = 0;
    let totalQuarterlyRevenue = 0;
    let totalQuarterlyCost = 0;
    let totalQuarterlyGrossProfit = 0;

    // First pass: Calculate recipe metrics
    const recipeMetrics = recipes.map(recipe => {
      const sellingPrice = parseFloat(recipe.sellingPrice) || 0;
      const quarterlySales = parseInt(recipe.quarterlySales) || 0;
      
      // Calculate COGS
      const cogs = recipe.ingredients.reduce((sum, ingredient) => {
        const quantity = parseFloat(ingredient.quantity) || 0;
        const cost = parseFloat(ingredient.cost) || 0;
        return sum + (quantity * cost);
      }, 0);

      if (cogs <= 0 || !sellingPrice) {
        console.warn(`Invalid recipe data for ${recipe.name}: COGS=${cogs}, sellingPrice=${sellingPrice}`);
        return null;
      }

      const recipeMF = sellingPrice / cogs;
      const quarterlyRevenue = sellingPrice * quarterlySales;
      const quarterlyCost = cogs * quarterlySales;
      const quarterlyGrossProfit = quarterlyRevenue - quarterlyCost;
      const grossProfitMargin = (quarterlyGrossProfit / quarterlyRevenue) * 100;

      // Calculate target metrics
      const targetPrice = cogs * TARGET_MF;
      const priceAdjustment = targetPrice - sellingPrice;
      const targetQuarterlyRevenue = targetPrice * quarterlySales;
      const targetQuarterlyGrossProfit = targetQuarterlyRevenue - quarterlyCost;
      const grossProfitImpact = targetQuarterlyGrossProfit - quarterlyGrossProfit;

      totalQuarterlyRevenue += quarterlyRevenue;
      totalQuarterlyCost += quarterlyCost;
      totalQuarterlyGrossProfit += quarterlyGrossProfit;

      return {
        name: recipe.name,
        category: recipe.category,
        cogs,
        sellingPrice,
        recipeMF,
        quarterlySales,
        quarterlyRevenue,
        quarterlyCost,
        quarterlyGrossProfit,
        grossProfitMargin,
        costImpact: 0, // Will be calculated in second pass
        targetPrice,
        priceAdjustment,
        grossProfitImpact
      };
    }).filter(Boolean);

    // Second pass: Calculate relative impacts
    const enrichedRecipeMetrics = recipeMetrics.map(recipe => ({
      ...recipe,
      costImpact: (recipe.quarterlyCost / totalQuarterlyCost) * 100,
      revenueImpact: (recipe.quarterlyRevenue / totalQuarterlyRevenue) * 100,
      grossProfitShare: (recipe.quarterlyGrossProfit / totalQuarterlyGrossProfit) * 100
    }));

    // Group by category
    enrichedRecipeMetrics.forEach(recipe => {
      if (!categoryMetrics[recipe.category]) {
        categoryMetrics[recipe.category] = {
          recipes: [],
          totalMF: 0,
          recipeCount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalGrossProfit: 0
        };
      }

      categoryMetrics[recipe.category].recipes.push(recipe);
      categoryMetrics[recipe.category].totalMF += recipe.recipeMF;
      categoryMetrics[recipe.category].recipeCount += 1;
      categoryMetrics[recipe.category].totalRevenue += recipe.quarterlyRevenue;
      categoryMetrics[recipe.category].totalCost += recipe.quarterlyCost;
      categoryMetrics[recipe.category].totalGrossProfit += recipe.quarterlyGrossProfit;

      totalMFSum += recipe.recipeMF;
      totalRecipeCount += 1;
    });

    // Calculate category performance
    const categoryPerformance = Object.entries(categoryMetrics).map(([category, data]) => {
      const avgMF = data.recipeCount > 0 ? data.totalMF / data.recipeCount : 0;
      const targetGap = TARGET_MF - avgMF;
      const recipesBelowTarget = data.recipes.filter(r => r.recipeMF < TARGET_MF).length;
      const grossProfitMargin = (data.totalGrossProfit / data.totalRevenue) * 100;
      
      return {
        category,
        avgMF,
        targetGap,
        recipesBelowTarget,
        totalRevenue: data.totalRevenue,
        totalCost: data.totalCost,
        totalGrossProfit: data.totalGrossProfit,
        grossProfitMargin,
        revenueShare: (data.totalRevenue / totalQuarterlyRevenue) * 100,
        costShare: (data.totalCost / totalQuarterlyCost) * 100,
        grossProfitShare: (data.totalGrossProfit / totalQuarterlyGrossProfit) * 100,
        recipes: data.recipes,
        recipeCount: data.recipeCount
      };
    });

    // Sort recipes by gross profit impact
    const sortedRecipes = enrichedRecipeMetrics.sort((a, b) => b.grossProfitImpact - a.grossProfitImpact);

    return {
      overallMF: totalRecipeCount > 0 ? totalMFSum / totalRecipeCount : 0,
      categoryPerformance,
      recipeAdjustments: sortedRecipes,
      totalRevenue: totalQuarterlyRevenue,
      totalCost: totalQuarterlyCost,
      totalGrossProfit: totalQuarterlyGrossProfit,
      overallGrossProfitMargin: (totalQuarterlyGrossProfit / totalQuarterlyRevenue) * 100
    };
  }, [recipes]);

  const sortedRecipeAdjustments = useMemo(() => {
    return sortData(metrics.recipeAdjustments, sortConfig.key, sortConfig.direction);
  }, [metrics.recipeAdjustments, sortConfig]);

  const renderMFAnalysis = () => (
    <>
      <div className="overview-grid">
        <div className="mf-status-card">
          <h3>Overall Performance</h3>
          <div className="progress-container">
            <div 
              className="progress-bar"
              style={{ 
                width: `${Math.min((metrics.overallMF / TARGET_MF) * 100, 100)}%`,
                backgroundColor: getStatusColor(getMFStatus(metrics.overallMF))
              }}
            />
            <span className="progress-text">
              {metrics.overallMF.toFixed(2)}x / {TARGET_MF}x
            </span>
          </div>
          <div className="mf-summary">
            <p>Target M/F: {TARGET_MF}x</p>
            <p className={getMFStatus(metrics.overallMF)}>
              Current Average M/F: {metrics.overallMF.toFixed(2)}x
            </p>
            <p>
              {metrics.overallMF >= TARGET_MF 
                ? `Above Target: ${(metrics.overallMF - TARGET_MF).toFixed(2)}x`
                : `Gap to target: ${(TARGET_MF - metrics.overallMF).toFixed(2)}x`
              }
            </p>
            <div className="quarterly-metrics">
              <div className="metric">
                <span>Quarterly Revenue</span>
                <span>₹{metrics.totalRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="metric">
                <span>Quarterly Cost</span>
                <span>₹{metrics.totalCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="metric">
                <span>Quarterly Gross Profit</span>
                <span>₹{metrics.totalGrossProfit.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              <div className="metric">
                <span>Gross Profit Margin</span>
                <span>{metrics.overallGrossProfitMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="category-performance">
          <h3>Category Performance</h3>
          <div className="performance-cards">
            {metrics.categoryPerformance.map(cat => (
              <div key={cat.category} className="category-card">
                <h4>{cat.category}</h4>
                <div className={`mf-value ${getMFStatus(cat.avgMF)}`}>
                  {cat.avgMF.toFixed(1)}x
                </div>
                <div className="target-gap">
                  {cat.targetGap > 0 ? (
                    <span className="gap-negative">Target Gap: {cat.targetGap.toFixed(1)}x</span>
                  ) : (
                    <span className="gap-positive">Above Target: {Math.abs(cat.targetGap).toFixed(1)}x</span>
                  )}
                </div>
                <div className="category-metrics">
                  <div className="recipes-below">
                    {cat.recipesBelowTarget} recipes below target
                  </div>
                  <div className="category-stats">
                    <div className="stat">
                      <span>Revenue Share</span>
                      <span>{cat.revenueShare.toFixed(1)}%</span>
                    </div>
                    <div className="stat">
                      <span>Cost Share</span>
                      <span>{cat.costShare.toFixed(1)}%</span>
                    </div>
                    <div className="stat">
                      <span>Gross Profit Share</span>
                      <span>{cat.grossProfitShare.toFixed(1)}%</span>
                    </div>
                    <div className="stat">
                      <span>Gross Profit Margin</span>
                      <span>{cat.grossProfitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="adjustments-section">
        <h3>Recipe Impact Analysis</h3>
        <div className="table-container">
          <table className="adjustments-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>
                  Recipe {getSortIcon('name')}
                </th>
                <th onClick={() => requestSort('category')} style={{ cursor: 'pointer' }}>
                  Category {getSortIcon('category')}
                </th>
                <th onClick={() => requestSort('cogs')} style={{ cursor: 'pointer' }}>
                  COGS {getSortIcon('cogs')}
                </th>
                <th onClick={() => requestSort('recipeMF')} style={{ cursor: 'pointer' }}>
                  Current M/F {getSortIcon('recipeMF')}
                </th>
                <th onClick={() => requestSort('quarterlySales')} style={{ cursor: 'pointer' }}>
                  Quarterly Sales {getSortIcon('quarterlySales')}
                </th>
                <th onClick={() => requestSort('quarterlyRevenue')} style={{ cursor: 'pointer' }}>
                  Revenue {getSortIcon('quarterlyRevenue')}
                </th>
                <th onClick={() => requestSort('quarterlyCost')} style={{ cursor: 'pointer' }}>
                  Cost {getSortIcon('quarterlyCost')}
                </th>
                <th onClick={() => requestSort('quarterlyGrossProfit')} style={{ cursor: 'pointer' }}>
                  Gross Profit {getSortIcon('quarterlyGrossProfit')}
                </th>
                <th onClick={() => requestSort('grossProfitMargin')} style={{ cursor: 'pointer' }}>
                  Margin % {getSortIcon('grossProfitMargin')}
                </th>
                <th onClick={() => requestSort('costImpact')} style={{ cursor: 'pointer' }}>
                  Cost Impact % {getSortIcon('costImpact')}
                </th>
                <th onClick={() => requestSort('grossProfitImpact')} style={{ cursor: 'pointer' }}>
                  Gross Profit Impact {getSortIcon('grossProfitImpact')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRecipeAdjustments.map(recipe => (
                <tr key={recipe.name}>
                  <td>{recipe.name}</td>
                  <td>{recipe.category}</td>
                  <td>₹{recipe.cogs.toFixed(2)}</td>
                  <td className={getMFStatus(recipe.recipeMF)}>
                    {recipe.recipeMF.toFixed(1)}x
                  </td>
                  <td>{recipe.quarterlySales}</td>
                  <td>₹{recipe.quarterlyRevenue.toFixed(2)}</td>
                  <td>₹{recipe.quarterlyCost.toFixed(2)}</td>
                  <td>₹{recipe.quarterlyGrossProfit.toFixed(2)}</td>
                  <td>{recipe.grossProfitMargin.toFixed(1)}%</td>
                  <td>{recipe.costImpact.toFixed(1)}%</td>
                  <td className={recipe.grossProfitImpact > 0 ? 'gap-positive' : 'gap-negative'}>
                    ₹{recipe.grossProfitImpact.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderIngredientAnalysis = () => (
    <div className="ingredient-analysis">
      <div className="cost-drivers">
        <h3>Top Cost-Driving Ingredients</h3>
        <div className="drivers-list">
          {metrics.topIngredients.map((ingredient, index) => (
            <div key={ingredient.name} className="driver-item">
              <span className="rank">{index + 1}</span>
              <div className="driver-details">
                <h4>{ingredient.name}</h4>
                <div className="driver-stats">
                  <span>Cost Impact: ₹{ingredient.costImpact.toFixed(0)}</span>
                  <span>Used in {ingredient.recipesAffected} recipes</span>
                  <span>{ingredient.totalQuantity.toFixed(1)} {ingredient.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="usage-chart">
        <h3>Ingredient Usage Distribution</h3>
        <Doughnut 
          data={{
            labels: metrics.topIngredients.map(i => i.name),
            datasets: [{
              data: metrics.topIngredients.map(i => i.costImpact),
              backgroundColor: [
                '#2ecc71',
                '#3498db',
                '#9b59b6',
                '#e67e22',
                '#e74c3c'
              ]
            }]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'right'
              }
            }
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="analytics-container">
      <div className="analytics-tabs">
        <button 
          className={`tab-button ${activeTab === 'mf' ? 'active' : ''}`}
          onClick={() => setActiveTab('mf')}
        >
          M/F Analysis
        </button>
        <button 
          className={`tab-button ${activeTab === 'ingredients' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingredients')}
        >
          Ingredient Analysis
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'mf' && renderMFAnalysis()}
        {activeTab === 'ingredients' && renderIngredientAnalysis()}
      </div>
    </div>
  );
};

export default Analytics;
