// Data validation utilities for supply chain data

/**
 * Validates and sanitizes supply chain data
 * @param {Array} data - Array of supply chain data objects
 * @returns {Object} - Validation result with errors and sanitized data
 */
export const validateSupplyChainData = (data) => {
  const errors = [];
  const warnings = [];
  const sanitizedData = [];
  
  if (!Array.isArray(data)) {
    errors.push('Data must be an array');
    return { errors, warnings, sanitizedData, isValid: false };
  }

  if (data.length === 0) {
    errors.push('Data array cannot be empty');
    return { errors, warnings, sanitizedData, isValid: false };
  }

  // Validate each row
  data.forEach((row, index) => {
    const rowErrors = [];
    const rowWarnings = [];
    const sanitizedRow = { ...row };

    // Required fields validation
    if (!row.origin_location && !row.origin && !row.from_location && !row.source && !row.Origin_Point) {
      rowErrors.push(`Row ${index + 1}: Missing origin location`);
    }

    if (!row.destination_location && !row.destination && !row.to_location && !row.end_location && !row.Destination_Point) {
      rowErrors.push(`Row ${index + 1}: Missing destination location`);
    }

    // Numeric field validation
    if (row.product_cost || row.cost) {
      const cost = parseFloat(row.product_cost || row.cost);
      if (isNaN(cost) || cost < 0) {
        rowErrors.push(`Row ${index + 1}: Invalid cost value - must be a positive number`);
      } else {
        sanitizedRow.cost = cost;
      }
    }

    if (row.quantity || row.volume) {
      const quantity = parseFloat(row.quantity || row.volume);
      if (isNaN(quantity) || quantity < 0) {
        rowErrors.push(`Row ${index + 1}: Invalid quantity/volume - must be a positive number`);
      } else {
        sanitizedRow.quantity = quantity;
      }
    }

    if (row.lead_time || row.lead_time_days) {
      const leadTime = parseInt(row.lead_time || row.lead_time_days);
      if (isNaN(leadTime) || leadTime < 0) {
        rowErrors.push(`Row ${index + 1}: Invalid lead time - must be a positive integer`);
      } else {
        sanitizedRow.leadTime = leadTime;
      }
    }

    // String field sanitization
    if (row.vessel_name || row.vessel) {
      const vessel = (row.vessel_name || row.vessel).toString().trim();
      if (vessel.length === 0) {
        rowWarnings.push(`Row ${index + 1}: Empty vessel name`);
      } else if (vessel.length > 100) {
        rowWarnings.push(`Row ${index + 1}: Vessel name is very long (${vessel.length} characters)`);
      }
      sanitizedRow.vessel = vessel;
    }

    if (row.product_name || row.cargo_type) {
      const product = (row.product_name || row.cargo_type).toString().trim();
      if (product.length === 0) {
        rowWarnings.push(`Row ${index + 1}: Empty product name`);
      } else if (product.length > 200) {
        rowWarnings.push(`Row ${index + 1}: Product name is very long (${product.length} characters)`);
      }
      sanitizedRow.product = product;
    }

    // Location field sanitization
    if (row.origin_location || row.origin || row.from_location || row.source || row.Origin_Point) {
      const origin = (row.origin_location || row.origin || row.from_location || row.source || row.Origin_Point).toString().trim();
      if (origin.length === 0) {
        rowErrors.push(`Row ${index + 1}: Empty origin location`);
      } else if (origin.length > 100) {
        rowWarnings.push(`Row ${index + 1}: Origin location is very long (${origin.length} characters)`);
      }
      sanitizedRow.origin = origin;
    }

    if (row.destination_location || row.destination || row.to_location || row.end_location || row.Destination_Point) {
      const destination = (row.destination_location || row.destination || row.to_location || row.end_location || row.Destination_Point).toString().trim();
      if (destination.length === 0) {
        rowErrors.push(`Row ${index + 1}: Empty destination location`);
      } else if (destination.length > 100) {
        rowWarnings.push(`Row ${index + 1}: Destination location is very long (${destination.length} characters)`);
      }
      sanitizedRow.destination = destination;
    }

    // Transport mode validation
    if (row.mode_of_transport || row.transport_mode) {
      const mode = (row.mode_of_transport || row.transport_mode).toString().toLowerCase().trim();
      const validModes = ['sea', 'air', 'rail', 'road', 'sea freight', 'air freight', 'rail freight', 'road freight'];
      
      if (!validModes.includes(mode)) {
        rowWarnings.push(`Row ${index + 1}: Unusual transport mode: "${mode}". Expected: sea, air, rail, road`);
      }
      sanitizedRow.transportMode = mode;
    }

    // Date validation (if present)
    if (row.shipment_date || row.date) {
      const date = new Date(row.shipment_date || row.date);
      if (isNaN(date.getTime())) {
        rowWarnings.push(`Row ${index + 1}: Invalid date format: "${row.shipment_date || row.date}"`);
      } else {
        sanitizedRow.shipmentDate = date;
      }
    }

    // Add row errors and warnings to main arrays
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    }
    
    if (rowWarnings.length > 0) {
      warnings.push(...rowWarnings);
    }

    // Only add to sanitized data if no critical errors
    if (rowErrors.length === 0) {
      sanitizedData.push(sanitizedRow);
    }
  });

  // Data quality checks
  if (sanitizedData.length > 0) {
    // Check for duplicate routes
    const routeMap = new Map();
    sanitizedData.forEach((row, index) => {
      const routeKey = `${row.origin}-${row.destination}`;
      if (routeMap.has(routeKey)) {
        warnings.push(`Duplicate route detected: ${row.origin} → ${row.destination} (rows ${routeMap.get(routeKey) + 1} and ${index + 1})`);
      } else {
        routeMap.set(routeKey, index);
      }
    });

    // Check for data distribution
    const costs = sanitizedData.filter(row => row.cost).map(row => row.cost);
    if (costs.length > 0) {
      const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
      const highCostThreshold = avgCost * 3;
      const highCostItems = costs.filter(cost => cost > highCostThreshold);
      if (highCostItems.length > 0) {
        warnings.push(`${highCostItems.length} items have unusually high costs (above ${highCostThreshold.toFixed(2)})`);
      }
    }

    // Check for geographic consistency
    const locations = new Set();
    sanitizedData.forEach(row => {
      if (row.origin) locations.add(row.origin);
      if (row.destination) locations.add(row.destination);
    });
    
    if (locations.size < sanitizedData.length * 0.5) {
      warnings.push('Many routes share the same locations - this might indicate data quality issues');
    }
  }

  return {
    errors,
    warnings,
    sanitizedData,
    isValid: errors.length === 0,
    totalRows: data.length,
    validRows: sanitizedData.length,
    errorRate: data.length > 0 ? (errors.length / data.length * 100).toFixed(1) : 0
  };
};

