import React, { useState } from 'react';
import { CheckCircle2, ClipboardList, FlaskConical } from 'lucide-react';
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
    <div className="grid gap-6 md:grid-cols-2">
      <div className="surface rounded-lg p-5">
        <div
          {...getRootProps()}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors duration-200 ${
            isDragActive
              ? 'border-border-accent bg-accent/10'
              : 'border-border bg-surface-hover/40 hover:border-border-hover hover:bg-surface-hover/70'
          } ${isProcessing ? 'pointer-events-none opacity-80' : 'cursor-pointer'}`}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-white shadow-glow">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p className="mt-2 text-foreground-subtle">or click to browse</p>
            </div>
            <p className="text-sm text-foreground-subtle">Supports CSV, XLSX, XLS files</p>
          </div>
        </div>

        {isProcessing ? (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-foreground">{currentOperation}</span>
              <span className="text-sm font-medium text-accent-glow">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-hover">
              <div
                className="h-2 rounded-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {processingSteps.map((step, index) => {
                const done = progress >= (index * 20) + 20;
                const active = !done && progress >= (index * 20);

                return (
                  <div
                    key={index}
                    className={`rounded-md border px-2 py-1.5 text-center text-xs ${
                      done
                        ? 'border-success/45 bg-success/15 text-success'
                        : active
                          ? 'border-border-accent bg-accent/16 text-accent-glow'
                          : 'border-border bg-surface-hover text-foreground-subtle'
                    }`}
                  >
                    {step}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

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
          <p className="mt-2 text-xs text-foreground-subtle">
            Use sample records to validate the complete flow quickly.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-danger/40 bg-danger/12 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </div>

      <div className="surface rounded-lg p-5">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Uploaded Files</h3>

        {uploadedFiles.length === 0 ? (
          <div className="py-10 text-center text-foreground-subtle">
            <svg className="mx-auto mb-3 h-12 w-12 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No files uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-surface-hover/65 p-3">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-accent/20 text-accent-glow">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-foreground-subtle">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.data?.length || 0} rows
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeFile(index)}
                  className="text-foreground-subtle transition-colors hover:text-danger"
                  aria-label={`Remove ${file.name}`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="surface rounded-lg p-6 text-center">
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-success/40 bg-success/15 text-success">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground">Data Successfully Processed</h3>
      <p className="mt-2 text-sm text-foreground-muted">
        Your supply chain records have been validated, mapped, and sent to the dashboard model.
      </p>

      <p className="mt-4 rounded-lg border border-border bg-surface-hover/65 px-3 py-2 text-xs text-foreground-subtle">
        Navigation to Dashboard is state-driven. No manual page reload is required.
      </p>

      {analysisResults ? (
        <div className="mt-6 rounded-lg border border-info/40 bg-info/10 p-4 text-left">
          <h4 className="mb-2 font-medium text-info">AI Analysis Complete</h4>
          <div className="space-y-1.5 text-sm text-foreground-muted">
            <p className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-info" />Disruption scenario generated</p>
            <p className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-info" />Financial and time impact modeled</p>
            <p className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-info" />Mitigation options scored</p>
            <p className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-info" />Risk summary and confidence returned</p>
            <p className="pt-1 font-medium text-foreground">
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
                analysisResults,
              })}
              className="btn-primary"
            >
              View Full Analysis Results
            </button>
          </div>
        </div>
      ) : null}

      {validationResults && validationResults.warnings.length > 0 ? (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4 text-left">
          <h4 className="mb-2 font-medium text-warning">Data Quality Warnings</h4>
          <div className="space-y-1 text-sm text-foreground-muted">
            {validationResults.warnings.map((warning, index) => (
              <p key={index}>• {warning}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">Upload Supply Chain Data</h2>
        <p className="mx-auto mt-2 max-w-3xl text-sm text-foreground-muted md:text-base">
          Upload CSV or Excel files and Meridian AI will parse, validate, map, and enrich records for the dashboard.
        </p>
      </div>

      <div className="mb-8 flex items-center justify-center">
        <div className="flex items-center gap-3">
          {['upload', 'process', 'complete'].map((step, index) => {
            const isActive = step === 'upload'
              || (step === 'process' && mappingStep !== 'upload')
              || (step === 'complete' && mappingStep === 'complete');

            return (
              <React.Fragment key={step}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${
                  isActive
                    ? 'border-success/45 bg-success/20 text-success'
                    : 'border-border bg-surface-hover text-foreground-subtle'
                }`}>
                  {index + 1}
                </div>
                {index < 2 ? (
                  <div className={`h-px w-16 ${isActive ? 'bg-success/50' : 'bg-border'}`} />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {mappingStep === 'upload' ? renderUploadStep() : null}
      {mappingStep === 'complete' ? renderCompleteStep() : null}

      {mappingStep === 'upload' ? (
        <div className="surface mt-8 rounded-lg p-5">
          <h3 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <ClipboardList size={18} />
            <span>Expected Data Format</span>
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent-glow">Location Data</h4>
              <p className="text-sm text-foreground-muted">
                Include columns for warehouse locations, origin and destination points, facility names, or site identifiers.
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">Route Information</h4>
              <p className="text-sm text-foreground-muted">
                Include routes, transport modes, lead times, departure and arrival dates, product costs, and quantities.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DataUpload;
