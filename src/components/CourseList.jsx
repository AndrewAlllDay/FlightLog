import React, { useState, useRef, useEffect, useMemo } from 'react'; // 👈 1. Import useMemo
import CourseItem from './CourseItem';

export default function CourseList({ courses, onDeleteCourse, onSelectCourse, tournamentName }) {
    const [swipedCourseId, setSwipedCourseId] = useState(null);
    const touchStartX = useRef(0);
    const touchCurrentX = useRef(0);
    const swipingItemId = useRef(null);
    const hasSwipedEnough = useRef(false);
    const listRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (swipedCourseId && listRef.current && !listRef.current.contains(event.target)) {
                setSwipedCourseId(null);
            }
        };

        window.addEventListener('click', handleClickOutside);
        window.addEventListener('touchstart', handleClickOutside);

        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('touchstart', handleClickOutside);
        };
    }, [swipedCourseId]);

    const handleTouchStart = (e, id) => {
        if (swipedCourseId && swipedCourseId !== id) {
            setSwipedCourseId(null);
        }
        touchStartX.current = e.touches[0].clientX;
        swipingItemId.current = id;
        hasSwipedEnough.current = false;
    };

    const handleTouchMove = (e, id) => {
        if (swipingItemId.current !== id) return;
        touchCurrentX.current = e.touches[0].clientX;
        const diff = touchCurrentX.current - touchStartX.current;
        if (diff < -40 && !hasSwipedEnough.current) {
            setSwipedCourseId(id);
            hasSwipedEnough.current = true;
        }
        if (swipedCourseId === id && diff > 20) {
            setSwipedCourseId(null);
            hasSwipedEnough.current = false;
        }
    };

    const handleTouchEnd = (id) => {
        if (swipedCourseId === id && hasSwipedEnough.current) {
            // Item remains swiped open
        } else if (swipedCourseId === id) {
            setSwipedCourseId(null);
        }
        swipingItemId.current = null;
        touchStartX.current = 0;
        touchCurrentX.current = 0;
        hasSwipedEnough.current = false;
    };

    // ✨ 2. The sorting calculation is now wrapped in useMemo.
    // This ensures it only runs when the `courses` prop changes.
    const sortedCourses = useMemo(() => {
        return [...courses].sort((a, b) => a.name.localeCompare(b.name));
    }, [courses]);

    return (
        <ul ref={listRef} className="list-none p-0 m-0">
            {sortedCourses.length === 0 ? (
                <div className="text-center p-8 text-gray-600">
                    <p>No courses added yet.</p>
                </div>
            ) : (
                sortedCourses.map((course) => (
                    <CourseItem
                        key={course.id}
                        course={course}
                        onClick={onSelectCourse}
                        onDelete={onDeleteCourse}
                        swipedCourseId={swipedCourseId}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        tournamentName={tournamentName}
                    />
                ))
            )}
        </ul>
    );
}