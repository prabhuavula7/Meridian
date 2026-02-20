import React from 'react';
import AdminSettingsPanel from '../components/settings/AdminSettingsPanel';

const OpenAIPage = ({ onConfigured }) => {
  return (
    <div className="space-y-4">
      <div className="surface rounded-lg p-4 md:p-5">
        <h2 className="font-display text-2xl font-semibold">Settings and Administration</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Configure integrations, monitor service health, and manage operator-facing admin controls.
        </p>
      </div>
      <AdminSettingsPanel onConfigComplete={onConfigured} />
    </div>
  );
};

export default OpenAIPage;
