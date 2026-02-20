import React, { useState } from 'react';
import { CheckCircle2, ClipboardList, FlaskConical, Map } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getDataStatistics } from '../utils/api';
import { validateSupplyChainData, validateFileUpload } from '../utils/dataValidation';
import { analyzeSupplyChain, transformDataForBackend, checkBackendHealth, enrichRoutesForMap } from '../utils/backendApi';
import { debugError, debugLog, debugWarn } from '../utils/logger';

// Standard supply chain field mappings
const SUPPLY_CHAIN_FIELDS = {
  // Location fields
  warehouse_location: ['warehouse_location', 'warehouse', 'location', 'facility', 'site', 'plant', 'dc', 'distribution_center'],
  origin_location: ['origin_location', 'origin', 'from_location', 'source', 'start_location', 'departure_location'],
  destination_location: ['destination_location', 'destination', 'to_location', 'end_location', 'arrival_location'],
  
  // Route fields
  route: ['route', 'path', 'lane', 'corridor', 'connection'],
  mode_of_transport: ['mode_of_transport', 'transport_mode', 'mode', 'carrier_type', 'vehicle_type', 'shipping_method'],
  
  // Time fields
  lead_time: ['lead_time', 'transit_time', 'delivery_time', 'processing_time', 'cycle_time', 'duration'],
  departure_date: ['departure_date', 'start_date', 'ship_date', 'dispatch_date', 'outbound_date'],
  arrival_date: ['arrival_date', 'end_date', 'delivery_date', 'receipt_date', 'inbound_date'],
  
  // Product fields
  product_name: ['product_name', 'product', 'item', 'sku', 'material', 'commodity', 'goods'],
  product_cost: ['product_cost', 'cost', 'price', 'unit_cost', 'unit_price', 'value', 'amount'],
  
  // Quantity fields
  quantity: ['quantity', 'qty', 'amount', 'volume', 'units', 'pieces', 'count'],
  weight: ['weight', 'mass', 'kg', 'lbs', 'tons'],
  
  // Additional fields
  supplier: ['supplier', 'vendor', 'provider', 'manufacturer', 'producer'],
  customer: ['customer', 'buyer', 'client', 'end_user', 'recipient'],
  order_id: ['order_id', 'order', 'po', 'purchase_order', 'reference', 'tracking_number']
};

