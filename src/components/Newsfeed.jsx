import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getTtlCache, setTtlCache } from '../utilities/cache.js';

// --- Local default images ---
import UltiworldDefaultImage from '../assets/Ultiworld_Default.jpg';
import DGPTDefaultImage from '../assets/DGPT_Default.jpg';

const defaultImages = {
    // News
    Ultiworld: UltiworldDefaultImage,
    DGPT: DGPTDefaultImage,
    PDGA: 'https://via.placeholder.com/1200x675/004C84/FFFFFF?text=PDGA',
    // Podcasts
    'The Upshot': 'https://via.placeholder.com/1200x675/28a745/FFFFFF?text=The+Upshot',
    'Griplocked': 'https://via.placeholder.com/1200x675/6f42c1/FFFFFF?text=Griplocked',
    // Videos
    JomezPro: 'https://via.placeholder.com/1200x675/dc3545/FFFFFF?text=JomezPro',
    'Gatekeeper Media': 'https://via.placeholder.com/1200x675/ffc107/000000?text=Gatekeeper+Media',
    // Fallback
    default: 'https://via.placeholder.com/1200x675.png?text=Disc+Golf+Media'
};

const feedSources = {
    News: [
        { name: 'Ultiworld', url: 'https://discgolf.ultiworld.com/feed/' },
        { name: 'DGPT', url: 'https://www.dgpt.com/feed/' },
        { name: 'PDGA', url: 'https://www.pdga.com/frontpage/feed' }
    ],
    Podcasts: [
        {
            name: 'Griplocked',
            url: 'https://feeds.simplecast.com/WCZ5a8oV',
            platformLinks: {
                PocketCasts: 'https://pca.st/podcast/07f29fe0-bb6f-0137-0dc0-0acc26574db2',
            }
        },
        {
            name: 'The Upshot',
            url: 'https://www.spreaker.com/show/1765686/episodes/feed',
            platformLinks: {
                PocketCasts: 'https://pca.st/podcast/c1dc4a30-0410-0134-9c92-59d98c6b72b8',
            }
        },
        {
            name: 'Crushed Pepper',
            url: 'https://media.rss.com/crushed-pepper/feed.xml',
            platformLinks: {
                PocketCasts: 'https://pocketcasts.com/podcasts/2377ca00-b185-013d-4c1f-0affce82ed89',
            }
        }
    ],
    Video: [
        { name: 'JomezPro', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCk3_TorY9pBGoN-8pEXkM7Q' },
        { name: 'Gatekeeper Media', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC9__k_P4W2kM9_2xW7K1_oQ' }
    ]
};

const PodcastModal = ({ item, onClose }) => {
    if (!item) return null;
    const handleModalContentClick = (e) => e.stopPropagation();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={handleModalContentClick}>
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Listen on your favorite platform:</p>
                <div className="space-y-3">
                    {item.podcastLinks?.PocketCasts && (
                        <a href={item.podcastLinks.PocketCasts} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-red-500 hover:bg-red-600 !text-white font-bold py-2 px-4 rounded transition-colors">
                            Pocket Casts
                        </a>
                    )}
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-2 px-4 rounded transition-colors">
                        Open in Browser
                    </a>
                </div>
                <button onClick={onClose} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
                    Close
                </button>
            </div>
        </div>
    );
};

const NewsFeed = () => {
    const [feedInfo, setFeedInfo] = useState({ title: 'Disc Golf Media Feed', description: 'The latest from across the sport' });
    const [activeTab, setActiveTab] = useState('News');
    const [allItems, setAllItems] = useState([]);
    const [displayedItems, setDisplayedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPodcast, setSelectedPodcast] = useState(null);
    const observer = useRef();

    const lastItemRef = useCallback(node => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && allItems.length > displayedItems.length) {
                setIsLoading(true);
                setTimeout(() => {
                    setDisplayedItems(prev => allItems.slice(0, prev.length + 5));
                    setIsLoading(false);
                }, 300);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, allItems, displayedItems]);

    useEffect(() => {
        const fetchAllFeeds = async () => {
            setIsLoading(true);
            setError(null);
            const cacheKey = `feed-${activeTab}`;
            const cachedData = getTtlCache(cacheKey, 15);
            if (cachedData) {
                setAllItems(cachedData);
                setDisplayedItems(cachedData.slice(0, 5));
                setIsLoading(false);
                return;
            }
            setAllItems([]);
            setDisplayedItems([]);
            const currentSources = feedSources[activeTab];

            try {
                const responses = await Promise.all(
                    currentSources.map(source => {
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(source.url)}`;
                        return fetch(proxyUrl).then(res => ({ res, source }));
                    })
                );
                responses.forEach(({ res }) => {
                    if (!res.ok) throw new Error(`Network response was not ok. Status: ${res.status}`);
                });

                const allParsedItems = await Promise.all(
                    responses.map(async ({ res, source }) => {
                        const text = await res.text();
                        const parser = new window.DOMParser();
                        const xmlDoc = parser.parseFromString(text, "application/xml");
                        const channelImageTag = xmlDoc.querySelector('channel > image > url');
                        const itunesImageTag = xmlDoc.querySelector('channel > itunes\\:image');
                        const channelCoverUrl = channelImageTag?.textContent || itunesImageTag?.getAttribute('href') || null;

                        return Array.from(xmlDoc.querySelectorAll('item, entry')).map(item => {
                            const mediaNamespace = 'http://search.yahoo.com/mrss/';
                            const enclosure = item.querySelector('enclosure');
                            const mediaThumbnail = item.getElementsByTagNameNS(mediaNamespace, 'thumbnail')[0];

                            let episodeImageUrl = null;
                            if (enclosure && enclosure.getAttribute('type')?.startsWith('image/')) {
                                episodeImageUrl = enclosure.getAttribute('url');
                            } else if (mediaThumbnail) {
                                episodeImageUrl = mediaThumbnail.getAttribute('url');
                            } else {
                                const content = item.querySelector('description')?.textContent || item.getElementsByTagNameNS(mediaNamespace, 'description')[0]?.textContent || '';
                                const doc = new DOMParser().parseFromString(content, 'text/html');
                                episodeImageUrl = doc.querySelector('img')?.src || null;
                            }

                            const descriptionHTML = item.querySelector('description')?.textContent || item.getElementsByTagNameNS(mediaNamespace, 'description')[0]?.textContent || '';
                            const descParser = new window.DOMParser();
                            const descDoc = descParser.parseFromString(descriptionHTML, 'text/html');
                            descDoc.querySelectorAll('img').forEach(img => img.remove());
                            const cleanDescription = descDoc.body.innerHTML;
                            const linkNode = item.querySelector('link');
                            const link = linkNode?.getAttribute('href') || linkNode?.textContent || '';
                            const published = item.querySelector('pubDate')?.textContent || item.querySelector('published')?.textContent || new Date().toISOString();

                            return {
                                guid: item.querySelector('guid')?.textContent || item.querySelector('id')?.textContent || link,
                                source: source.name,
                                title: item.querySelector('title')?.textContent || '',
                                link,
                                description: cleanDescription,
                                published,
                                imageUrl: episodeImageUrl,
                                podcastCoverUrl: channelCoverUrl,
                                podcastLinks: source.platformLinks
                            };
                        });
                    })
                );
                const combinedItems = allParsedItems.flat();
                const sortedItems = combinedItems.sort((a, b) => new Date(b.published) - new Date(a.published));
                const uniqueItems = Array.from(new Map(sortedItems.map(item => [item.guid, item])).values());
                setTtlCache(cacheKey, uniqueItems);

                setAllItems(uniqueItems);
                setDisplayedItems(uniqueItems.slice(0, 5));
            } catch (e) {
                console.error('Failed to fetch or parse RSS feeds:', e);
                setError(`Failed to load the ${activeTab.toLowerCase()} feed. Please try again later.`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllFeeds();
    }, [activeTab]);

    return (
        <div className="p-4">
            <h2 className="text-3xl font-bold text-center pt-5 mb-2">{feedInfo.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">{feedInfo.description}</p>

            <div className="flex justify-center mb-6">
                {Object.keys(feedSources).map((tabName, index, arr) => {
                    // --- START: DIAGNOSTIC STYLE OBJECT ---
                    // This creates a style object that will be applied directly to the button.
                    const buttonStyle = {};
                    if (index < arr.length - 1) {
                        // We are forcing a 2px solid red border to the right of the button.
                        // If this shows up, it confirms a CSS rule in your project is overriding the Tailwind classes.
                        buttonStyle.borderRight = '1px solid black';
                    }
                    // --- END: DIAGNOSTIC STYLE OBJECT ---

                    return (
                        <button
                            key={tabName}
                            onClick={() => setActiveTab(tabName)}
                            // Apply the inline style object here. This has the highest priority.
                            style={buttonStyle}
                            className={`
                                py-2 px-6 text-lg font-medium focus:outline-none transition-colors duration-300 !rounded-none !bg-transparent
                                ${activeTab === tabName
                                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 border-b-2 border-transparent'}
                            `}
                        >
                            {tabName}
                        </button>
                    );
                })}
            </div>

            {isLoading && displayedItems.length === 0 && <div className="text-center p-4">Loading {activeTab.toLowerCase()}...</div>}
            <ul className={activeTab === 'Podcasts' ? "list-none p-0 flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0"}>
                {displayedItems.map((item, index) => {
                    const isLastItem = displayedItems.length === index + 1;
                    if (activeTab === 'Podcasts') {
                        return (
                            <li ref={isLastItem ? lastItemRef : null} key={item.guid} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                                <button onClick={() => setSelectedPodcast(item)} className="flex items-center gap-4 p-3 text-left w-full hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                                    <img src={item.podcastCoverUrl || defaultImages[item.source] || defaultImages.default} alt={item.source} className="w-20 h-20 md:w-24 md:h-24 rounded-md object-cover flex-shrink-0" loading="lazy" />
                                    <div className="flex-grow">
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{item.source}</p>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mt-1">{item.title}</h3>
                                    </div>
                                </button>
                            </li>
                        );
                    }
                    return (
                        <li ref={isLastItem ? lastItemRef : null} key={item.guid} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col">
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                                <img src={item.imageUrl || defaultImages[item.source] || defaultImages.default} alt={item.title} className="w-full h-48 object-cover" loading="lazy" />
                            </a>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="text-xl font-semibold mb-2 flex-grow">
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{item.title}</a>
                                </h3>
                                <div className="text-sm text-gray-700 dark:text-gray-300 mb-4 [&_a]:text-blue-500 [&_a]:underline" dangerouslySetInnerHTML={{ __html: item.description }} />
                                <p className="text-xs text-gray-500 mt-auto">{item.source} | {new Date(item.published).toLocaleString()}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
            {isLoading && displayedItems.length > 0 && <div className="text-center p-4 col-span-full">Loading more...</div>}
            {error && !isLoading && <div className="p-4 text-center text-red-600 col-span-full">{error}</div>}
            {displayedItems.length > 0 && displayedItems.length === allItems.length && !isLoading && (<div className="text-center p-4 text-gray-500 col-span-full">You've reached the end!</div>)}
            <PodcastModal item={selectedPodcast} onClose={() => setSelectedPodcast(null)} />
        </div>
    );
};

export default NewsFeed;