/**
 * Validates a single data row
 * @param {Object} row - Single data row
 * @param {number} index - Row index (0-based)
 * @returns {Object} - Validation result for the row
 */
export const validateDataRow = (row, index = 0) => {
  const errors = [];
  const warnings = [];
  const sanitizedRow = { ...row };

  // Required fields
  const hasOrigin = row.origin_location || row.origin || row.from_location || row.source || row.Origin_Point;
  const hasDestination = row.destination_location || row.destination || row.to_location || row.end_location || row.Destination_Point;

  if (!hasOrigin) {
    errors.push('Missing origin location');
  }

  if (!hasDestination) {
    errors.push('Missing destination location');
  }

  // Numeric validation
  if (row.product_cost || row.cost) {
    const cost = parseFloat(row.product_cost || row.cost);
    if (isNaN(cost) || cost < 0) {
      errors.push('Invalid cost value - must be a positive number');
    } else {
      sanitizedRow.cost = cost;
    }
  }

  if (row.quantity || row.volume) {
    const quantity = parseFloat(row.quantity || row.volume);
    if (isNaN(quantity) || quantity < 0) {
      errors.push('Invalid quantity/volume - must be a positive number');
    } else {
      sanitizedRow.quantity = quantity;
    }
  }

  if (row.lead_time || row.lead_time_days) {
    const leadTime = parseInt(row.lead_time || row.lead_time_days);
    if (isNaN(leadTime) || leadTime < 0) {
      errors.push('Invalid lead time - must be a positive integer');
    } else {
      sanitizedRow.leadTime = leadTime;
    }
  }

  // String sanitization
  if (row.vessel_name || row.vessel) {
    const vessel = (row.vessel_name || row.vessel).toString().trim();
    if (vessel.length === 0) {
      warnings.push('Empty vessel name');
    }
    sanitizedRow.vessel = vessel;
  }

  if (row.product_name || row.cargo_type) {
    const product = (row.product_name || row.cargo_type).toString().trim();
    if (product.length === 0) {
      warnings.push('Empty product name');
    }
    sanitizedRow.product = product;
  }

  return {
    errors,
    warnings,
    sanitizedRow,
    isValid: errors.length === 0,
    rowIndex: index
  };
};

/**
 * Generates a validation report summary
 * @param {Object} validationResult - Result from validateSupplyChainData
 * @returns {string} - Formatted validation report
 */
export const generateValidationReport = (validationResult) => {
  const { errors, warnings, totalRows, validRows, errorRate } = validationResult;
  
  let report = `Data Validation Report\n`;
  report += `================================\n\n`;
  report += `Summary:\n`;
  report += `• Total Rows: ${totalRows}\n`;
  report += `• Valid Rows: ${validRows}\n`;
  report += `• Error Rate: ${errorRate}%\n`;
  report += `• Status: ${validationResult.isValid ? 'PASSED' : 'FAILED'}\n\n`;

  if (errors.length > 0) {
    report += `Critical Errors (${errors.length}):\n`;
    errors.forEach((error, index) => {
      report += `  ${index + 1}. ${error}\n`;
    });
    report += `\n`;
  }

  if (warnings.length > 0) {
    report += `Warnings (${warnings.length}):\n`;
    warnings.forEach((warning, index) => {
      report += `  ${index + 1}. ${warning}\n`;
    });
    report += `\n`;
  }

  if (validationResult.isValid) {
    report += `All data passed validation. Your supply chain data is ready for analysis.\n`;
  } else {
    report += `Please fix the critical errors above before proceeding with analysis.\n`;
  }

  return report;
};

/**
 * Sanitizes text input to prevent XSS and injection attacks
 * @param {string} input - Raw input string
 * @returns {string} - Sanitized string
 */
export const sanitizeTextInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validates file upload
 * @param {File} file - Uploaded file
 * @returns {Object} - File validation result
 */
export const validateFileUpload = (file) => {
  const errors = [];
  const warnings = [];
  
  // File type validation
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type "${file.type}" is not supported. Please upload CSV or Excel files.`);
  }
  
  // File size validation (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 10MB limit.`);
  }
  
  // File name validation
  if (file.name.length > 100) {
    warnings.push('File name is very long and might cause issues.');
  }
  
  // Check for suspicious file extensions
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs'];
  const fileName = file.name.toLowerCase();
  if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
    errors.push('File type is not allowed for security reasons.');
  }
  
  return {
    errors,
    warnings,
    isValid: errors.length === 0,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  };
};
