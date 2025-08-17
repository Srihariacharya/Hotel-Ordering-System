// Frontend/src/pages/PredictionPage.jsx - FULLY UPDATED & FIXED VERSION
import React, { useEffect, useState, useCallback } from "react";
import { Brain, Clock, TrendingUp, AlertCircle, RefreshCw, Thermometer, Target, Cloud } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function PredictionPage() {
  const { user, token } = useAuth();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Auto-refresh interval
  const [autoRefresh, setAutoRefresh] = useState(true);
  const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  const fetchPrediction = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);
      
      console.log("🔄 Fetching predictions from:", `${API_BASE_URL}/predictions/current`);
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add auth header if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/predictions/current`, {
        method: 'GET',
        headers,
        credentials: 'include' // Include cookies if any
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Prediction service not available. Please check if the server is running.');
        }
        if (res.status === 500) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Server error occurred while fetching predictions.');
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("📊 Prediction response:", data);

      // Handle different response formats
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      setPrediction(data);
      setLastUpdated(new Date());
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      console.error("❌ Error fetching prediction:", err);
      const errorMessage = err.message || 'Failed to fetch predictions';
      
      // Implement retry logic for certain errors
      if (retryCount < 3 && (err.message.includes('fetch') || err.message.includes('network'))) {
        console.log(`🔄 Retrying... (${retryCount + 1}/3)`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchPrediction(showRefreshing), 2000 * (retryCount + 1));
        return;
      }
      
      setError(errorMessage);
      setPrediction(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, retryCount]);

  // Auto-refresh effect
  useEffect(() => {
    let intervalId;
    
    if (autoRefresh && !loading && !error) {
      intervalId = setInterval(() => {
        console.log("🔄 Auto-refreshing predictions...");
        fetchPrediction();
      }, AUTO_REFRESH_INTERVAL);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, loading, error, fetchPrediction]);

  // Initial fetch
  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  const handleManualRefresh = () => {
    setRetryCount(0);
    fetchPrediction(true);
  };

  const formatDateTime = (dateString, hour) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return { date: 'Invalid Date', time: '--:--' };
      }
      
      date.setHours(hour, 0, 0, 0);
      
      return {
        date: date.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        short: date.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric'
        }) + ` ${hour}:00`
      };
    } catch (error) {
      console.error('Date formatting error:', error);
      return { date: 'Date Error', time: '--:--' };
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getWeatherIcon = (condition) => {
    const icons = {
      sunny: '☀️',
      rainy: '🌧️',
      cloudy: '☁️',
      stormy: '⛈️'
    };
    return icons[condition] || '🌤️';
  };

  const getWeatherColor = (condition) => {
    const colors = {
      sunny: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      rainy: 'bg-blue-50 border-blue-200 text-blue-800',
      cloudy: 'bg-gray-50 border-gray-200 text-gray-800',
      stormy: 'bg-purple-50 border-purple-200 text-purple-800'
    };
    return colors[condition] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  // Loading state
  if (loading && !prediction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">Loading predictions...</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              This may take a moment if predictions are being generated
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !prediction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full text-center shadow-lg">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Prediction Error
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            
            {retryCount > 0 && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                Retried {retryCount} time{retryCount !== 1 ? 's' : ''}
              </p>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Retrying...' : 'Try Again'}
              </button>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p>Troubleshooting tips:</p>
                <ul className="text-xs text-left space-y-1">
                  <li>• Check if backend server is running</li>
                  <li>• Ensure menu items exist in database</li>
                  <li>• Try training the model first</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No prediction data
  if (!prediction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Prediction Data
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No prediction data is currently available
            </p>
            <button
              onClick={handleManualRefresh}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dateTime = formatDateTime(prediction.predictionFor, prediction.hour);
  const avgConfidence = prediction.predictions?.length > 0 
    ? prediction.predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / prediction.predictions.length 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Smart Order Predictions
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  AI-powered demand forecasting • {dateTime.short}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-600 dark:text-gray-400">Auto-refresh</span>
              </label>
              
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {prediction.message && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 dark:text-yellow-200">{prediction.message}</p>
                {prediction.suggestion && (
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                    💡 {prediction.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Date & Time */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Prediction Time</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {dateTime.date}
            </p>
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              {dateTime.time}
            </p>
          </div>

          {/* Total Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {prediction.totalPredictedOrders || 0}
            </p>
            <p className="text-sm text-gray-500">Expected orders</p>
          </div>

          {/* Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Target className="h-5 w-5 text-yellow-500" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</span>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              ₹{(prediction.totalPredictedRevenue || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-gray-500">Estimated earnings</p>
          </div>

          {/* Confidence */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Confidence</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {(avgConfidence * 100).toFixed(0)}%
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(avgConfidence)}`}>
                {getConfidenceLabel(avgConfidence)}
              </span>
            </div>
          </div>
        </div>

        {/* Weather Info */}
        {prediction.weatherData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <Cloud className="h-5 w-5 text-cyan-500" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Weather Forecast</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`text-center p-4 rounded-lg border-2 ${getWeatherColor(prediction.weatherData.condition)}`}>
                <div className="text-4xl mb-2">
                  {getWeatherIcon(prediction.weatherData.condition)}
                </div>
                <p className="font-semibold capitalize text-lg">
                  {prediction.weatherData.condition}
                </p>
                <p className="text-sm opacity-75">Condition</p>
              </div>
              
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-200">
                <p className="text-4xl font-bold text-orange-600 mb-2">
                  {prediction.weatherData.temperature}°C
                </p>
                <p className="font-semibold text-orange-800 dark:text-orange-200">Temperature</p>
                <p className="text-sm text-orange-600 dark:text-orange-300">Feels comfortable</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200">
                <p className="text-4xl font-bold text-blue-600 mb-2">
                  {prediction.weatherData.humidity}%
                </p>
                <p className="font-semibold text-blue-800 dark:text-blue-200">Humidity</p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {prediction.weatherData.humidity > 70 ? 'High' : prediction.weatherData.humidity > 40 ? 'Moderate' : 'Low'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Predicted Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <span className="text-2xl">🍽️</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Predicted Menu Items
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {prediction.predictions?.length || 0} items predicted for this hour
                  </p>
                </div>
              </div>
              
              {prediction.predictions?.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {prediction.predictions.reduce((sum, item) => sum + item.predictedQuantity, 0)}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {prediction.predictions && prediction.predictions.length > 0 ? (
              <div className="space-y-4">
                {prediction.predictions
                  .sort((a, b) => b.predictedQuantity - a.predictedQuantity)
                  .map((item, index) => (
                    <div
                      key={item.menuItem?._id || index}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Item Image */}
                        {item.menuItem?.imageUrl ? (
                          <img
                            src={item.menuItem.imageUrl}
                            alt={item.menuItem.name}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">🍽️</span>
                          </div>
                        )}
                        
                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {item.menuItem?.name || 'Unknown Item'}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                              {item.menuItem?.category || 'No category'}
                            </span>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              ₹{item.menuItem?.price || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Metrics */}
                      <div className="flex items-center gap-6 flex-shrink-0">
                        {/* Quantity */}
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {item.predictedQuantity}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Quantity
                          </div>
                        </div>
                        
                        {/* Revenue */}
                        <div className="text-center">
                          <div className="text-xl font-semibold text-green-600 dark:text-green-400">
                            ₹{((item.menuItem?.price || 0) * item.predictedQuantity).toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Revenue
                          </div>
                        </div>
                        
                        {/* Confidence */}
                        <div className="text-center">
                          <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border ${getConfidenceColor(item.confidence || 0)}`}>
                            {((item.confidence || 0) * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                            Confidence
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No predictions available
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                  No predictions are available for this time slot. This might be because:
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 max-w-md mx-auto">
                  <p>• No menu items are available</p>
                  <p>• The prediction model needs training</p>
                  <p>• Insufficient historical data</p>
                </div>
                
                {user?.role === 'admin' && (
                  <div className="mt-6">
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                      As an admin, you can:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Add menu items
                      </span>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Train the model
                      </span>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Generate predictions
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Accuracy Info (if available) */}
        {prediction.accuracy !== null && prediction.accuracy !== undefined && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Previous Accuracy
              </h3>
              <span className="text-2xl font-bold text-green-600">
                {(prediction.accuracy * 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(prediction.accuracy * 100, 100)}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This prediction's accuracy compared to actual orders
              {prediction.accuracy >= 0.8 && " - Excellent! 🎯"}
              {prediction.accuracy >= 0.6 && prediction.accuracy < 0.8 && " - Good performance 👍"}
              {prediction.accuracy < 0.6 && " - Room for improvement 📈"}
            </p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>🤖 Powered by AI prediction algorithms</p>
          <p>⚡ Auto-refresh every 5 minutes • Last updated: {lastUpdated?.toLocaleTimeString()}</p>
          {retryCount > 0 && (
            <p className="text-yellow-600">⚠️ Recovered after {retryCount} retry attempt{retryCount !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>
    </div>
  );
}