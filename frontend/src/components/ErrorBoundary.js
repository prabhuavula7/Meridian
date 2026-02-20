import React from 'react';
import { AlertTriangle, ClipboardCopy, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { Button } from './ui/button';

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
        <div className="flex min-h-screen items-center justify-center bg-background-deep p-4">
          <div className="w-full max-w-2xl">
            <div className="surface rounded-lg p-8 text-center">
              {/* Error Icon */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-danger/45 bg-danger/14">
                <AlertTriangle size={40} className="text-danger" />
              </div>

              {/* Error Message */}
              <h1 className="mb-4 text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              
              <p className="mb-6 text-foreground-muted">
                We've encountered an unexpected error. Our team has been notified and is working to fix it.
              </p>

              {/* Error ID */}
              <div className="mb-6 rounded-lg border border-border bg-surface-hover/65 p-4">
                <p className="mb-2 text-sm text-foreground-subtle">Error ID:</p>
                <code className="break-all font-mono text-sm text-accent-glow">
                  {this.state.errorId}
                </code>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Button
                  onClick={this.handleRetry}
                  variant="primary"
                >
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw size={16} />
                    <span>Try Again</span>
                  </span>
                </Button>
                
                <Button
                  onClick={this.handleReportError}
                  variant="secondary"
                >
                  <span className="inline-flex items-center gap-2">
                    <ClipboardCopy size={16} />
                    <span>Copy Error Report</span>
                  </span>
                </Button>
                
                <Button
                  onClick={() => window.location.reload()}
                  variant="secondary"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw size={16} />
                    <span>Reload Page</span>
                  </span>
                </Button>
              </div>

              {/* Error Details (Collapsible) */}
              <details className="mt-6 text-left">
                <summary className="mb-2 cursor-pointer text-accent-glow hover:text-accent">
                  <span className="inline-flex items-center gap-2">
                    <Search size={16} />
                    <span>Show Error Details</span>
                  </span>
                </summary>
                <div className="rounded-lg border border-border bg-surface-hover/65 p-4 text-sm">
                  <div className="mb-4">
                    <h4 className="mb-2 font-semibold text-foreground">Error Message:</h4>
                    <pre className="overflow-x-auto rounded border border-danger/35 bg-danger/12 p-2 text-danger">
                      {this.state.error?.toString()}
                    </pre>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="mb-2 font-semibold text-foreground">Component Stack:</h4>
                    <pre className="overflow-x-auto rounded border border-warning/35 bg-warning/12 p-2 text-xs text-warning">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="mb-2 font-semibold text-foreground">Error Stack:</h4>
                    <pre className="overflow-x-auto rounded border border-info/35 bg-info/12 p-2 text-xs text-info">
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
