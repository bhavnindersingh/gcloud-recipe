export const formatInLakhs = (value) => {
  const inLakhs = value / 100000;
  return `₹${inLakhs.toFixed(2)}L`;
};

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};
