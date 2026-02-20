import React from 'react';
import { AlertTriangle, ClipboardCopy, RefreshCw, RotateCcw, Search } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.error('Error caught by boundary:', error, errorInfo);
    console.error('Error ID:', errorId);
    
    this.setState({ 
      error, 
      errorInfo, 
      errorId 
    });
    
    // Log to external service (could be Sentry, LogRocket, etc.)
    this.logErrorToService(error, errorInfo, errorId);
  }

  logErrorToService = (error, errorInfo, errorId) => {
    // In production, this would send to an error tracking service
    const errorData = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // For now, store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorData);
      localStorage.setItem('app_errors', JSON.stringify(existingErrors.slice(-10))); // Keep last 10 errors
    } catch (e) {
      console.error('Failed to store error:', e);
    }

    // In production, you would send this to your error tracking service
    // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  }

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    // Create error report for user to copy
    const errorReport = `
Error Report (ID: ${errorId})
Time: ${new Date().toISOString()}
URL: ${window.location.href}

Error Message: ${error?.message}
Error Stack: ${error?.stack}

Component Stack: ${errorInfo?.componentStack}
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(errorReport).then(() => {
      alert('Error report copied to clipboard. Please share this with support.');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorReport;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error report copied to clipboard. Please share this with support.');
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="card p-8 text-center">
              {/* Error Icon */}
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} className="text-white" />
              </div>

              {/* Error Message */}
              <h1 className="text-2xl font-bold text-white mb-4">
                Something went wrong
              </h1>
              
              <p className="text-dark-300 mb-6">
                We've encountered an unexpected error. Our team has been notified and is working to fix it.
              </p>

              {/* Error ID */}
              <div className="bg-dark-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-dark-400 mb-2">Error ID:</p>
                <code className="text-primary-400 font-mono text-sm break-all">
                  {this.state.errorId}
                </code>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="btn-primary"
                >
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw size={16} />
                    <span>Try Again</span>
                  </span>
                </button>
                
                <button
                  onClick={this.handleReportError}
                  className="btn-secondary"
                >
                  <span className="inline-flex items-center gap-2">
                    <ClipboardCopy size={16} />
                    <span>Copy Error Report</span>
                  </span>
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw size={16} />
                    <span>Reload Page</span>
                  </span>
                </button>
              </div>

              {/* Error Details (Collapsible) */}
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-primary-400 hover:text-primary-300 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <Search size={16} />
                    <span>Show Error Details</span>
                  </span>
                </summary>
                <div className="bg-dark-800 rounded-lg p-4 text-sm">
                  <div className="mb-4">
                    <h4 className="font-semibold text-white mb-2">Error Message:</h4>
                    <pre className="text-red-400 bg-dark-900 p-2 rounded overflow-x-auto">
                      {this.state.error?.toString()}
                    </pre>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-semibold text-white mb-2">Component Stack:</h4>
                    <pre className="text-yellow-400 bg-dark-900 p-2 rounded overflow-x-auto text-xs">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-white mb-2">Error Stack:</h4>
                    <pre className="text-blue-400 bg-dark-900 p-2 rounded overflow-x-auto text-xs">
                      {this.state.error?.stack}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
