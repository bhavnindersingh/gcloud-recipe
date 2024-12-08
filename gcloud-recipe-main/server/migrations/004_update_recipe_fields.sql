-- Rename monthly fields to remove 'monthly' prefix
ALTER TABLE recipes RENAME COLUMN monthly_sales TO sales;
ALTER TABLE recipes RENAME COLUMN monthly_revenue TO revenue;
ALTER TABLE recipes RENAME COLUMN monthly_profit TO profit;
