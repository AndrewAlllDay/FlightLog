// CourseDetail.jsx

import React from 'react';

export default function CourseDetail({ course, onBack }) {
    return (
        <div>
            <button
                onClick={onBack}
                className="mb-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
                ← Back to Courses
            </button>
            <h2 className="text-2xl font-bold mb-4">{course.name}</h2>
            {/* Hole list & add hole UI goes here */}
        </div>
    );
}
