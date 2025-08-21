// src/components/SplashPage.jsx
import React from 'react';
import LogoImage from '../assets/DG Logo.svg'; // Make sure this path is correct

// Import the SVG for the disc golf basket
import DiscGolfBasketSVG from '../assets/DiscGolfBasket.svg'; // You'll need to create this file!

const SplashPage = ({ onEnterApp }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-300 relative overflow-hidden">
            {/* Main content */}
            <img
                src={LogoImage}
                alt="DG Caddy Notes Logo"
                className="h-24 w-auto mb-4 animate-fade-in"
            />

            <p className="text-lg md:text-xl text-center max-w-2xl leading-relaxed mb-10 animate-fade-in delay-400">
                Your ultimate disc golf companion.
                Take notes on courses, track your bag, and receive encouragement from your community.
                Get ready to elevate your game!
            </p>

            <button
                onClick={onEnterApp}
                className="px-8 py-4 spec-sec-bg hover:bg-blue-700 text-white font-semibold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 animate-fade-in delay-600"
            >
                Get Started
            </button>

            {/* Disc Golf Basket SVG */}
            <img
                src={DiscGolfBasketSVG}
                alt="Disc Golf Basket"
                className="absolute bottom-[-100px] left-1/2 transform -translate-x-1/2 w-48 h-auto opacity-20 dark:opacity-20 pointer-events-none"
            />
        </div>
    );
};

export default SplashPage;