const DataUpload = ({ onDataUpload }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [fieldMappings, setFieldMappings] = useState({});
  const [mappingStep, setMappingStep] = useState('upload'); // upload, complete
  const [validationResults, setValidationResults] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  
  // Enhanced progress tracking
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const [processingSteps, setProcessingSteps] = useState([]);

  const onDrop = async (acceptedFiles) => {
    debugLog('DataUpload', 'onDrop triggered', { files: acceptedFiles.map(file => file.name) });
    setError('');
    setIsProcessing(true);
    setMappingStep('upload');
    setProgress(0);
    setCurrentOperation('Starting file processing...');
    setProcessingSteps(['File validation', 'Data parsing', 'Field mapping', 'Data validation', 'Final processing']);
    
    try {
      const processedFiles = [];
      const totalFiles = acceptedFiles.length;
      
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setCurrentOperation(`Processing file ${i + 1}/${totalFiles}: ${file.name}`);
        setProgress((i / totalFiles) * 40); // First 40% for file processing
        // Validate file before processing
        const fileValidation = validateFileUpload(file);
        if (!fileValidation.isValid) {
          debugWarn('DataUpload', 'File validation failed', {
            file: file.name,
            errors: fileValidation.errors,
          });
          setError(`File validation failed: ${fileValidation.errors.join(', ')}`);
          setIsProcessing(false);
          return;
        }
        
        const fileData = await processFile(file);
        if (fileData) {
          processedFiles.push({
            name: file.name,
            size: file.size,
            data: fileData,
            type: file.type
          });
        }
      }
      
      setUploadedFiles(processedFiles);
      
      if (processedFiles.length > 0) {
        // Update progress for data combination
        setCurrentOperation('Combining and analyzing data...');
        setProgress(50);
        
        // Combine all data and detect field mappings
        const combinedData = combineData(processedFiles);
        const detectedMappings = detectFieldMappings(combinedData);
        
        setParsedData(combinedData);
        setFieldMappings(detectedMappings);
        
        // Update progress for field mapping
        setCurrentOperation('Mapping data fields...');
        setProgress(70);
        
        // Skip mapping step and go directly to map
        // Automatically process the data and send it to the parent
        const transformedData = combinedData.map(row => {
          const transformed = {};
          Object.entries(detectedMappings).forEach(([originalColumn, standardField]) => {
            if (row[originalColumn] !== undefined) {
              transformed[standardField] = row[originalColumn];
            }
          });
          return transformed;
        });
        
        // Update progress for validation
        setCurrentOperation('Validating data quality...');
        setProgress(85);
        
        // Validate the transformed data
        const validationResult = validateSupplyChainData(transformedData);
        setValidationResults(validationResult);
        
        if (!validationResult.isValid) {
          debugWarn('DataUpload', 'Transformed data validation failed', {
            errors: validationResult.errors,
            warnings: validationResult.warnings,
          });
          setError(`Data validation failed: ${validationResult.errors.slice(0, 3).join(', ')}${validationResult.errors.length > 3 ? '...' : ''}`);
          setIsProcessing(false);
          return;
        }
        
        setCurrentOperation('Resolving route geometry and transport hubs...');
        setProgress(92);
        const { backendAvailable, mapReadyRows } = await enrichRowsForMapIfAvailable(
          validationResult.sanitizedData,
          detectedMappings
        );

        // Update progress for final processing
        setCurrentOperation('Finalizing and sending data...');
        setProgress(97);

        // Send data directly to parent component (bypassing mapping step)
        const stats = getDataStatistics(mapReadyRows);
        onDataUpload({
          data: mapReadyRows,
          mappings: detectedMappings,
          validation: validationResult,
          statistics: stats
        });

        if (backendAvailable) {
          void performAIAnalysis(mapReadyRows, detectedMappings, validationResult);
        }
        
        // Set step to complete to show success state
        setMappingStep('complete');
        setProgress(100);
        setCurrentOperation('Complete!');
      }
    } catch (err) {
      debugError('DataUpload', 'File processing error', { message: err.message });
      setError(`Error processing files: ${err.message}`);
      console.error('File processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const processFile = async (file) => {
    return new Promise((resolve, reject) => {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
            } else {
              resolve(results.data);
            }
          },
          error: (error) => {
            reject(new Error(`CSV parsing failed: ${error.message}`));
          }
        });
      } else if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Convert to array of objects with headers
            if (jsonData.length > 0) {
              const headers = jsonData[0];
              const rows = jsonData.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                  if (header && row[index] !== undefined) {
                    obj[header] = row[index];
                  }
                });
                return obj;
              });
              resolve(rows);
            } else {
              reject(new Error('Excel file is empty or has no data'));
            }
          } catch (err) {
            reject(new Error(`Excel parsing failed: ${err.message}`));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read Excel file'));
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file type. Please upload CSV, XLSX, or XLS files.'));
      }
    });
  };

  const combineData = (files) => {
    const allData = [];
    files.forEach(file => {
      if (Array.isArray(file.data)) {
        allData.push(...file.data);
      }
    });
    return allData;
  };

  const detectFieldMappings = (data) => {
    if (!data || data.length === 0) return {};
    
    const firstRow = data[0];
    const detectedMappings = {};
    
    // Get all column names from the data
    const columnNames = Object.keys(firstRow);
    
    // Try to match each column to a standard field
    columnNames.forEach(columnName => {
      const normalizedColumn = columnName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Find matching standard field
      for (const [standardField, variations] of Object.entries(SUPPLY_CHAIN_FIELDS)) {
        if (variations.some(variation => 
          normalizedColumn.includes(variation) || 
          variation.includes(normalizedColumn) ||
          normalizedColumn === variation
        )) {
          detectedMappings[columnName] = standardField;
          break;
        }
      }
      
      // If no match found, keep original column name
      if (!detectedMappings[columnName]) {
        detectedMappings[columnName] = columnName;
      }
    });
    
    return detectedMappings;
  };

  const enrichRowsForMapIfAvailable = async (rows, mappings) => {
    const backendAvailable = await checkBackendHealth();
    debugLog('DataUpload', 'Backend health check before route enrichment', { backendAvailable });

    if (!backendAvailable) {
      return {
        backendAvailable,
        mapReadyRows: rows,
      };
    }

    try {
      const enrichmentResponse = await enrichRoutesForMap(rows, mappings);
      const enrichedRows = enrichmentResponse?.data?.rows;

      if (Array.isArray(enrichedRows) && enrichedRows.length > 0) {
        debugLog('DataUpload', 'Route enrichment completed', {
          rows: enrichedRows.length,
          providersUsed: enrichmentResponse?.data?.summary?.providersUsed || [],
          cacheHit: Boolean(enrichmentResponse?.data?.summary?.cacheHit),
          cacheKey: enrichmentResponse?.data?.summary?.cacheKey || null,
        });

        return {
          backendAvailable,
          mapReadyRows: enrichedRows,
        };
      }
    } catch (enrichmentError) {
      debugWarn('DataUpload', 'Route enrichment failed; using non-enriched rows', {
        message: enrichmentError.message,
      });
    }

    return {
      backendAvailable,
      mapReadyRows: rows,
    };
  };

  const performAIAnalysis = async (transformedData, fieldMappings, validation) => {
    try {
      debugLog('DataUpload', 'performAIAnalysis started', { rows: transformedData.length });
      
      // Transform data for backend
      const backendData = transformDataForBackend(transformedData, fieldMappings);
      debugLog('DataUpload', 'Backend data transformed', {
        locations: backendData.locations.length,
        routes: backendData.routes.length,
        products: backendData.products.length,
      });
      
      // Perform AI analysis
      const analysisResponse = await analyzeSupplyChain(backendData);
      debugLog('DataUpload', 'analyzeSupplyChain response received', {
        success: analysisResponse.success,
        hasData: Boolean(analysisResponse.data),
      });
      
      if (analysisResponse.success) {
        setAnalysisResults(analysisResponse.data);
        setMappingStep('complete');
        
        // Pass data to parent component
        const stats = getDataStatistics(transformedData);
        onDataUpload({
          data: transformedData,
          mappings: fieldMappings,
          validation: validation,
          statistics: stats,
          analysisResults: analysisResponse.data
        });
      } else {
        throw new Error(analysisResponse.error || 'Analysis failed');
      }
    } catch (error) {
      debugError('DataUpload', 'AI analysis failed', { message: error.message });
      console.error('AI Analysis Error:', error);
      // Still complete the upload even if analysis fails
      setMappingStep('complete');
      
      const stats = getDataStatistics(transformedData);
      onDataUpload({
        data: transformedData,
        mappings: fieldMappings,
        validation: validation,
        statistics: stats
      });
    } finally {
    }
  };

  // Function to load sample data
  const loadSampleData = async () => {
    try {
      debugLog('DataUpload', 'Loading sample CSV');
      setIsProcessing(true);
      setError('');
      
      // Fetch the sample CSV file
      const response = await fetch('/sample-supply-chain-data.csv');
      const csvText = await response.text();

      const parseResults = await new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject
        });
      });

      if (parseResults.errors.length > 0) {
        setError(`CSV parsing errors: ${parseResults.errors.map(e => e.message).join(', ')}`);
        return;
      }

      // Create a file object for the sample data
      const sampleFile = {
        name: 'sample-supply-chain-data.csv',
        size: csvText.length,
        data: parseResults.data,
        type: 'text/csv'
      };
      
      setUploadedFiles([sampleFile]);
      
      // Detect field mappings for sample data
      const detectedMappings = detectFieldMappings(parseResults.data);
      
      setParsedData(parseResults.data);
      setFieldMappings(detectedMappings);
      
      // Skip mapping step and go directly to map
      // Automatically process the sample data and send it to the parent
      const transformedData = parseResults.data.map(row => {
        const transformed = {};
        Object.entries(detectedMappings).forEach(([originalColumn, standardField]) => {
          if (row[originalColumn] !== undefined) {
            transformed[standardField] = row[originalColumn];
          }
        });
        return transformed;
      });

      const { backendAvailable, mapReadyRows } = await enrichRowsForMapIfAvailable(
        transformedData,
        detectedMappings
      );

      // Send data directly to parent component (bypassing mapping step)
      const stats = getDataStatistics(mapReadyRows);
      onDataUpload({
        data: mapReadyRows,
        mappings: detectedMappings,
        validation: { isValid: true, errors: [] },
        statistics: stats
      });

      if (backendAvailable) {
        void performAIAnalysis(
          mapReadyRows,
          detectedMappings,
          { isValid: true, errors: [], warnings: [], sanitizedData: mapReadyRows }
        );
      }
      
      // Set step to complete to show success state
      setMappingStep('complete');
    } catch (err) {
      debugError('DataUpload', 'Sample data loading error', { message: err.message });
      setError(`Error loading sample data: ${err.message}`);
      console.error('Sample data loading error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    if (newFiles.length === 0) {
      setParsedData(null);
      setFieldMappings({});
      setMappingStep('upload');
    }
  };

  const renderUploadStep = () => (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Upload Area */}
      <div className="card">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-primary-500 bg-primary-50/10'
              : 'border-dark-600 hover:border-primary-400 hover:bg-dark-800/50'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-500 to-accent-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <p className="text-lg font-medium text-white">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-dark-400 mt-2">
                or click to browse
              </p>
            </div>
            
            <div className="text-sm text-dark-400">
              Supports CSV, XLSX, XLS files
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">{currentOperation}</span>
              <span className="text-sm text-primary-400">{progress}%</span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            {/* Processing Steps */}
            <div className="mt-4 grid grid-cols-5 gap-2">
              {processingSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`text-xs p-2 rounded text-center ${
                    progress >= (index * 20) + 20 
                      ? 'bg-green-600 text-white' 
                      : progress >= (index * 20)
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-dark-400'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Load Sample Data Button */}
        <div className="mt-6 text-center">
          <button
            onClick={loadSampleData}
            disabled={isProcessing}
            className="btn-secondary w-full"
          >
            <span className="inline-flex items-center gap-2">
              <FlaskConical size={16} />
              <span>Load Sample Data</span>
            </span>
          </button>
          <p className="text-xs text-dark-400 mt-2">
            Test the platform with sample supply chain data
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* File List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Uploaded Files</h3>
        
        {uploadedFiles.length === 0 ? (
          <div className="text-center py-8 text-dark-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-dark-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.data?.length || 0} rows
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(index)}
                  className="text-dark-400 hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="card text-center">
      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Data Successfully Processed!</h3>
      <p className="text-dark-300 mb-4">
        Your supply chain data has been automatically processed and mapped. You can now view it on the interactive map!
      </p>
      
      <div className="mt-6">
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          <span className="inline-flex items-center gap-2">
            <Map size={16} />
            <span>Go to Interactive Map</span>
          </span>
        </button>
        <p className="text-xs text-dark-400 mt-2">
          The map should now display your data automatically
        </p>
      </div>
      
      {analysisResults && (
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <h4 className="font-medium text-blue-400 mb-2">AI Analysis Complete!</h4>
          <div className="text-sm text-blue-300 space-y-2">
            <p className="inline-flex items-center gap-2"><CheckCircle2 size={14} />Disaster scenario identified and analyzed</p>
            <p className="inline-flex items-center gap-2"><CheckCircle2 size={14} />Financial and time impact calculated</p>
            <p className="inline-flex items-center gap-2"><CheckCircle2 size={14} />Mitigation strategies generated</p>
            <p className="inline-flex items-center gap-2"><CheckCircle2 size={14} />Risk assessment completed</p>
            <p className="mt-2 text-white font-medium">
              Confidence Score: {Math.round(analysisResults.confidenceScore * 100)}%
            </p>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => onDataUpload({ 
                data: parsedData, 
                mappings: fieldMappings, 
                validation: validationResults, 
                statistics: getDataStatistics(parsedData), 
                analysisResults: analysisResults
              })}
              className="btn-primary"
            >
              View Full Analysis Results
            </button>
          </div>
        </div>
      )}
      
      {validationResults && validationResults.warnings.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
          <h4 className="font-medium text-yellow-400 mb-2">Data Quality Warnings</h4>
          <div className="text-sm text-yellow-300">
            {validationResults.warnings.map((warning, index) => (
              <p key={index}>• {warning}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="section-title gradient-text">
          Upload Your Supply Chain Data
        </h2>
        <p className="text-dark-300 text-lg max-w-3xl mx-auto">
          Upload CSV or Excel files with your supply chain data. Our AI will automatically process 
          and map fields, then take you directly to the interactive map.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {['upload', 'process', 'complete'].map((step, index) => (
            <React.Fragment key={step}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step === 'upload' 
                  ? 'border-primary-500 bg-primary-500 text-white' 
                  : step === 'process' && mappingStep !== 'upload'
                    ? 'border-green-500 bg-green-500 text-white'
                    : step === 'complete' && mappingStep === 'complete'
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-dark-600 text-dark-400'
              }`}>
                {step === 'upload' ? (
                  index + 1
                ) : step === 'process' && mappingStep !== 'upload' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step === 'complete' && mappingStep === 'complete' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < 2 && (
                <div className={`w-16 h-0.5 ${
                  step === 'upload' ? 'bg-dark-600' :
                  step === 'process' && mappingStep !== 'upload' ? 'bg-green-500' :
                  step === 'complete' && mappingStep === 'complete' ? 'bg-green-500' : 'bg-dark-600'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {mappingStep === 'upload' && renderUploadStep()}
      {mappingStep === 'complete' && renderCompleteStep()}

      {/* Sample Data Info */}
      {mappingStep === 'upload' && (
        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-white mb-4 inline-flex items-center gap-2">
            <ClipboardList size={18} />
            <span>Expected Data Format</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary-400 mb-2">Location Data</h4>
              <p className="text-dark-300 text-sm">
                Include columns for: warehouse locations, origin/destination points, 
                facility names, or site identifiers
              </p>
            </div>
            <div>
              <h4 className="font-medium text-accent-400 mb-2">Route Information</h4>
              <p className="text-dark-300 text-sm">
                Include columns for: routes, transport modes, lead times, 
                departure/arrival dates, costs, and quantities
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataUpload;
