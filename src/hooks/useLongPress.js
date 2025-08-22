import { useCallback, useRef } from 'react';

/**
 * A custom React hook to handle long press events on an element.
 * @param {Function} onLongPress The callback function to execute on a long press.
 * @param {object} [options] Configuration options.
 * @param {boolean} [options.shouldPreventDefault=true] Whether to prevent default browser behavior (like the context menu).
 * @param {number} [options.delay=300] The duration in milliseconds to wait before triggering a long press.
 * @returns {object} Event handlers to be spread onto the target element.
 */
export const useLongPress = (
    onLongPress,
    { shouldPreventDefault = true, delay = 400 } = {}
) => {
    const timeout = useRef();
    const target = useRef();

    const start = useCallback(
        (event) => {
            if (shouldPreventDefault && event.target) {
                event.target.addEventListener("touchend", preventDefault, { passive: false });
                target.current = event.target;
            }
            timeout.current = setTimeout(() => {
                onLongPress(event);
            }, delay);
        },
        [onLongPress, delay, shouldPreventDefault]
    );

    const clear = useCallback(
        // The unused 'event' parameter has been removed from this function's signature
        () => {
            timeout.current && clearTimeout(timeout.current);

            if (shouldPreventDefault && target.current) {
                target.current.removeEventListener("touchend", preventDefault);
            }
        },
        [shouldPreventDefault]
    );

    const preventDefault = (event) => {
        if (!event) return;
        if (event.touches.length < 2 && event.preventDefault) {
            event.preventDefault();
        }
    };

    return {
        onMouseDown: (e) => start(e),
        onTouchStart: (e) => start(e),
        onMouseUp: (e) => clear(e),
        onMouseLeave: (e) => clear(e),
        onTouchEnd: (e) => clear(e),
    };
};