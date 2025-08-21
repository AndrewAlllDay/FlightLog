// src/utilities/cache.js

/**
 * Saves a value to localStorage after converting it to a JSON string.
 * This cache is PERSISTENT and does NOT expire.
 * @param {string} key - The key under which to store the data.
 * @param {any} value - The value to store (will be stringified).
 */
export const setCache = (key, value) => {
    try {
        const serializedValue = JSON.stringify(value);
        localStorage.setItem(key, serializedValue);
    } catch (error) {
        console.error(`Error setting cache for key "${key}":`, error);
    }
};

/**
 * Retrieves a value from localStorage and parses it as JSON.
 * This is for the PERSISTENT cache.
 * @param {string} key - The key of the data to retrieve.
 * @returns {any | null} The parsed data or null if not found or on error.
 */
export const getCache = (key) => {
    try {
        const serializedValue = localStorage.getItem(key);
        if (serializedValue === null) {
            return null;
        }
        return JSON.parse(serializedValue);
    } catch (error) {
        console.error(`Error getting cache for key "${key}":`, error);
        return null;
    }
};

// ✨ --- NEW TTL CACHE FUNCTIONS --- ✨

/**
 * Saves a value to localStorage with a timestamp for expiration.
 * @param {string} key The key under which to store the data.
 * @param {any} value The value to store.
 */
export const setTtlCache = (key, value) => {
    const item = {
        data: value,
        timestamp: new Date().getTime(),
    };
    try {
        localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
        console.error(`Error setting TTL cache for key "${key}":`, error);
    }
};

/**
 * Retrieves a non-expired value from localStorage.
 * @param {string} key The key of the data to retrieve.
 * @param {number} ttlInMinutes The time-to-live in minutes. Defaults to 15.
 * @returns {any | null} The parsed data or null if not found or expired.
 */
export const getTtlCache = (key, ttlInMinutes = 15) => {
    try {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) {
            return null;
        }
        const item = JSON.parse(itemStr);
        const now = new Date().getTime();
        const ttlInMilliseconds = ttlInMinutes * 60 * 1000;

        if (now - item.timestamp > ttlInMilliseconds) {
            // Item has expired, so remove it and return null
            localStorage.removeItem(key);
            return null;
        }

        return item.data;
    } catch (error) {
        console.error(`Error getting TTL cache for key "${key}":`, error);
        return null;
    }
};