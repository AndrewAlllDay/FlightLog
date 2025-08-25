import { useCallback, useRef } from 'react';

/**
 * A custom React hook to handle long press events on an element.
 * @param {Function} onLongPress The callback function to execute on a long press.
 * @param {object} [options] Configuration options.
 * @param {number} [options.delay=400] The duration in milliseconds to wait before triggering a long press.
 * @returns {object} Event handlers to be spread onto the target element.
 */
export const useLongPress = (onLongPress, { delay = 400 } = {}) => {
    const timeout = useRef();

    // This function is called when the user presses down.
    // It starts a timer.
    const start = useCallback(
        (event) => {
            // We clone the event to persist it, as React's synthetic events are pooled.
            // This is important because we're accessing the event in an async callback (setTimeout).
            if (event.persist) {
                event.persist();
            }
            timeout.current = setTimeout(() => {
                onLongPress(event);
            }, delay);
        },
        [onLongPress, delay]
    );

    // This function is called when the user releases their press.
    // It clears the timer, preventing the long press from firing if it was a short click.
    const clear = useCallback(() => {
        timeout.current && clearTimeout(timeout.current);
    }, []);

    return {
        onMouseDown: (e) => start(e),
        onTouchStart: (e) => start(e),
        onMouseUp: () => clear(),
        onMouseLeave: () => clear(),
        onTouchEnd: () => clear(),
        // This specifically prevents the browser's context menu (right-click menu)
        // from appearing, which is a much cleaner way to handle this.
        onContextMenu: (e) => e.preventDefault(),
    };
};