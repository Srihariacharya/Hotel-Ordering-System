import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const usePredictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [accuracyMetrics, setAccuracyMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data } = await api.get('/predictions/current');
      setPredictions(data.predictions || []);
      console.log('✅ Predictions fetched:', data.predictions?.length);
    } catch (err) {
      console.error('❌ Error fetching predictions:', err);
      setError(err.response?.data?.message || 'Failed to fetch predictions');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccuracy = useCallback(async () => {
    try {
      const { data } = await api.get('/predictions/accuracy');
      setAccuracyMetrics(data);
      console.log('✅ Accuracy metrics fetched:', data);
    } catch (err) {
      console.error('❌ Error fetching accuracy:', err);
      setAccuracyMetrics(null);
    }
  }, []);

  const trainModel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data } = await api.post('/predictions/train');
      console.log('✅ Model trained:', data);
      
      // Refresh predictions after training
      setTimeout(() => {
        fetchPredictions();
        fetchAccuracy();
      }, 2000);
      
      return data;
    } catch (err) {
      console.error('❌ Training error:', err);
      setError(err.response?.data?.message || 'Training failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPredictions, fetchAccuracy]);

  const generatePrediction = useCallback(async (date, hour) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data } = await api.post('/predictions/generate', { date, hour });
      console.log('✅ Prediction generated:', data);
      
      // Refresh predictions after generation
      setTimeout(() => {
        fetchPredictions();
      }, 1000);
      
      return data;
    } catch (err) {
      console.error('❌ Generation error:', err);
      setError(err.response?.data?.message || 'Generation failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPredictions]);

  const refreshData = useCallback(() => {
    fetchPredictions();
    fetchAccuracy();
  }, [fetchPredictions, fetchAccuracy]);

  useEffect(() => {
    fetchPredictions();
    fetchAccuracy();
  }, [fetchPredictions, fetchAccuracy]);

  return {
    predictions,
    accuracyMetrics,
    loading,
    error,
    fetchPredictions,
    fetchAccuracy,
    trainModel,
    generatePrediction,
    refreshData,
  };
};