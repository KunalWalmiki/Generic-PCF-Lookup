import React from 'react';


// Define the state type
interface ErrorBoundaryState {
    hasError: boolean;
  }

class ErrorBoundary extends React.Component<object, ErrorBoundaryState> {

  constructor(props : object) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error : any) : ErrorBoundaryState {
    // Update state to indicate an error has occurred
    return { hasError: true };
  }

  componentDidCatch(error : any, errorInfo : any) {
    // Log the error or send it to an error tracking service
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {

    if (this.state.hasError) {
      // Render fallback UI
      return React.createElement("p", null, "Something went wrong");

    }

    // Render children if no error occurred
    return this.props.children;
  }
}

export default ErrorBoundary;
