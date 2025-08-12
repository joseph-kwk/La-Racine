import React from 'react';
import { useAuth } from '../hooks/useAuth';

const LoadingBar = () => {
  const { loading } = useAuth();
  if (!loading) return null;
  return (
    <div className="loading-bar-container">
      <div className="loading-bar" />
    </div>
  );
};

export default LoadingBar;
