import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Portal = ({ children }) => {
    // Create a ref to hold a div element
    const elRef = useRef(null);
    if (!elRef.current) {
        elRef.current = document.createElement('div');
    }

    useEffect(() => {
        // Find the portal-root element in your index.html
        const portalRoot = document.getElementById('portal-root');

        // On mount, append the element to the portal-root
        portalRoot.appendChild(elRef.current);

        // On unmount, cleanup and remove the element
        return () => portalRoot.removeChild(elRef.current);
    }, []);

    // Use createPortal to render children into the element held by the ref
    return createPortal(children, elRef.current);
};

export default Portal;