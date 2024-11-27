import React from 'react';
import { RECIPE_CATEGORIES } from '../data/sampleData';
import '../styles/Analytics.css';

const Analytics = ({ recipes }) => {
  const convertToLakhs = (value) => {
    const inLakhs = value / 100000;
    return `₹${inLakhs.toFixed(2)} lacs`;
  };

  // Calculate average multiplying factor for each category
  const categoryAnalytics = RECIPE_CATEGORIES.map(category => {
    const categoryRecipes = recipes.filter(recipe => recipe.category === category);
    if (categoryRecipes.length === 0) {
      return {
        category,
        avgMultiplier: 0,
        recipeCount: 0,
        totalRevenue: 0,
        totalProfit: 0
      };
    }

    const multipliers = categoryRecipes.map(recipe => recipe.sellingPrice / recipe.totalCost);
    const avgMultiplier = multipliers.reduce((acc, curr) => acc + curr, 0) / multipliers.length;
    const totalRevenue = categoryRecipes.reduce((acc, recipe) => acc + recipe.monthlyRevenue, 0);
    const totalProfit = categoryRecipes.reduce((acc, recipe) => acc + recipe.monthlyProfit, 0);

    return {
      category,
      avgMultiplier,
      recipeCount: categoryRecipes.length,
      totalRevenue,
      totalProfit
    };
  });

  return (
    <div className="analytics-container">
      <h2>Category Analytics</h2>
      <div className="analytics-grid">
        {categoryAnalytics.map(({ category, avgMultiplier, recipeCount, totalRevenue, totalProfit }) => (
          <div key={category} className="analytics-card">
            <div className="analytics-header">
              <h3>{category}</h3>
              <span className="recipe-count">{recipeCount} recipes</span>
            </div>

            <div className="analytics-content">
              <div className="metric">
                <label>Average Multiplying Factor</label>
                <span className="value highlight">
                  {avgMultiplier === 0 ? '-' : avgMultiplier.toFixed(2)}x
                </span>
              </div>
              <div className="metric">
                <label>Monthly Revenue</label>
                <span className="value">{convertToLakhs(totalRevenue)}</span>
              </div>
              <div className="metric">
                <label>Monthly Gross Profit</label>
                <span className="value">{convertToLakhs(totalProfit)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;
