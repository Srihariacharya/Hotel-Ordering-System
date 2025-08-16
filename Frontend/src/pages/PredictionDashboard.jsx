// src/pages/PredictionDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Brain, TrendingUp, Clock, Target, RefreshCw, Calendar } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PredictionDashboard = () => {
  const { user } = useAuth(); 
  const [predictions, setPredictions] = useState([]);
  const [accuracyMetrics, setAccuracyMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCurrentPredictions();
    fetchAccuracyMetrics();
  }, []);

  const fetchCurrentPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/predictions/current');

      if (data && data.predictions) {
        const totalOrders = data.predictions.reduce((sum, item) => sum + item.predictedQuantity, 0);
        const totalRevenue = data.predictions.reduce((sum, item) => sum + (item.menuItem?.price || 0) * item.predictedQuantity, 0);

        setPredictions([{
          ...data,
          totalPredictedOrders: totalOrders,
          totalPredictedRevenue: totalRevenue
        }]);
      } else {
        setPredictions([]);
      }
    } catch (err) {
      console.error('❌ Error fetching predictions:', err);
      setError(err.response?.data?.details || 'Failed to fetch current predictions');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccuracyMetrics = async () => {
    try {
      const { data } = await api.get('/predictions/accuracy');
      setAccuracyMetrics(data);
    } catch (err) {
      console.error('❌ Error fetching accuracy:', err);
    }
  };

  const trainModel = async () => {
    try {
      setTraining(true);
      const { data } = await api.post('/predictions/train');
      alert(data.message || 'Model trained successfully!');
      fetchCurrentPredictions();
    } catch (err) {
      console.error('❌ Training error:', err);
      alert('Training failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setTraining(false);
    }
  };

  const generatePrediction = async () => {
    try {
      setLoading(true);
      const { data } = await api.post('/predictions/generate', {
        predictionFor: selectedDate,
        hour: selectedHour
      });
      alert(data.message || 'Prediction generated successfully!');
      fetchCurrentPredictions();
    } catch (err) {
      console.error('❌ Generation error:', err);
      alert('Generation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

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
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const COLOR = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const pieDataMap = {};
predictions.forEach(pred => {
  pred.predictions?.forEach(item => {
    const name = item.menuItem?.name || 'Unknown';
    pieDataMap[name] = (pieDataMap[name] || 0) + item.predictedQuantity;
  });
});

let pieChartData = Object.entries(pieDataMap)
  .map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value); // sort descending

const TOP_N = 5;
let othersValue = 0;
if (pieChartData.length > TOP_N) {
  othersValue = pieChartData.slice(TOP_N).reduce((sum, item) => sum + item.value, 0);
  pieChartData = pieChartData.slice(0, TOP_N);
  pieChartData.push({ name: 'Others', value: othersValue });
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#A78BFA'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Order Prediction Engine</h1>
              <p className="text-gray-600 dark:text-gray-400">AI-powered demand forecasting for optimized kitchen operations</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={trainModel}
              disabled={training}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${training ? 'animate-spin' : ''}`} />
              {training ? 'Training...' : 'Train Model'}
            </button>
            <button
              onClick={fetchCurrentPredictions}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Predictions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{predictions.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Accuracy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {accuracyMetrics && accuracyMetrics.overallAccuracy !== null
                    ? `${(accuracyMetrics.overallAccuracy * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {predictions.reduce((sum, p) => sum + (p.totalPredictedOrders || 0), 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Predicted Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₹{predictions.reduce((sum, p) => sum + (p.totalPredictedRevenue || 0), 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Generate New Prediction */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Generate New Prediction</h2>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hour</label>
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
            <button
              onClick={generatePrediction}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              Generate Prediction
            </button>
          </div>
        </div>

        {/* Current Predictions & Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Predictions List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upcoming Predictions</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {predictions.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400">No predictions available.</p>}
              {predictions.map(prediction => (
                <div key={prediction._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(prediction.predictionFor, prediction.hour)}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{prediction.totalPredictedOrders} orders</span>
                      <span className="text-sm font-medium text-green-600">₹{prediction.totalPredictedRevenue?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {prediction.predictions?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{item.menuItem?.name || 'Unknown Item'}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.predictedQuantity} qty</span>
                          <span className={`text-xs ${getConfidenceColor(item.confidence || 0)}`}>{((item.confidence || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-6">
            {/* Bar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Predicted Orders Chart</h2>
              {predictions.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={predictions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="predictionFor"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip labelFormatter={(date) => new Date(date).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit' })} />
                    <Legend />
                    <Bar dataKey="totalPredictedOrders" fill="#10B981" name="Orders" />
                    <Bar dataKey="totalPredictedRevenue" fill="#3B82F6" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-500 dark:text-gray-400">No data to display chart.</p>}
            </div>

            {/* Pie Chart */}
           <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
             <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Top Menu Items</h2>
             {pieChartData.length > 0 ? (
               <ResponsiveContainer width="100%" height={300}>
               <PieChart>
               <Pie
                 data={pieChartData}
                 dataKey="value"
                 nameKey="name"
                 cx="50%"
                 cy="50%"
                 outerRadius={100}
                 fill="#8884d8"
                 label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                 {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLOR[index % COLOR.length]} />
                 ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, 'Qty']} />
               <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ maxHeight: 250, overflowY: 'auto' }}
               />
               </PieChart>
               </ResponsiveContainer>
                 ) : (
                   <p className="text-center text-gray-500 dark:text-gray-400">No menu item data.</p>
                )}
           </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionDashboard;
