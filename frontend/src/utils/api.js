// Simulated API functions for sending processed supply chain data
// In a real application, these would make actual HTTP requests

/**
 * Send processed supply chain data to the backend API
 * @param {Object} data - The processed and mapped supply chain data
 * @param {Object} fieldMappings - The field mappings used for transformation
 * @returns {Promise<Object>} - API response
 */
export const sendSupplyChainData = async (data, fieldMappings) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate API response
  const response = {
    success: true,
    message: 'Data successfully processed and stored',
    data: {
      totalRecords: data.length,
      processedAt: new Date().toISOString(),
      fieldMappings: fieldMappings,
      summary: {
        locations: data.filter(row => row.warehouse_location || row.origin_location || row.destination_location).length,
        routes: data.filter(row => row.route || row.origin_location).length,
        products: data.filter(row => row.product_name).length,
        suppliers: data.filter(row => row.supplier).length,
        customers: data.filter(row => row.customer).length
      }
    }
  };
  
  // Simulate potential errors (uncomment to test error handling)
  // if (Math.random() > 0.8) {
  //   throw new Error('Simulated API error: Database connection failed');
  // }
  
  return response;
};

/**
 * Validate supply chain data before sending to API
 * @param {Array} data - The data to validate
 * @returns {Object} - Validation results
 */
export const validateSupplyChainData = (data) => {
  const errors = [];
  const warnings = [];
  
  if (!data || data.length === 0) {
    errors.push('No data provided for validation');
    return { isValid: false, errors, warnings };
  }
  
  // Check for required fields
  const requiredFields = ['warehouse_location', 'origin_location', 'destination_location'];
  const missingFields = requiredFields.filter(field => 
    !data.some(row => row[field])
  );
  
  if (missingFields.length > 0) {
    warnings.push(`Missing recommended fields: ${missingFields.join(', ')}`);
  }
  
  // Check data quality
  data.forEach((row, index) => {
    // Check for empty values in critical fields
    if (row.warehouse_location && !row.warehouse_location.toString().trim()) {
      warnings.push(`Row ${index + 1}: Empty warehouse location`);
    }
    
    // Check for valid dates
    if (row.departure_date && isNaN(new Date(row.departure_date))) {
      warnings.push(`Row ${index + 1}: Invalid departure date format`);
    }
    
    if (row.arrival_date && isNaN(new Date(row.arrival_date))) {
      warnings.push(`Row ${index + 1}: Invalid arrival date format`);
    }
    
    // Check for numeric values
    if (row.lead_time && isNaN(Number(row.lead_time))) {
      warnings.push(`Row ${index + 1}: Lead time should be numeric`);
    }
    
    if (row.product_cost && isNaN(Number(row.product_cost))) {
      warnings.push(`Row ${index + 1}: Product cost should be numeric`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalRecords: data.length
  };
};

/**
 * Get data processing statistics
 * @param {Array} data - The processed data
 * @returns {Object} - Processing statistics
 */
export const getDataStatistics = (data) => {
  if (!data || data.length === 0) return {};
  
  const stats = {
    totalRecords: data.length,
    uniqueLocations: new Set([
      ...data.map(row => row.warehouse_location).filter(Boolean),
      ...data.map(row => row.origin_location).filter(Boolean),
      ...data.map(row => row.destination_location).filter(Boolean)
    ]).size,
    uniqueProducts: new Set(data.map(row => row.product_name).filter(Boolean)).size,
    uniqueSuppliers: new Set(data.map(row => row.supplier).filter(Boolean)).size,
    totalCost: data.reduce((sum, row) => {
      const cost = parseFloat(row.product_cost) || 0;
      const quantity = parseFloat(row.quantity) || 1;
      return sum + (cost * quantity);
    }, 0),
    averageLeadTime: data.reduce((sum, row) => {
      return sum + (parseFloat(row.lead_time) || 0);
    }, 0) / data.filter(row => row.lead_time).length
  };
  
  return stats;
};

/**
 * Export data in various formats
 * @param {Array} data - The data to export
 * @param {string} format - Export format (json, csv, xlsx)
 * @returns {string|Blob} - Exported data
 */
export const exportData = (data, format = 'json') => {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    
    case 'csv':
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          }).join(',')
        )
      ].join('\n');
      return csvContent;
    
    case 'xlsx':
      // In a real app, you'd use a library like XLSX to create the file
      // For now, return a placeholder
      return new Blob(['Excel export not implemented in demo'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};
