// src/components/WeatherDisplay.jsx

import React, { useState, useEffect } from 'react';

const WeatherDisplay = () => {
    // State to hold latitude and longitude for fetching weather
    const [latitude, setLatitude] = useState('39.7456'); // Default to a sample location (e.g., somewhere in the US)
    const [longitude, setLongitude] = useState('-97.0892'); // Default to a sample location

    // State to hold the fetched weather data
    const [weatherData, setWeatherData] = useState(null);
    // State for loading indicator
    const [isLoading, setIsLoading] = useState(false);
    // State for error messages
    const [error, setError] = useState(null);

    // Function to fetch weather data from Open-Meteo API
    const fetchWeatherData = async () => {
        setIsLoading(true); // Set loading to true when fetch starts
        setError(null); // Clear any previous errors
        setWeatherData(null); // Clear previous weather data

        // Open-Meteo Forecast API endpoint
        // We're requesting current temperature, weather code, wind speed, and precipitation
        // and using 'daily' for aggregated daily data.
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto`;

        console.log("DEBUG WeatherDisplay: Fetching weather from:", apiUrl);

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                // If response is not OK (e.g., 404, 500), throw an error
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            console.log("DEBUG WeatherDisplay: Fetched weather data:", data);
            setWeatherData(data); // Set the fetched data to state
        } catch (err) {
            console.error("DEBUG WeatherDisplay: Error fetching weather data:", err);
            setError(`Failed to fetch weather data: ${err.message}. Please check coordinates.`);
        } finally {
            setIsLoading(false); // Set loading to false once fetch is complete (success or error)
        }
    };

    // useEffect hook to trigger weather data fetch when latitude or longitude changes
    useEffect(() => {
        // Only fetch if both latitude and longitude are provided
        if (latitude && longitude) {
            fetchWeatherData();
        } else {
            setWeatherData(null); // Clear data if coordinates are incomplete
            setError("Please enter both latitude and longitude.");
        }
    }, [latitude, longitude]); // Dependencies: re-run effect when lat or lon changes

    // Helper function to interpret Open-Meteo weather codes
    const getWeatherDescription = (code) => {
        switch (code) {
            case 0: return "Clear sky";
            case 1: return "Mainly clear";
            case 2: return "Partly cloudy";
            case 3: return "Overcast";
            case 45: return "Fog";
            case 48: return "Depositing rime fog";
            case 51: return "Drizzle: Light";
            case 53: return "Drizzle: Moderate";
            case 55: return "Drizzle: Dense";
            case 56: return "Freezing Drizzle: Light";
            case 57: return "Freezing Drizzle: Dense";
            case 61: return "Rain: Slight";
            case 63: return "Rain: Moderate";
            case 65: return "Rain: Heavy";
            case 66: return "Freezing Rain: Light";
            case 67: return "Freezing Rain: Heavy";
            case 71: return "Snow fall: Slight";
            case 73: return "Snow fall: Moderate";
            case 75: return "Snow fall: Heavy";
            case 77: return "Snow grains";
            case 80: return "Rain showers: Slight";
            case 81: return "Rain showers: Moderate";
            case 82: return "Rain showers: Violent";
            case 85: return "Snow showers: Slight";
            case 86: return "Snow showers: Heavy";
            case 95: return "Thunderstorm: Slight or moderate";
            case 96: return "Thunderstorm with slight hail";
            case 99: return "Thunderstorm with heavy hail";
            default: return "Unknown weather";
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 pt-5">
            <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Local Weather</h2>

                {/* Latitude and Longitude Inputs */}
                <div className="mb-4 space-y-3">
                    <div>
                        <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">Latitude:</label>
                        <input
                            type="number"
                            id="latitude"
                            step="any" // Allows decimal numbers
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="e.g., 34.05"
                        />
                    </div>
                    <div>
                        <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">Longitude:</label>
                        <input
                            type="number"
                            id="longitude"
                            step="any" // Allows decimal numbers
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="e.g., -118.25"
                        />
                    </div>
                </div>

                {isLoading && (
                    <div className="text-center text-blue-600 font-semibold my-4">
                        Loading weather data...
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {weatherData && !isLoading && !error && (
                    <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Current Conditions</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-700">
                            <p><strong>Time:</strong> {new Date(weatherData.current_weather.time).toLocaleTimeString()}</p>
                            <p><strong>Temperature:</strong> {weatherData.current_weather.temperature}°C</p>
                            <p><strong>Wind Speed:</strong> {weatherData.current_weather.windspeed} km/h</p>
                            <p><strong>Wind Direction:</strong> {weatherData.current_weather.winddirection}°</p>
                            <p className="col-span-1 sm:col-span-2">
                                <strong>Weather:</strong> {getWeatherDescription(weatherData.current_weather.weathercode)} ({weatherData.current_weather.weathercode})
                            </p>
                        </div>

                        {weatherData.daily && weatherData.daily.time.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-xl font-semibold mb-3 text-gray-800">Today's Forecast</h3>
                                <p><strong>Date:</strong> {weatherData.daily.time[0]}</p>
                                <p><strong>Max Temp:</strong> {weatherData.daily.temperature_2m_max[0]}°C</p>
                                <p><strong>Min Temp:</strong> {weatherData.daily.temperature_2m_min[0]}°C</p>
                                <p><strong>Precipitation:</strong> {weatherData.daily.precipitation_sum[0]} mm</p>
                                <p><strong>Weather:</strong> {getWeatherDescription(weatherData.daily.weathercode[0])}</p>
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-4 text-right">Data from Open-Meteo.com</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherDisplay;
