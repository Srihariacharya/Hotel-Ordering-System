// Frontend/src/pages/PredictionPage.jsx - FIXED VERSION
import React, { useEffect, useState } from "react";
import { Brain, Clock, TrendingUp, AlertCircle, RefreshCw, Thermometer } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function PredictionPage() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrediction = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);
      
      console.log("🔄 Fetching predictions from:", `${API_BASE_URL}/predictions/current`);
      
      const res = await fetch(`${API_BASE_URL}/predictions/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if you have token stored
          // 'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });

      const data = await res.json();
      console.log("📊 Prediction response:", data);

      if (!res.ok) {
        throw new Error(data.details || data.message || 'Failed to fetch predictions');
      }

      setPrediction(data);
    } catch (err) {
      console.error("❌ Error fetching prediction:", err);
      setError(err.message);
      setPrediction(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, []);

  const formatDateTime = (dateString, hour) => {
    const date = new Date(dateString);
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
        minute: '2-digit'
      })
    };
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading predictions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full text-center shadow-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Prediction Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => fetchPrediction(true)}
              disabled={refreshing}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Retrying...' : 'Try Again'}
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Make sure the backend server is running and you have menu items available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No prediction data available</p>
          <button
            onClick={() => fetchPrediction(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const dateTime = formatDateTime(prediction.predictionFor, prediction.hour);
  const avgConfidence = prediction.predictions?.length > 0 
    ? prediction.predictions.reduce((sum, p) => sum + p.confidence, 0) / prediction.predictions.length 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  📊 Smart Order Predictions
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  AI-powered demand forecasting for optimal kitchen planning
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchPrediction(true)}
              disabled={refreshing}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Prediction Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Date & Time */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Prediction Time</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{dateTime.date}</p>
            <p className="text-blue-600 dark:text-blue-400 font-medium">{dateTime.time}</p>
          </div>

          {/* Total Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {prediction.totalPredictedOrders || 0}
            </p>
            <p className="text-sm text-gray-500">Expected orders</p>
          </div>

          {/* Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹{(prediction.totalPredictedRevenue || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Estimated earnings</p>
          </div>

          {/* Confidence */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Confidence</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {(avgConfidence * 100).toFixed(0)}%
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(avgConfidence)}`}>
                {getConfidenceLabel(avgConfidence)}
              </span>
            </div>
          </div>
        </div>

        {/* Weather Info */}
        {prediction.weatherData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Thermometer className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Weather Forecast</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl mb-1">
                  {prediction.weatherData.condition === 'sunny' ? '☀️' : 
                   prediction.weatherData.condition === 'rainy' ? '🌧️' : 
                   prediction.weatherData.condition === 'cloudy' ? '☁️' : '⛈️'}
                </p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {prediction.weatherData.condition}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-2xl font-bold text-orange-600 mb-1">
                  {prediction.weatherData.temperature}°C
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Temperature</p>
              </div>
              <div className="text-center p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <p className="text-2xl font-bold text-cyan-600 mb-1">
                  {prediction.weatherData.humidity}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Humidity</p>
              </div>
            </div>
          </div>
        )}

        {/* Predicted Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            🍽️ Predicted Menu Items
          </h2>
          
          {prediction.predictions && prediction.predictions.length > 0 ? (
            <div className="space-y-4">
              {prediction.predictions
                .sort((a, b) => b.predictedQuantity - a.predictedQuantity)
                .map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {item.menuItem?.imageUrl ? (
                      <img
                        src={item.menuItem.imageUrl}
                        alt={item.menuItem.name}
                        className="w-12 h-12 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🍽️</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {item.menuItem?.name || 'Unknown Item'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.menuItem?.category || 'No category'} • ₹{item.menuItem?.price || 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {item.predictedQuantity}
                      </p>
                      <p className="text-xs text-gray-500">quantity</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600">
                        ₹{((item.menuItem?.price || 0) * item.predictedQuantity).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">revenue</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(item.confidence || 0)}`}>
                      {((item.confidence || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No predictions available for this time slot
              </p>
              <p className="text-sm text-gray-500">
                Make sure you have menu items available and try training the model first.
              </p>
            </div>
          )}
        </div>

        {/* Accuracy Info */}
        {prediction.accuracy !== undefined && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              📈 Previous Accuracy
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${(prediction.accuracy * 100)}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {(prediction.accuracy * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}