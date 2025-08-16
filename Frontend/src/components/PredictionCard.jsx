import React from 'react';
import { TrendingUp, Clock, Target, AlertTriangle, ThermometerSun } from 'lucide-react';

const PredictionCard = ({ prediction, compact = false }) => {
  const formatDateTime = (date, hour) => {
    const dt = new Date(date);
    dt.setHours(hour);
    return dt.toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 0.8) return '🎯';
    if (confidence >= 0.6) return '⚡';
    return '⚠️';
  };

  const topPredictions = prediction.predictions?.slice(0, compact ? 2 : 5) || [];
  const avgConfidence = prediction.predictions?.reduce((sum, p) => sum + p.confidence, 0) / (prediction.predictions?.length || 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <h3 className="font-medium text-gray-900 dark:text-white text-sm">
            {formatDateTime(prediction.predictionFor, prediction.hour)}
          </h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(avgConfidence)}`}>
          {getConfidenceIcon(avgConfidence)} {(avgConfidence * 100).toFixed(0)}%
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {prediction.totalPredictedOrders}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Orders</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
            ₹{(prediction.totalPredictedRevenue || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Revenue</div>
        </div>
      </div>

      {/* Weather Info */}
      {prediction.weatherData && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <ThermometerSun className="h-4 w-4 text-blue-500" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {prediction.weatherData.condition}, {prediction.weatherData.temperature}°C, {prediction.weatherData.humidity}% humidity
          </div>
        </div>
      )}

      {/* Top Predictions */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Top Items
        </div>
        {topPredictions.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {item.menuItem?.imageUrl && (
                <img
                  src={item.menuItem.imageUrl}
                  alt={item.menuItem.name}
                  className="h-6 w-6 rounded object-cover flex-shrink-0"
                />
              )}
              <span className="text-sm text-gray-900 dark:text-white truncate">
                {item.menuItem?.name || 'Unknown Item'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.predictedQuantity}
              </span>
              <div className={`w-2 h-2 rounded-full ${
                item.confidence >= 0.8 ? 'bg-green-500' :
                item.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
          </div>
        ))}
        
        {prediction.predictions?.length > (compact ? 2 : 5) && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1 border-t border-gray-200 dark:border-gray-600">
            +{prediction.predictions.length - (compact ? 2 : 5)} more items
          </div>
        )}
      </div>

      {/* Accuracy Badge */}
      {prediction.accuracy !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Previous Accuracy</span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              prediction.accuracy >= 0.8 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
              prediction.accuracy >= 0.6 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 
              'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {(prediction.accuracy * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionCard;