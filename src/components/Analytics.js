import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import '../styles/Analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const sortData = (data) => {
  return [...data].sort((a, b) => {
    const mfA = ((a.selling_price - a.total_cost) / a.selling_price) * 100 || 0;
    const mfB = ((b.selling_price - b.total_cost) / b.selling_price) * 100 || 0;
    return mfB - mfA;
  });
};

const getMFStatus = (mf) => {
  if (isNaN(mf) || mf === null) return { status: 'missing', text: 'Missing Data' };
  if (mf >= 65) return { status: 'good', text: 'Good' };
  if (mf >= 55) return { status: 'warning', text: 'Warning' };
  return { status: 'poor', text: 'Poor' };
};

const prepareChartData = (sortedData) => {
  const labels = sortedData.map(recipe => recipe.name);
  const marginFactors = sortedData.map(recipe => {
    const cost = recipe.total_cost || 0;
    if (!recipe.selling_price) return 0;
    return ((recipe.selling_price - cost) / recipe.selling_price) * 100;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Margin Factor %',
        data: marginFactors,
        fill: true,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgb(34, 197, 94)',
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }
    ]
  };
};

const Analytics = ({ recipes }) => {
  console.log('Analytics component - Received recipes:', recipes);

  const [hoveredRecipe, setHoveredRecipe] = useState(null);

  const validRecipes = useMemo(() => {
    const filtered = recipes.filter(recipe => 
      recipe && 
      recipe.selling_price !== undefined && 
      recipe.selling_price !== null && 
      recipe.selling_price !== '' && 
      Number(recipe.selling_price) > 0
    );
    console.log('Analytics component - Valid recipes:', filtered);
    return filtered;
  }, [recipes]);

  const sortedData = useMemo(() => sortData(validRecipes), [validRecipes]);
  
  const chartData = useMemo(() => prepareChartData(sortedData), [sortedData]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const recipe = sortedData[context.dataIndex];
            return [
              `Margin Factor: ${context.raw.toFixed(2)}%`,
              `Cost: ₹${recipe.total_cost.toFixed(2)}`,
              `Selling Price: ₹${recipe.selling_price.toFixed(2)}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Margin Factor (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Recipes'
        }
      }
    },
    onHover: (event, elements) => {
      if (elements && elements.length > 0) {
        setHoveredRecipe(sortedData[elements[0].index]);
      } else {
        setHoveredRecipe(null);
      }
    }
  };

  if (recipes.length === 0) {
    return (
      <div className="analytics-container">
        <div className="page-title-card">
          <h1 className="page-title">Analytics Dashboard</h1>
        </div>
        <div className="analytics-content">
          <div className="empty-state">
            <p>No recipes found. Add some recipes to see analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  if (validRecipes.length === 0) {
    return (
      <div className="analytics-container">
        <div className="page-title-card">
          <h1 className="page-title">Analytics Dashboard</h1>
        </div>
        <div className="analytics-content">
          <div className="empty-state">
            <p>No recipes with selling prices found. Please set selling prices for your recipes to view analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  const averageMF = sortedData.reduce((acc, recipe) => {
    const cost = recipe.total_cost || 0;
    const mf = ((recipe.selling_price - cost) / recipe.selling_price) * 100;
    return acc + mf;
  }, 0) / sortedData.length;

  const totalRevenue = sortedData.reduce((acc, recipe) => acc + Number(recipe.selling_price), 0);
  const totalCost = sortedData.reduce((acc, recipe) => acc + (Number(recipe.total_cost) || 0), 0);

  return (
    <div className="analytics-container">
      <div className="page-title-card">
        <h1 className="page-title">Analytics Dashboard</h1>
      </div>

      <div className="analytics-content">
        <div className="analytics-overview">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Average Margin Factor</span>
              <span className="stat-value">{averageMF.toFixed(2)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Revenue Potential</span>
              <span className="stat-value">₹{totalRevenue.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Cost</span>
              <span className="stat-value">₹{totalCost.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Recipe Count</span>
              <span className="stat-value">{validRecipes.length}</span>
            </div>
          </div>
        </div>

        <div style={{ height: '400px', marginBottom: '2rem' }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        <div className="table-section">
          <h3>Recipe Performance</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Recipe Name</th>
                  <th>Cost</th>
                  <th>Selling Price</th>
                  <th>Margin Factor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((recipe, index) => {
                  const cost = Number(recipe.total_cost) || 0;
                  const mf = ((recipe.selling_price - cost) / recipe.selling_price) * 100;
                  const status = getMFStatus(mf);
                  return (
                    <tr key={index} style={{ 
                      backgroundColor: hoveredRecipe === recipe ? '#f8fafc' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}>
                      <td>{recipe.name}</td>
                      <td>{recipe.total_cost ? `₹${Number(recipe.total_cost).toFixed(2)}` : 'Not Set'}</td>
                      <td>₹{Number(recipe.selling_price).toFixed(2)}</td>
                      <td>{mf.toFixed(2)}%</td>
                      <td>
                        <span className={`mf-value ${status.status}`}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
