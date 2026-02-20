import React from 'react';
import DataUpload from '../components/DataUpload';

const UploadPage = ({ onDataUpload }) => {
  return (
    <div className="space-y-4">
      <div className="surface rounded-lg p-4 md:p-5">
        <h2 className="font-display text-2xl font-semibold">Data Ingestion</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Upload CSV/XLSX files to hydrate route overlays, disruption scoring, and mitigation intelligence.
        </p>
      </div>
      <DataUpload onDataUpload={onDataUpload} />
    </div>
  );
};

export default UploadPage;
