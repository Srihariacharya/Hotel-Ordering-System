// src/pages/PredictionPage.jsx
import React, { useEffect, useState } from "react";

export default function PredictionPage() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const res = await fetch("http://localhost:5000/predictions/current");
        const data = await res.json();
        setPrediction(data);
      } catch (err) {
        console.error("❌ Error fetching prediction:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, []);

  if (loading) {
    return <p className="text-center mt-10">Loading predictions...</p>;
  }

  if (!prediction) {
    return <p className="text-center mt-10">No prediction data available</p>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow rounded-lg">
      <h1 className="text-2xl font-bold mb-4 text-center">
        📊 Order Predictions
      </h1>

      {/* Prediction Details */}
      <div className="mb-6">
        <p><strong>Date:</strong> {new Date(prediction.date).toLocaleDateString()}</p>
        <p><strong>Hour:</strong> {prediction.hour}:00</p>
        <p><strong>Day of Week:</strong> {prediction.dayOfWeek}</p>
        <p><strong>Weather:</strong> {prediction.weather?.condition || "N/A"} ({prediction.weather?.temperature}°C)</p>
        <p><strong>Holiday:</strong> {prediction.isHoliday ? "Yes 🎉" : "No"}</p>
        {prediction.specialEvent && (
          <p><strong>Special Event:</strong> {prediction.specialEvent}</p>
        )}
      </div>

      {/* Predicted Items */}
      <h2 className="text-xl font-semibold mb-2">🍽 Predicted Orders</h2>
      {prediction.predictedItems && prediction.predictedItems.length > 0 ? (
        <ul className="space-y-2">
          {prediction.predictedItems.map((item, index) => (
            <li
              key={index}
              className="p-3 border rounded flex justify-between items-center"
            >
              <span className="font-medium">{item.menuItem?.name || "Unknown Item"}</span>
              <span className="text-gray-700">Qty: {item.predictedQuantity}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No predicted items available.</p>
      )}
    </div>
  );
}
