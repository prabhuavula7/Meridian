import React from 'react';
import OpenAIConfig from '../components/OpenAIConfig';

const OpenAIPage = ({ onConfigured }) => {
  return (
    <div className="space-y-4">
      <div className="surface rounded-lg p-4 md:p-5">
        <h2 className="font-display text-2xl font-semibold">Model Configuration</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Configure API credentials to unlock scenario generation and mitigation recommendations.
        </p>
      </div>
      <OpenAIConfig onConfigComplete={onConfigured} />
    </div>
  );
};

export default OpenAIPage;
