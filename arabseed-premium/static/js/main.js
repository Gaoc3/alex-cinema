/**
 * Cinemana Premium - Premium Web Portal JS Controller
 * --------------------------------------------------
 * Manages SPA routing, API communications, dynamic DOM rendering,
 * horizontal category carousel rows, search results grids, and Plyr.js streaming.
 */

// Global App State
const state = {
    activePlayer: null,
    previewHlsInstance: null,
    searchResults: [],
    categories: [],
    selectedItem: null,
    currentEpisodes: [],
    activeServerList: [],
    bestServer: null,
    networkType: 'مباشر'
};


// SVG Poster Fallback Data URL
const SVG_POSTER_PLACEHOLDER = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'><rect width='100%' height='100%' fill='%2314171c'/><g transform='translate(100, 160)'><circle cx='50' cy='50' r='40' fill='%23e50914' opacity='0.15'/><path d='M10 20 L90 20 L80 90 L20 90 Z' fill='%23e50914' opacity='0.6'/><rect x='15' y='30' width='70' height='50' rx='4' fill='%23ef4444' opacity='0.8'/><polygon points='45,45 65,55 45,65' fill='%23ffffff'/><circle cx='50' cy='110' r='8' fill='%2310b981'/><circle cx='20' cy='110' r='6' fill='%23f59e0b'/><circle cx='80' cy='110' r='6' fill='%23f43f5e'/></g><text x='50%' y='360' font-family='Cairo, sans-serif' font-weight='700' font-size='16' fill='%239ca3af' text-anchor='middle'>لا يتوفر بوستر</text></svg>`;

// DOM Elements Cache
const elements = {
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    mobileMenuClose: document.getElementById('mobile-menu-close'),
    navLinksMenu: document.getElementById('nav-links-menu'),
    searchForm: document.getElementById('main-search-form'),
    searchInput: document.getElementById('search-input'),
    searchSubmitBtn: document.getElementById('search-submit-btn'),
    cardsGrid: document.getElementById('cards-grid'),
    emptyState: document.getElementById('empty-results-state'),
    spinnerLoader: document.getElementById('spinner-loader'),
    resultsHeader: document.getElementById('results-header-container'),
    resultsCount: document.getElementById('results-count-badge'),
    resultsTitleText: document.getElementById('results-title-text'),
    netBadgeText: document.getElementById('network-name'),
    netBadgeContainer: document.getElementById('net-badge'),
    
    // Details Modal
    detailsModal: document.getElementById('details-modal'),
    closeDetailsBtn: document.getElementById('close-details-btn'),
    modalPoster: document.getElementById('modal-poster'),
    modalRating: document.getElementById('modal-rating'),
    modalQuality: document.getElementById('modal-quality'),
    modalType: document.getElementById('modal-type'),
    modalTitleText: document.getElementById('modal-title-text'),
    modalStoryText: document.getElementById('modal-story-text'),
    modalQuickPlayBtn: document.getElementById('modal-quick-play-btn'),
    
    // Seasons Section
    modalSeasonsSection: document.getElementById('modal-seasons-section'),
    modalSeasonsGrid: document.getElementById('modal-seasons-grid'),
    
    
    // Episodes Section
    modalEpisodesSection: document.getElementById('modal-episodes-section'),
    episodeFilterInput: document.getElementById('episode-filter-input'),
    modalEpisodesGrid: document.getElementById('modal-episodes-grid'),
    
    // Servers Section
    modalServersSection: document.getElementById('modal-servers-section'),
    modalServersList: document.getElementById('modal-servers-list'),
    serversLoader: document.getElementById('servers-loading-spinner'),
    
    // Player Modal (Embedded Widescreen Viewport inside details modal)
    playerModal: document.getElementById('modal-player-viewport'),
    closePlayerBtn: document.getElementById('modal-close-player-btn'),
    playerTitleDisplay: document.getElementById('modal-title-text'),
    playerRenderArea: document.getElementById('modal-player-render-area'),
    playerServerBadge: document.getElementById('player-server-badge'),
    
    // Navigation Buttons
    navHomeBtn: document.getElementById('nav-home-btn'),
    navMoviesBtn: document.getElementById('nav-movies-btn'),
    navSeriesBtn: document.getElementById('nav-series-btn'),
    navAnimeBtn: document.getElementById('nav-anime-btn'),
    logoTrigger: document.getElementById('logo-trigger'),
    
    // Live Search Elements
    liveSearchDropdown: document.getElementById('live-search-dropdown'),
    liveSearchLoader: document.getElementById('live-search-loader'),
    liveSearchResults: document.getElementById('live-search-results'),
    
    // Giant Hero Slider Elements
    heroSliderArea: document.getElementById('hero-slider-area'),
    heroSliderWrapper: document.getElementById('hero-slider-wrapper'),
    heroSliderDots: document.getElementById('hero-slider-dots'),
    heroSliderPrev: document.getElementById('hero-slider-prev'),
    heroSliderNext: document.getElementById('hero-slider-next')
};

// ============================================================================
// Core Event Bindings
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (elements.searchForm) elements.searchForm.addEventListener('submit', handleSearchSubmit);
    if (elements.closeDetailsBtn) elements.closeDetailsBtn.onclick = closeDetailsModal;
    if (elements.closePlayerBtn) elements.closePlayerBtn.onclick = closePlayerModal;
    if (elements.episodeFilterInput) elements.episodeFilterInput.addEventListener('input', handleEpisodeFilter);
    
    // Mobile Menu Logic
    if (elements.mobileMenuBtn && elements.navLinksMenu) {
        elements.mobileMenuBtn.addEventListener('click', () => {
            elements.navLinksMenu.classList.add('nav-active');
        });
    }
    if (elements.mobileMenuClose && elements.navLinksMenu) {
        elements.mobileMenuClose.addEventListener('click', () => {
            elements.navLinksMenu.classList.remove('nav-active');
        });
    }
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (elements.navLinksMenu && elements.navLinksMenu.classList.contains('nav-active')) {
            if (!elements.navLinksMenu.contains(e.target) && !elements.mobileMenuBtn.contains(e.target)) {
                elements.navLinksMenu.classList.remove('nav-active');
            }
        }
    });
    
    // Play button / Entire Poster Wrapper overlay click action
    const posterWrapper = document.getElementById('modal-poster-wrapper');
    if (posterWrapper) {
        posterWrapper.onclick = () => {
            // Trigger the prominent quick play button click
            if (elements.modalQuickPlayBtn && elements.modalQuickPlayBtn.style.display !== 'none' && elements.modalQuickPlayBtn.onclick) {
                elements.modalQuickPlayBtn.click();
            } else {
                // If quick play button is not ready or hidden, play the first available episode or server
                const firstEpBtn = elements.modalEpisodesGrid.querySelector('.episode-btn');
                if (firstEpBtn) {
                    firstEpBtn.click();
                } else {
                    showToast("جاري تجهيز روابط البث، يرجى الانتظار ثوانٍ...", "info");
                }
            }
        };
    }
    
    // Live Search - debounced input handler and client-side memory cache
    let liveSearchTimer = null;
    window.liveSearchAbortController = null;
    window.liveSearchCache = {};
    
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', () => {
            const query = elements.searchInput.value.trim();
            if (liveSearchTimer) clearTimeout(liveSearchTimer);
            if (!query || query.length < 2) {
                if (elements.liveSearchDropdown) elements.liveSearchDropdown.style.display = 'none';
                // Abort any active pending search fetches immediately
                if (window.liveSearchAbortController) {
                    window.liveSearchAbortController.abort();
                }
                return;
            }
            liveSearchTimer = setTimeout(() => performLiveSearch(query), 750); // Increased debounce to 750ms to prevent Cloudflare 429 WAF triggers on remote scraping
        });
        
        // Live Search - focus handler to restore active dropdown
        elements.searchInput.addEventListener('focus', () => {
            const query = elements.searchInput.value.trim();
            if (query && query.length >= 2) {
                if (elements.liveSearchDropdown) elements.liveSearchDropdown.style.display = 'block';
            }
        });
    }
    
    // Bind search icon click event to programmatically submit search form
    const searchIcon = document.querySelector('.nav-search-icon');
    if (searchIcon) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', () => {
            elements.searchForm.requestSubmit();
        });
    }
    
    // Close dropdown on clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-search-wrapper') && !e.target.closest('.search-wrapper')) {
            if (elements.liveSearchDropdown) elements.liveSearchDropdown.style.display = 'none';
        }
    });
    
    // Navigation Action Handlers
    const pageId = document.body.dataset.page;
    
    const handleNavClick = (e, btn, searchKey, searchTitle, tabName) => {
        if (pageId === 'home') {
            e.preventDefault();
            updateNavActive(btn);
            if (searchKey === '__home__') {
                resetHomeUI();
            } else {
                performSearch(searchKey, searchTitle);
            }
        } else {
            // If not on home page, navigate to home with the tab parameter
            e.preventDefault();
            window.location.href = tabName ? `/?tab=${tabName}` : '/';
        }
    };

    if (elements.navHomeBtn) elements.navHomeBtn.onclick = (e) => handleNavClick(e, elements.navHomeBtn, '__home__', '', null);
    if (elements.logoTrigger) elements.logoTrigger.onclick = (e) => handleNavClick(e, elements.navHomeBtn, '__home__', '', null);
    if (elements.navMoviesBtn) elements.navMoviesBtn.onclick = (e) => handleNavClick(e, elements.navMoviesBtn, '__movies__', 'أحدث الأفلام المضافة', 'movies');
    if (elements.navSeriesBtn) elements.navSeriesBtn.onclick = (e) => handleNavClick(e, elements.navSeriesBtn, '__series__', 'أحدث المسلسلات المضافة', 'series');
    if (elements.navAnimeBtn) elements.navAnimeBtn.onclick = (e) => handleNavClick(e, elements.navAnimeBtn, '__anime__', 'عالم الأنمي والكرتون', 'anime');
    
    // Close modals on clicking overlay background
    if (elements.detailsModal) elements.detailsModal.onclick = (e) => { if (e.target === elements.detailsModal) closeDetailsModal(); };
    if (elements.playerModal) elements.playerModal.onclick = (e) => { if (e.target === elements.playerModal) closePlayerModal(); };
    
    // Click network badge to clear cache and refresh UI dynamically
    if (elements.netBadgeContainer) {
        elements.netBadgeContainer.addEventListener('click', async () => {
            const badgeIcon = elements.netBadgeContainer.querySelector('.badge-icon');
            if (badgeIcon) {
                badgeIcon.className = 'fa-solid fa-sync fa-spin badge-icon';
            }
            
            try {
                showToast("🔄 جاري تحديث ومزامنة ذاكرة التخزين المؤقت تسريعاً للتحميل...", "info");
                const res = await fetch('/api/cache/clear');
                const data = await res.json();
                
                if (data.status === 'success') {
                    showToast("⚡ تم تطهير ذاكرة التخزين وتنشيط الاستجابة فورياً بنجاح!", "success");
                    
                    // Reload the active section dynamically
                    const activeNav = document.querySelector('.nav-link.active');
                    if (activeNav) {
                        activeNav.click(); // Programmatically trigger active category reload
                    } else {
                        resetHomeUI();
                    }
                } else {
                    showToast("⚠️ لم يتمكن الخادم من تحديث الكاش بالكامل.", "warning");
                }
            } catch (e) {
                console.error("Cache clear failed:", e);
                showToast("❌ فشل الاتصال بالخادم لتحديث الكاش.", "error");
            } finally {
                if (badgeIcon) {
                    badgeIcon.className = 'fa-solid fa-wifi badge-icon';
                }
            }
        });
    }

    // Detect ISP connection
    detectNetwork();
    
    // Auto-load based on current MPA page
    if (pageId === 'home') {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab === 'movies' && elements.navMoviesBtn) {
            elements.navMoviesBtn.click();
        } else if (tab === 'series' && elements.navSeriesBtn) {
            elements.navSeriesBtn.click();
        } else if (tab === 'anime' && elements.navAnimeBtn) {
            elements.navAnimeBtn.click();
        } else {
            resetHomeUI();
        }
    } else if (pageId === 'search') {
        if (window.SEARCH_QUERY) {
            performSearch(window.SEARCH_QUERY, 'نتائج البحث عن: ' + window.SEARCH_QUERY);
        }
    } else if (pageId === 'show') {
        if (window.SHOW_URL) {
            openDetailsModal({
                url: window.SHOW_URL, 
                title: window.SHOW_TITLE, 
                poster: window.SHOW_POSTER,
                rating: window.SHOW_RATING,
                quality: window.SHOW_QUALITY,
                type: window.SHOW_TYPE
            });
        }
    } else if (pageId === 'watch') {
        if (window.WATCH_URL) {
            document.getElementById('modal-player-viewport').style.display = 'block';
            fetchStreamingServers(window.WATCH_URL, window.WATCH_TITLE, "", false, "", "", true);
        }
    }
});

// Horizontal Carousel slider scroll control
window.scrollSlider = function(trackId, distance) {
    const track = document.getElementById(trackId);
    if (track) {
        // Adjust for RTL layout (scrolling left is negative, right is positive)
        track.scrollBy({ left: -distance, behavior: 'smooth' });
    }
};

// Open details for a card (Redirects to /show page now)
window.openDetailsModalByData = function(catIdx, cardIdx) {
    if (state.categories[catIdx] && state.categories[catIdx].cards[cardIdx]) {
        const item = state.categories[catIdx].cards[cardIdx];
        window.location.href = `/show?url=${encodeURIComponent(item.url)}&poster=${encodeURIComponent(item.poster || '')}&title=${encodeURIComponent(item.title || '')}&rating=${encodeURIComponent(item.rating || '')}&quality=${encodeURIComponent(item.quality || '')}`;
    }
};

// ============================================================================
// Logic Handlers
// ============================================================================

function showToast(message, type = 'info') {
    let container = document.querySelector('.alex-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'alex-toast-container';
        document.body.appendChild(container);
    }
    
    // Deduplicate toast alerts to prevent duplicate stacking
    const existingToasts = container.querySelectorAll('.alex-toast span');
    for (let el of existingToasts) {
        if (el.innerText.trim() === message.trim()) {
            return; // Duplicate toast ignored!
        }
    }
    
    const toast = document.createElement('div');
    toast.className = `alex-toast ${type === 'success' ? 'alex-toast-success' : ''}`;
    
    let iconHTML = '<i class="fa-solid fa-info-circle alex-toast-icon"></i>';
    if (type === 'success') {
        iconHTML = '<i class="fa-solid fa-circle-check alex-toast-icon"></i>';
    } else if (type === 'warning') {
        iconHTML = '<i class="fa-solid fa-triangle-exclamation alex-toast-icon"></i>';
    } else if (type === 'error') {
        iconHTML = '<i class="fa-solid fa-circle-xmark alex-toast-icon"></i>';
    }
    
    toast.innerHTML = `
        ${iconHTML}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 4000);
}

function detectNetwork() {
    /** Dynamic Network Detection Badge */
    if (navigator.connection) {
        const type = navigator.connection.effectiveType || 'wifi';
        const rtt = navigator.connection.rtt || 'N/A';
        elements.netBadgeText.innerText = `السرعة: ${type.toUpperCase()} (الاستجابة: ${rtt}ms)`;
    } else {
        elements.netBadgeText.innerText = `الشبكة: متصل مباشر`;
    }
}

function handleSearchSubmit(e) {
    e.preventDefault();
    const query = elements.searchInput ? elements.searchInput.value.trim() : '';
    if (!query) {
        showToast("الرجاء إدخال كلمة للبحث عن العروض...", "warning");
        return;
    }
    
    updateNavActive(null); // Clear active navigation states
    
    const pageId = document.body.dataset.page;
    if (pageId !== 'search') {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    } else {
        if (elements.liveSearchDropdown) elements.liveSearchDropdown.style.display = 'none';
        window.history.pushState({}, '', `/search?q=${encodeURIComponent(query)}`);
        window.SEARCH_QUERY = query;
        performSearch(query, `نتائج البحث عن: ${query}`);
    }
}

function updateNavActive(activeBtn) {
    [elements.navHomeBtn, elements.navMoviesBtn, elements.navSeriesBtn, elements.navAnimeBtn].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
}

async function performLiveSearch(query) {
    // 1. Check client-side memory cache first for 0ms instant display!
    if (window.liveSearchCache[query]) {
        renderLiveSearchResults(window.liveSearchCache[query], query);
        return;
    }
    
    // 2. Abort any previous active search fetch immediately to eliminate lag
    if (window.liveSearchAbortController) {
        window.liveSearchAbortController.abort();
    }
    
    // Create a new AbortController
    window.liveSearchAbortController = new AbortController();
    const signal = window.liveSearchAbortController.signal;
    
    // Show dropdown with loader
    elements.liveSearchDropdown.style.display = 'block';
    elements.liveSearchLoader.style.display = 'block';
    elements.liveSearchResults.innerHTML = '';
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&live=true`, { signal });
        const data = await response.json();
        
        const results = data.results || [];
        
        // Save to client memory cache
        window.liveSearchCache[query] = results;
        
        // Render results
        renderLiveSearchResults(results, query);
    } catch (e) {
        if (e.name === 'AbortError') {
            // Ignore abort errors as they represent newer keystroke cancellations
            return;
        }
        elements.liveSearchLoader.style.display = 'none';
        elements.liveSearchResults.innerHTML = `
            <div class="live-search-no-results">
                <i class="fa-solid fa-triangle-exclamation"></i>
                حدث خطأ أثناء الاتصال بالخادم
            </div>
        `;
    }
}

function renderLiveSearchResults(results, query) {
    elements.liveSearchLoader.style.display = 'none';
    elements.liveSearchResults.innerHTML = '';
    
    if (results.length === 0) {
        elements.liveSearchResults.innerHTML = `
            <div class="live-search-no-results">
                <i class="fa-solid fa-magnifying-glass"></i>
                لا توجد نتائج لـ "${query}"
            </div>
        `;
        return;
    }
    
    // Show max 6 results in dropdown
    const displayResults = results.slice(0, 6);
    let html = '';
    
    displayResults.forEach((item) => {
        const posterSrc = item.poster || SVG_POSTER_PLACEHOLDER;
        html += `
            <div class="live-search-item" data-url="${item.url}" data-title="${item.title.replace(/"/g, '&quot;')}" data-poster="${posterSrc}" data-type="${item.type || 'فيلم'}" data-rating="${item.rating || '7.8'}" data-quality="${item.quality || '1080p'}">
                <img class="live-search-item-poster" src="${posterSrc}" alt="${item.title}" onerror="this.src='${SVG_POSTER_PLACEHOLDER}'" referrerpolicy="no-referrer">
                <div class="live-search-item-info">
                    <div class="live-search-item-title">${item.title}</div>
                    <div class="live-search-item-meta">
                        <span class="live-search-item-type">${item.type || 'فيلم'}</span>
                        <span class="live-search-item-quality">${item.quality || '1080p'}</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-left live-search-item-arrow"></i>
            </div>
        `;
    });
    
    if (results.length > 6) {
        html += `
            <div class="live-search-view-all" id="live-search-view-all">
                <i class="fa-solid fa-grid-2"></i>
                عرض كل ${results.length} نتيجة
            </div>
        `;
    }
    
    elements.liveSearchResults.innerHTML = html;
    
    // Bind click events to each search result item
    elements.liveSearchResults.querySelectorAll('.live-search-item').forEach(el => {
        el.addEventListener('click', () => {
            const itemData = {
                url: el.getAttribute('data-url'),
                title: el.getAttribute('data-title'),
                poster: el.getAttribute('data-poster'),
                type: el.getAttribute('data-type'),
                rating: el.getAttribute('data-rating'),
                quality: el.getAttribute('data-quality')
            };
            // Redirect to /show page
            window.location.href = `/show?url=${encodeURIComponent(itemData.url)}&poster=${encodeURIComponent(itemData.poster || '')}&title=${encodeURIComponent(itemData.title || '')}&rating=${encodeURIComponent(itemData.rating || '')}&quality=${encodeURIComponent(itemData.quality || '')}`;
            
            // Hide dropdown
            elements.liveSearchDropdown.style.display = 'none';
        });
    });
    
    // Bind "view all" button
    const viewAllBtn = document.getElementById('live-search-view-all');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            elements.liveSearchDropdown.style.display = 'none';
            elements.searchInput.value = query;
            updateNavActive(null);
            performSearch(query);
        });
    }
}

let heroSliderTimer = null;
let currentHeroSlideIdx = 0;

async function performSearch(query, customTitle = null) {
    // UI Loading State
    if (elements.cardsGrid) elements.cardsGrid.innerHTML = '';
    if (elements.emptyState) elements.emptyState.style.display = 'none';
    if (elements.spinnerLoader) elements.spinnerLoader.style.display = 'block';
    if (elements.resultsHeader) elements.resultsHeader.style.display = 'none';
    
    try {
        let apiUrl = `/api/search?q=${encodeURIComponent(query)}`;
        if (query === '__home__') {
            apiUrl = '/api/home';
        } else if (query === '__movies__') {
            apiUrl = '/api/movies';
        } else if (query === '__series__') {
            apiUrl = '/api/series';
        } else if (query === '__anime__') {
            apiUrl = '/api/anime';
        }
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (elements.spinnerLoader) elements.spinnerLoader.style.display = 'none';
        
        if (query === '__home__' && data.categories && data.categories.length > 0) {
            state.categories = data.categories;
            
            if (elements.resultsTitleText) elements.resultsTitleText.innerHTML = `<i class="fa-solid fa-star animate-pulse" style="color: var(--accent-violet);"></i> مكتبة AleX CINEMA المضافة حديثاً`;
            if (elements.resultsCount) elements.resultsCount.innerText = `${data.categories.length} تصنيف`;
            if (elements.resultsHeader) elements.resultsHeader.style.display = 'flex';
            
            // Show and render dynamic Hero Slider
            if (data.slides && data.slides.length > 0) {
                renderHeroSlider(data.slides);
                if (elements.heroSliderArea) elements.heroSliderArea.style.display = 'block';
            } else {
                if (elements.heroSliderArea) elements.heroSliderArea.style.display = 'none';
            }
            
            renderCarousels(data.categories);
        } else {
            // Hide Hero Slider when not on homepage
            if (elements.heroSliderArea) elements.heroSliderArea.style.display = 'none';
            if (heroSliderTimer) {
                clearInterval(heroSliderTimer);
                heroSliderTimer = null;
            }
            
            if (data.results && data.results.length > 0) {
                state.searchResults = data.results;
                
                if (elements.resultsTitleText) elements.resultsTitleText.innerHTML = `<i class="fa-solid fa-fire" style="color: var(--accent-blue);"></i> ${customTitle || `نتائج البحث عن: "${query}"`}`;
                if (elements.resultsCount) elements.resultsCount.innerText = `${data.results.length} عرض`;
                if (elements.resultsHeader) elements.resultsHeader.style.display = 'flex';
                
                renderCards(data.results);
            } else {
                renderEmptyState(`عذراً، لم نجد أي عروض تطابق "${query}". جرب كلمات بحث أخرى.`);
            }
        }
    } catch (e) {
        if (elements.spinnerLoader) elements.spinnerLoader.style.display = 'none';
        if (elements.heroSliderArea) elements.heroSliderArea.style.display = 'none';
        renderEmptyState(`حدث خطأ أثناء تحميل البيانات: ${e.message}. يرجى التحقق من اتصال الشبكة.`);
    }
}

function renderHeroSlider(slides) {
    if (!elements.heroSliderWrapper) return;
    elements.heroSliderWrapper.innerHTML = '';
    elements.heroSliderDots.innerHTML = '';
    
    if (heroSliderTimer) {
        clearInterval(heroSliderTimer);
        heroSliderTimer = null;
    }
    currentHeroSlideIdx = 0;
    
    slides.forEach((slide, idx) => {
        const slideEl = document.createElement('div');
        slideEl.className = `hero-slide-item ${idx === 0 ? 'active' : ''}`;
        slideEl.setAttribute('data-index', idx);
        
        slideEl.innerHTML = `
            <div class="hero-slide-bg">
                <img class="hero-slide-bg-img" src="${slide.poster}" alt="" referrerpolicy="no-referrer">
                <div class="hero-slide-bg-overlay"></div>
            </div>
            <div class="hero-slide-content">
                <span class="hero-slide-tagline"><i class="fa-solid fa-wand-magic-sparkles"></i> عرض مميز وحصري</span>
                <div class="hero-slide-title">${slide.title}</div>
                <button class="hero-slide-btn" id="hero-play-btn-${idx}">
                    <i class="fa-solid fa-play"></i> شاهد الآن
                </button>
            </div>
        `;
        
        // Bind Play Button
        const playBtn = slideEl.querySelector(`#hero-play-btn-${idx}`);
        if (playBtn) {
            playBtn.onclick = () => {
                window.location.href = `/show?url=${encodeURIComponent(slide.url)}&poster=${encodeURIComponent(slide.poster || '')}&title=${encodeURIComponent(slide.title || '')}&rating=${encodeURIComponent(slide.rating || '')}&quality=${encodeURIComponent(slide.quality || '')}`;
            };
        }
        
        elements.heroSliderWrapper.appendChild(slideEl);
        
        // Create pagination dot
        const dot = document.createElement('span');
        dot.className = `hero-slider-dot ${idx === 0 ? 'active' : ''}`;
        dot.setAttribute('data-index', idx);
        dot.onclick = () => goToHeroSlide(idx, slides.length);
        
        elements.heroSliderDots.appendChild(dot);
    });
    
    // Bind Arrow controls
    elements.heroSliderPrev.onclick = () => {
        let prevIdx = currentHeroSlideIdx - 1;
        if (prevIdx < 0) prevIdx = slides.length - 1;
        goToHeroSlide(prevIdx, slides.length);
    };
    
    elements.heroSliderNext.onclick = () => {
        let nextIdx = currentHeroSlideIdx + 1;
        if (nextIdx >= slides.length) nextIdx = 0;
        goToHeroSlide(nextIdx, slides.length);
    };
    
    // Start Autoplay (every 5 seconds)
    heroSliderTimer = setInterval(() => {
        let nextIdx = currentHeroSlideIdx + 1;
        if (nextIdx >= slides.length) nextIdx = 0;
        goToHeroSlide(nextIdx, slides.length);
    }, 5000);
}

function goToHeroSlide(idx, total) {
    if (idx === currentHeroSlideIdx) return;
    
    const slideItems = elements.heroSliderWrapper.querySelectorAll('.hero-slide-item');
    const dots = elements.heroSliderDots.querySelectorAll('.hero-slider-dot');
    
    if (slideItems[currentHeroSlideIdx]) slideItems[currentHeroSlideIdx].classList.remove('active');
    if (dots[currentHeroSlideIdx]) dots[currentHeroSlideIdx].classList.remove('active');
    
    currentHeroSlideIdx = idx;
    
    if (slideItems[currentHeroSlideIdx]) slideItems[currentHeroSlideIdx].classList.add('active');
    if (dots[currentHeroSlideIdx]) dots[currentHeroSlideIdx].classList.add('active');
}

function getTypeIconClass(type) {
    const t = (type || '').toLowerCase().trim();
    if (t === 'فيلم' || t === 'movie') {
        return 'fa-solid fa-film';
    } else if (t === 'مسلسل' || t === 'tv' || t === 'series') {
        return 'fa-solid fa-tv';
    } else if (t === 'أنمي' || t === 'انمي' || t === 'anime') {
        return 'fa-solid fa-dragon';
    } else {
        return 'fa-solid fa-clapperboard';
    }
}

function renderCarousels(categories) {
    elements.cardsGrid.innerHTML = '';
    elements.cardsGrid.style.display = 'block'; // Convert grid to block layout for categorized rows
    
    categories.forEach((cat, idx) => {
        const row = document.createElement('div');
        row.className = 'category-row';
        
        const categoryId = `slider-track-${idx}`;
        let cardsHTML = '';
        
        cat.cards.forEach((item, cardIdx) => {
            const posterUrl = item.poster || SVG_POSTER_PLACEHOLDER;
            const rating = item.rating || '7.8';
            
            cardsHTML += `
                <div class="movie-card" onclick="window.openDetailsModalByData(${idx}, ${cardIdx})">
                    <div class="card-poster">
                        <img src="${posterUrl}" alt="${item.title}" class="card-poster-img" onerror="this.src='${SVG_POSTER_PLACEHOLDER}'" referrerpolicy="no-referrer">
                        <div class="poster-overlay">
                            <div class="play-hover-btn"><i class="fa-solid fa-play"></i></div>
                        </div>
                        <div class="imdb-rating-badge">
                            <i class="fa-brands fa-imdb imdb-icon"></i>
                            <span class="imdb-score">${rating}</span>
                        </div>
                        <span class="card-quality-badge">${item.quality || '1080p'}</span>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${item.title}</h3>
                        <div class="card-footer">
                            <span class="card-type"><i class="${getTypeIconClass(item.type)}"></i> ${item.type || 'فيلم'}</span>
                            <span class="card-action-hint">بث آمن</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        row.innerHTML = `
            <div class="category-header">
                <h3><i class="fa-solid fa-compact-disc animate-spin-slow" style="color: var(--accent-violet);"></i> ${cat.category}</h3>
            </div>
            <div class="category-slider-container">
                <button class="slider-arrow arrow-left" onclick="window.scrollSlider('${categoryId}', -350)"><i class="fa-solid fa-chevron-left"></i></button>
                <div class="category-slider-track" id="${categoryId}">
                    ${cardsHTML}
                </div>
                <button class="slider-arrow arrow-right" onclick="window.scrollSlider('${categoryId}', 350)"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
        `;
        
        elements.cardsGrid.appendChild(row);
    });
}

function renderCards(results) {
    elements.cardsGrid.innerHTML = '';
    elements.cardsGrid.style.display = 'grid'; // Reset to standard flexbox/grid layout
    
    results.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.setAttribute('data-id', idx);
        
        card.onclick = () => {
            window.location.href = `/show?url=${encodeURIComponent(item.url)}&poster=${encodeURIComponent(item.poster || '')}&title=${encodeURIComponent(item.title || '')}&rating=${encodeURIComponent(item.rating || '')}&quality=${encodeURIComponent(item.quality || '')}`;
        };
        
        const posterUrl = item.poster || SVG_POSTER_PLACEHOLDER;
        const rating = item.rating || '7.8';
        
        card.innerHTML = `
            <div class="card-poster">
                <img src="${posterUrl}" alt="${item.title}" class="card-poster-img" onerror="this.src='${SVG_POSTER_PLACEHOLDER}'" referrerpolicy="no-referrer">
                <div class="poster-overlay">
                    <div class="play-hover-btn"><i class="fa-solid fa-play"></i></div>
                </div>
                <div class="imdb-rating-badge">
                    <i class="fa-brands fa-imdb imdb-icon"></i>
                    <span class="imdb-score">${rating}</span>
                </div>
                <span class="card-quality-badge">${item.quality || '1080p'}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-footer">
                    <span class="card-type"><i class="${getTypeIconClass(item.type)}"></i> ${item.type || 'عرض'}</span>
                    <span class="card-action-hint">بث آمن</span>
                </div>
            </div>
        `;
        
        elements.cardsGrid.appendChild(card);
    });
}

function renderEmptyState(message) {
    elements.cardsGrid.innerHTML = '';
    elements.resultsHeader.style.display = 'none';
    elements.emptyState.querySelector('h3').innerText = "لا توجد نتائج";
    elements.emptyState.querySelector('p').innerText = message;
    elements.emptyState.style.display = 'block';
}

function resetHomeUI() {
    elements.searchInput.value = '';
    performSearch('__home__', 'الرئيسية');
}

// ============================================================================
// Details Modal Overlay Handlers
// ============================================================================

async function openDetailsModal(item) {
    state.selectedItem = item;
    
    // Set poster blur backdrop
    const backdropBlur = document.getElementById('modal-backdrop-blur');
    if (backdropBlur && item.poster) {
        backdropBlur.style.backgroundImage = `url('${item.poster}')`;
    } else if (backdropBlur) {
        backdropBlur.style.backgroundImage = 'none';
    }
    
    // Set static UI values
    elements.modalTitleText.innerText = item.title;
    elements.modalPoster.src = item.poster || SVG_POSTER_PLACEHOLDER;
    elements.modalRating.innerHTML = `<i class="fa-brands fa-imdb" style="color: #f5c518; font-size: 1.8rem; margin-left: 6px; vertical-align: middle;"></i> <span style="font-size: 1.1rem; font-weight: 800; vertical-align: middle;">${item.rating || '7.8'}</span>`;
    elements.modalQuality.innerText = item.quality || '1080p FHD';
    elements.modalType.innerText = item.type || 'عرض سينمائي';
    
    // Loading State
    if (elements.modalStoryText) elements.modalStoryText.innerText = "جاري تحميل تفاصيل القصة وجدول الحلقات من مكتبة AleX CINEMA...";
    if (elements.modalSeasonsSection) elements.modalSeasonsSection.style.display = 'none';
    if (elements.modalSeasonsGrid) elements.modalSeasonsGrid.innerHTML = '';
    if (elements.modalEpisodesSection) elements.modalEpisodesSection.style.display = 'none';
    if (elements.modalQuickPlayBtn) elements.modalQuickPlayBtn.style.display = 'none';
    state.bestServer = null;
    if (elements.modalServersList) elements.modalServersList.innerHTML = '';
    if (elements.serversLoader) elements.serversLoader.style.display = 'block';
    
    // Display Modal Panel
    const loader = document.getElementById('show-page-loader');
    if (loader) loader.style.display = 'none';
    if (elements.detailsModal) elements.detailsModal.style.display = 'flex';
    document.body.style.overflow = 'auto'; // Re-enable scroll for the MPA page
    
    loadSeasonData(item.url, "");
}

async function loadSeasonData(url, seasonTitle) {
    if (typeof closePlayerModal === 'function') closePlayerModal(); // Stop any active player and restore poster view
    if (elements.modalEpisodesSection) elements.modalEpisodesSection.style.display = 'none';
    if (elements.modalSeasonsSection) elements.modalSeasonsSection.style.display = 'none';
    if (elements.modalQuickPlayBtn) elements.modalQuickPlayBtn.style.display = 'none';
    if (elements.modalSeasonsGrid) elements.modalSeasonsGrid.innerHTML = '';
    if (elements.modalEpisodesGrid) elements.modalEpisodesGrid.innerHTML = '';
    if (elements.modalServersList) elements.modalServersList.innerHTML = '';
    if (elements.serversLoader) elements.serversLoader.style.display = 'block';
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout failsafe to allow scraping multiple seasons
        
        const response = await fetch(`/api/details?url=${encodeURIComponent(url)}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const details = await response.json();
        
        elements.modalStoryText.innerText = details.description || "لا توجد قصة متوفرة لهذا العرض حالياً.";
        
        if (details.is_series && details.seasons && details.seasons.length > 0) {
            if (elements.modalType) elements.modalType.innerText = "مسلسل";
            state.seasons = details.seasons;
            
            // Smart title: update modal title to clean series base name (no episode/season noise)
            if (details.title) {
                const cleanTitle = state.selectedItem.title || details.title;
                elements.modalTitleText.innerText = cleanTitle;
            }
            
            // Render the grouped seasons (removes all duplicates!)
            renderGroupedSeasons(details.seasons);
            if (elements.modalSeasonsSection) elements.modalSeasonsSection.style.display = 'block';
            if (elements.serversLoader) elements.serversLoader.style.display = 'none'; // Hide loading spinner since series seasons are rendered!
            
        } else {
            if (elements.modalType) elements.modalType.innerText = "فيلم";
            // For movies
            fetchStreamingServers(url, state.selectedItem.title, state.selectedItem.title, false, "", "");
        }
    } catch (e) {
        if (elements.modalStoryText) elements.modalStoryText.innerText = `فشل تحميل تفاصيل العرض: ${e.message}`;
        if (elements.serversLoader) elements.serversLoader.style.display = 'none';
    }
}

function renderGroupedSeasons(seasons) {
    elements.modalSeasonsGrid.innerHTML = '';
    
    if (seasons.length === 0) return;
    
    // Sort seasons logically
    const sortedSeasons = seasons.sort((a, b) => {
        const numA = parseSeasonNumOnly(a.title);
        const numB = parseSeasonNumOnly(b.title);
        return numA - numB;
    });

    function parseSeasonNumOnly(title) {
        let match = title.match(/\d+/);
        return match ? parseInt(match[0]) : 1;
    }
    
    // Render Season Buttons
    sortedSeasons.forEach((season) => {
        const btn = document.createElement('button');
        btn.className = 'season-btn';
        btn.innerText = season.title;
        btn.setAttribute('data-season-title', season.title);
        
        btn.onclick = async () => {
            elements.modalSeasonsGrid.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Check if episodes are already fetched
            if (!season.episodes || season.episodes.length === 0) {
                elements.modalEpisodesGrid.innerHTML = `
                    <div class="loader-container" style="display: flex; flex-direction: column; align-items: center; grid-column: 1 / -1; padding: 20px;">
                        <div class="cyber-spinner" style="width: 30px; height: 30px; border-width: 3px;"></div>
                        <p class="loading-text" style="font-size: 0.9rem; margin-top: 10px;">جاري جلب حلقات ${season.title}...</p>
                    </div>
                `;
                elements.modalEpisodesSection.style.display = 'block';
                
                try {
                    const response = await fetch(`/api/details?url=${encodeURIComponent(season.url)}`);
                    const data = await response.json();
                    
                    // Find the matched season from the response to extract its episodes
                    let fetchedEpisodes = [];
                    if (data.seasons && data.seasons.length > 0) {
                        const matchedSeason = data.seasons.find(s => s.active) || data.seasons.find(s => s.title === season.title);
                        if (matchedSeason && matchedSeason.episodes) {
                            fetchedEpisodes = matchedSeason.episodes;
                        }
                    }
                    
                    if (fetchedEpisodes.length > 0) {
                        season.episodes = fetchedEpisodes;
                    } else {
                        elements.modalEpisodesGrid.innerHTML = `
                            <div style="grid-column: 1 / -1; text-align: center; color: #a1a1aa; padding: 20px;">
                                <i class="fa-solid fa-ghost" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                                <p>لا توجد حلقات متوفرة حالياً في هذا الموسم.</p>
                            </div>
                        `;
                        return; // Exit early since there are no episodes to render
                    }
                } catch (e) {
                    elements.modalEpisodesGrid.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 20px;">
                            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 10px;"></i>
                            <p>حدث خطأ أثناء جلب الحلقات.</p>
                        </div>
                    `;
                    return; // Exit early on error
                }
            }
            
            // Render episodes for this season directly!
            state.currentEpisodes = season.episodes;
            renderEpisodes(season.episodes, season.title);
            elements.modalEpisodesSection.style.display = 'block';
            
            // Autoplay first episode of this season
            const firstEp = season.episodes[0];
            if (firstEp) {
                highlightActiveEpisode(firstEp.url);
                const displayTitle = `${state.selectedItem.title} - ${season.title} - ${firstEp.title}`;
                fetchStreamingServers(
                    firstEp.url, 
                    displayTitle, 
                    state.selectedItem.title, 
                    true, 
                    season.title, 
                    firstEp.title
                );
            }
        };
        
        elements.modalSeasonsGrid.appendChild(btn);
    });
    
    // Set active season by default (the one that came from backend with active=true, or the first one with episodes)
    let defaultSeasonBtn = null;
    let fallbackSeasonBtn = null;
    
    // Find the right button by checking the sortedSeasons array
    const buttons = elements.modalSeasonsGrid.querySelectorAll('.season-btn');
    sortedSeasons.forEach((season, index) => {
        if (season.active && buttons[index]) {
            defaultSeasonBtn = buttons[index];
        }
        if (!fallbackSeasonBtn && season.episodes && season.episodes.length > 0 && buttons[index]) {
            fallbackSeasonBtn = buttons[index];
        }
    });
    
    const targetBtn = defaultSeasonBtn || fallbackSeasonBtn || elements.modalSeasonsGrid.querySelector('.season-btn');
    if (targetBtn) {
        targetBtn.click();
    }
}

function highlightActiveSeason(seasonTitle) {
    const buttons = elements.modalSeasonsGrid.querySelectorAll('.season-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-season-title') === seasonTitle || btn.innerText.trim() === seasonTitle.trim()) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function renderEpisodes(episodes, seasonTitle = "") {
    elements.modalEpisodesGrid.innerHTML = '';
    
    episodes.forEach((ep) => {
        const btn = document.createElement('button');
        btn.className = `episode-btn ${ep.active ? 'active' : ''}`;
        btn.innerText = ep.title;
        btn.title = ep.title;
        btn.setAttribute('data-url', ep.url);
        
        btn.onclick = () => {
            elements.modalEpisodesGrid.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const displayTitle = seasonTitle ? `${state.selectedItem.title} - ${seasonTitle} - ${ep.title}` : `${state.selectedItem.title} - ${ep.title}`;
            fetchStreamingServers(
                ep.url, 
                displayTitle, 
                state.selectedItem.title, 
                true, 
                seasonTitle, 
                ep.title,
                true
            );
        };
        
        elements.modalEpisodesGrid.appendChild(btn);
    });
}

function highlightActiveEpisode(activeUrl) {
    const buttons = elements.modalEpisodesGrid.querySelectorAll('.episode-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-url') === activeUrl) {
            btn.classList.add('active');
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            btn.classList.remove('active');
        }
    });
}

function normalizeArabicText(text) {
    if (!text) return "";
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .trim();
}

function getActiveSeasonTitle() {
    const activeSeasonBtn = elements.modalSeasonsGrid.querySelector('.season-btn.active');
    return activeSeasonBtn ? activeSeasonBtn.innerText.trim() : "";
}

function parseArabicWordToNumber(text) {
    const norm = normalizeArabicText(text);
    
    // Check for "last" episode keywords
    if (norm.includes("اخير") || norm.includes("أخير")) {
        return "last";
    }
    
    const wordMap = {
        "الاول": 1, "الأول": 1, "الاولى": 1, "الأولى": 1, "اول": 1, "اولى": 1,
        "الثاني": 2, "الثانية": 2, "الثانيه": 2, "ثاني": 2, "ثانيه": 2,
        "الثالث": 3, "الثالثة": 3, "الثالثه": 3, "ثالع": 3, "ثالثه": 3,
        "الرابع": 4, "الرابعة": 4, "الرابعه": 4, "رابع": 4, "رابعه": 4,
        "الخامس": 5, "الخامسة": 5, "الخامسه": 5, "خامس": 5, "خامسه": 5,
        "السادس": 6, "السادسة": 6, "السادسه": 6, "سادس": 6, "سادسه": 6,
        "السابع": 7, "السابعة": 7, "السابعه": 7, "سابع": 7, "سابعه": 7,
        "الثامن": 8, "الثامنة": 8, "الثامنه": 8, "ثامن": 8, "ثامنه": 8,
        "التاسع": 9, "التاسعة": 9, "التاسعه": 9, "تاسع": 9, "تاسعه": 9,
        "العاشر": 10, "العاشرة": 10, "العاشره": 10, "عاشر": 10, "عاشره": 10
    };
    
    const words = norm.split(' ');
    for (let word of words) {
        if (wordMap[word]) {
            return wordMap[word];
        }
    }
    return null;
}

function handleEpisodeFilter() {
    const filter = elements.episodeFilterInput.value.toLowerCase().trim();
    if (!filter) {
        renderEpisodes(state.currentEpisodes, getActiveSeasonTitle());
        return;
    }
    
    const normalizedFilter = normalizeArabicText(filter);
    
    // 1. Check if it is a pure numeric or numeric prefix search (e.g. "5", "ep 5", "الحلقة 5")
    let targetEpNum = null;
    const numMatch = filter.match(/^(?:#|ep|e|الحلقة|الحلقه|حلقة|حلقه)?\s*(\d+)$/i);
    if (numMatch) {
        targetEpNum = parseInt(numMatch[1]);
    } else {
        // 2. Check for Arabic word numbers (e.g. "الاولى", "الثانية")
        targetEpNum = parseArabicWordToNumber(filter);
    }
    
    const filtered = state.currentEpisodes.filter(ep => {
        const epTitle = ep.title;
        const titleMatch = epTitle.match(/\d+/);
        const epNum = titleMatch ? parseInt(titleMatch[0]) : null;
        
        // Match exact numeric equality or special markers (like "last")
        if (targetEpNum !== null) {
            if (targetEpNum === "last" && epNum !== null) {
                const maxEp = Math.max(...state.currentEpisodes.map(e => {
                    const m = e.title.match(/\d+/);
                    return m ? parseInt(m[0]) : 0;
                }));
                return epNum === maxEp;
            }
            if (epNum !== null) {
                return epNum === targetEpNum;
            }
        }
        
        // 3. Fallback to smart normalized Arabic text matching
        const normalizedTitle = normalizeArabicText(epTitle.toLowerCase());
        return normalizedTitle.includes(normalizedFilter);
    });
    
    elements.modalEpisodesGrid.innerHTML = '';
    const seasonTitle = getActiveSeasonTitle();
    
    if (filtered.length === 0) {
        elements.modalEpisodesGrid.innerHTML = `
            <div class="no-episodes-found" style="text-align: center; padding: 24px; color: var(--text-muted); font-family: var(--font-ar); font-size: 0.95rem;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.6rem; display: block; margin-bottom: 8px; color: var(--accent-violet);"></i>
                لا توجد حلقات تطابق تصفيتك
            </div>
        `;
        return;
    }
    
    filtered.forEach((ep) => {
        const btn = document.createElement('button');
        btn.className = `episode-btn ${ep.active ? 'active' : ''}`;
        btn.innerText = ep.title;
        btn.setAttribute('data-url', ep.url);
        
        btn.onclick = () => {
            elements.modalEpisodesGrid.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const displayTitle = seasonTitle ? `${state.selectedItem.title} - ${seasonTitle} - ${ep.title}` : `${state.selectedItem.title} - ${ep.title}`;
            fetchStreamingServers(
                ep.url, 
                displayTitle, 
                state.selectedItem.title, 
                true, 
                seasonTitle, 
                ep.title,
                true
            );
        };
        
        elements.modalEpisodesGrid.appendChild(btn);
    });
}

async function fetchStreamingServers(url, displayTitle, title = "", isSeries = false, season = "", episode = "", autoPlay = false) {
    // We are on the watch or show page, proceed to fetch the stream servers
    if (elements.playerServerBadge) elements.playerServerBadge.innerText = 'جاري المعالجة...';
    if (elements.serversLoader) elements.serversLoader.style.display = 'block';
    if (elements.modalQuickPlayBtn) elements.modalQuickPlayBtn.style.display = 'none';
    
    try {
        let apiUrl = `/api/watch?url=${encodeURIComponent(url)}`;
        if (title) {
            apiUrl += `&title=${encodeURIComponent(title)}&is_series=${isSeries}&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout failsafe
        
        const response = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (elements.serversLoader) elements.serversLoader.style.display = 'none';
        
        if (data.servers && data.servers.length > 0) {
            state.activeServerList = data.servers;
            renderServers(data.servers, displayTitle, url); // Pass url for redirect
            
            // Automatically select the BEST server (prefer direct, then fallback to first available)
            const bestServer = data.servers.find(s => s.type === 'direct') || data.servers[0];
            state.bestServer = bestServer;
            
            // Configure the prominent Quick Play button
            if (state.bestServer && state.bestServer.url !== 'about:blank') {
                if (elements.modalQuickPlayBtn) {
                    elements.modalQuickPlayBtn.style.display = 'flex';
                    elements.modalQuickPlayBtn.innerHTML = `<i class="fa-solid fa-play"></i> مشاهدة الآن (بأعلى جودة)`;
                    elements.modalQuickPlayBtn.onclick = () => {
                        const pageId = document.body.dataset.page;
                        if (pageId === 'show') {
                            window.location.href = `/watch?url=${encodeURIComponent(url)}&title=${encodeURIComponent(displayTitle)}`;
                        } else {
                            launchPlayer(state.bestServer, displayTitle);
                        }
                    };
                }
                
                // Widescreen auto-play update
                const isPlayerActive = elements.playerModal && elements.playerModal.style.display !== 'none';
                if (autoPlay || isPlayerActive) {
                    const pageId = document.body.dataset.page;
                    if (pageId === 'show') {
                        window.location.href = `/watch?url=${encodeURIComponent(url)}&title=${encodeURIComponent(displayTitle)}`;
                    } else {
                        launchPlayer(state.bestServer, displayTitle);
                    }
                }
            }
        } else {
            if (elements.modalQuickPlayBtn) {
                elements.modalQuickPlayBtn.style.display = 'flex';
                elements.modalQuickPlayBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> العرض غير متوفر حالياً`;
                elements.modalQuickPlayBtn.onclick = null;
            }
            // If we are on the watch page and it failed, update the custom loader to show an error
            const customLoaderStatus = document.getElementById('player-loader-status');
            if (customLoaderStatus) {
                customLoaderStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; margin-bottom: 10px; display: block; font-size: 2rem;"></i> فشل في جلب السيرفرات، يرجى المحاولة لاحقاً.`;
                const spinner = document.querySelector('.pulse-spinner');
                if (spinner) spinner.style.display = 'none';
            }
        }
    } catch (e) {
        if (elements.serversLoader) elements.serversLoader.style.display = 'none';
        if (elements.modalQuickPlayBtn) {
            elements.modalQuickPlayBtn.style.display = 'flex';
            elements.modalQuickPlayBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> فشل توليد روابط البث`;
            elements.modalQuickPlayBtn.onclick = null;
        }
        
        // If we are on the watch page and it failed, update the custom loader to show an error
        const customLoaderStatus = document.getElementById('player-loader-status');
        if (customLoaderStatus) {
            customLoaderStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; margin-bottom: 10px; display: block; font-size: 2rem;"></i> حدث خطأ أثناء جلب البث المباشر. يرجى العودة والمحاولة مرة أخرى.`;
            const spinner = document.querySelector('.pulse-spinner');
            if (spinner) spinner.style.display = 'none';
        }
        
        console.error("fetchStreamingServers Error:", e);
    }
}

function renderServers(servers, displayTitle, sourceUrl = "") {
    if (!elements.modalServersList) return;
    elements.modalServersList.innerHTML = '';
    
    servers.forEach((server) => {
        const btn = document.createElement('button');
        
        if (server.type === 'direct') {
            btn.className = 'server-item-btn direct-server';
            btn.innerHTML = `
                <span><i class="fa-solid fa-shield-heart"></i> ${server.server}</span>
                <span class="server-action-hint"><i class="fa-solid fa-play server-action-icon"></i> تشغيل فوري نظيف</span>
            `;
        } else {
            btn.className = 'server-item-btn';
            btn.innerHTML = `
                <span><i class="fa-solid fa-server"></i> ${server.server}</span>
                <span class="server-action-hint"><i class="fa-solid fa-play server-action-icon"></i> مشغل ويب معزول</span>
            `;
        }
        
        btn.onclick = () => {
            if (server.url !== 'about:blank') {
                elements.modalServersList.querySelectorAll('.server-item-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const pageId = document.body.dataset.page;
                if (pageId === 'show' && sourceUrl) {
                    window.location.href = `/watch?url=${encodeURIComponent(sourceUrl)}&title=${encodeURIComponent(displayTitle)}`;
                } else {
                    launchPlayer(server, displayTitle);
                }
            }
        };
        elements.modalServersList.appendChild(btn);
    });
}

function closeDetailsModal() {
    closePlayerModal(); // Cleanly stop and unload player
    elements.detailsModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Unlock scroll
}

// ============================================================================
// Immersive Cinema Player Modal Handlers
// ============================================================================

// LocalStorage key helper
function getProgressKey(url) {
    if (state.activePlayerTitle) {
        return `alex_cinema_progress_${encodeURIComponent(state.activePlayerTitle.trim())}`;
    }
    return `alex_cinema_progress_${url}`;
}

function loadPlayerSource(server, startTime = 0, autoplay = true) {
    state.currentPlayingServer = server;
    elements.playerServerBadge.innerText = server.server;
    
    // Display Custom Elegant Loading Overlay inside player
    const customLoader = document.getElementById('player-custom-loader');
    const loaderStatus = document.getElementById('player-loader-status');
    if (customLoader && loaderStatus) {
        customLoader.style.display = 'flex';
        loaderStatus.innerText = "جارِ تأمين اتصال البث المباشر الآمن...";
        
        // Dynamic transitioning status messages
        state.loaderIntervals = [];
        state.loaderIntervals.push(setTimeout(() => { loaderStatus.innerText = "جارِ فك تشفير مسارات البث السينمائي الفائق..."; }, 400));
        state.loaderIntervals.push(setTimeout(() => { loaderStatus.innerText = "جارِ تهيئة البث بأعلى جودة متوفرة..."; }, 800));
    }
    
    // Clean existing Hls instance if present
    if (state.hlsInstance) {
        state.hlsInstance.destroy();
        state.hlsInstance = null;
    }
    if (state.previewHlsInstance) {
        state.previewHlsInstance.destroy();
        state.previewHlsInstance = null;
    }
    
    const video = document.getElementById('video-player');
    if (!video) return;
    
    // Check if progress exists in localStorage to resume playing
    let progressTime = startTime;
    if (progressTime === 0) {
        const savedTime = localStorage.getItem(getProgressKey(server.url));
        if (savedTime) {
            progressTime = parseFloat(savedTime);
            console.log("Resuming progress from Saved Time:", progressTime);
        }
    }
    
    const hideLoaderSmoothly = () => {
        if (customLoader) {
            customLoader.style.transition = 'opacity 0.4s ease';
            customLoader.style.opacity = '0';
            setTimeout(() => {
                customLoader.style.display = 'none';
                customLoader.style.opacity = '1';
            }, 400);
        }
        // Clear status transition timers
        if (state.loaderIntervals) {
            state.loaderIntervals.forEach(t => clearTimeout(t));
        }
    };
    
    if (server.url.includes('.m3u8')) {
        // HLS Stream (.m3u8) using Hls.js
        if (Hls.isSupported()) {
            const hls = new Hls({
                maxBufferLength: 20,
                maxMaxBufferLength: 30,
                maxBufferSize: 31457280, // 30MB for rapid buffer fills
                backBufferLength: 60, // cache up to 1 minute of played content for instant backward seek/scrubbing!
                enableWorker: true,
                lowLatencyMode: true, // Enable low latency for fast seek response!
                progressive: true,
                capLevelToPlayerSize: true,
                startLevel: -1,
                abrBandWidthFactor: 0.85,
                abrBandWidthUpFactor: 0.7,
                xhrSetup: function(xhr, url) {
                    xhr.withCredentials = false;
                }
            });
            
            // Failsafe timeout for Hls.js initialization
            let hlsTimeout = setTimeout(() => {
                console.warn("Hls.js load timeout reached, forcing loader hide.");
                hideLoaderSmoothly();
            }, 10000);
            
            hls.loadSource(server.url);
            hls.attachMedia(video);
            state.hlsInstance = hls;
            
            // Preview Hls.js setup
            const previewVideo = document.getElementById('plyr-preview-video');
            if (previewVideo) {
                const previewHls = new Hls({
                    maxBufferLength: 5,
                    maxMaxBufferLength: 10,
                    maxBufferSize: 5242880, // 5MB for tiny preview chunks
                    backBufferLength: 0,
                    enableWorker: true,
                    lowLatencyMode: true,
                    progressive: true,
                    autoStartLoad: true
                });
                
                previewHls.loadSource(server.url);
                previewHls.attachMedia(previewVideo);
                state.previewHlsInstance = previewHls;
                
                // Force preview to strictly load the lowest quality level (index 0)
                previewHls.on(Hls.Events.MANIFEST_PARSED, function() {
                    previewHls.currentLevel = 0;
                    previewHls.loadLevel = 0;
                });
            }
            
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                if (hlsTimeout) {
                    clearTimeout(hlsTimeout);
                    hlsTimeout = null;
                }
                console.log("HLS Manifest parsed. Available levels:", hls.levels);
                
                // Parse quality height from current server name, e.g. "✨ سيرفر مباشر 1080p"
                const qMatch = server.server.match(/(\d+)/);
                const targetHeight = qMatch ? parseInt(qMatch[1]) : 1080;
                
                let targetLevelIdx = -1;
                let maxLevelIdx = 0;
                let maxHeight = 0;
                
                // Find matching level or highest level
                hls.levels.forEach((level, idx) => {
                    console.log(`Level ${idx}: ${level.width}x${level.height} | Bitrate: ${level.bitrate}`);
                    if (level.height > maxHeight) {
                        maxHeight = level.height;
                        maxLevelIdx = idx;
                    }
                    if (level.height === targetHeight) {
                        targetLevelIdx = idx;
                    }
                });
                
                // Force highest quality (or exact target if available)
                if (targetLevelIdx !== -1) {
                    console.log(`Forcing HLS quality level index: ${targetLevelIdx} (${targetHeight}p)`);
                    hls.currentLevel = targetLevelIdx;
                    hls.loadLevel = targetLevelIdx;
                    hls.startLevel = targetLevelIdx;
                } else {
                    console.log(`Specific quality level not found. Forcing highest level: ${maxLevelIdx} (${maxHeight}p)`);
                    hls.currentLevel = maxLevelIdx;
                    hls.loadLevel = maxLevelIdx;
                    hls.startLevel = maxLevelIdx;
                }

                if (progressTime > 0) {
                    video.currentTime = progressTime;
                }
                if (autoplay) {
                    state.activePlayer.play().catch(()=>{});
                }
                hideLoaderSmoothly();
            });
            
            // Seamless Hls.js error recovery
            hls.on(Hls.Events.ERROR, function(event, data) {
                if (data.fatal) {
                    if (hlsTimeout) {
                        clearTimeout(hlsTimeout);
                        hlsTimeout = null;
                    }
                    hideLoaderSmoothly(); // Ensure loader hides on fatal errors
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn("HLS Network Error, attempting reload...");
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn("HLS Media Error, attempting recovery...");
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error("HLS Unrecoverable Error, destroying pipeline.");
                            hls.destroy();
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // iOS / Safari Native HLS support
            let loadTimeout = null;
            
            const cleanListeners = () => {
                video.removeEventListener('loadedmetadata', onLoaded);
                video.removeEventListener('error', onError);
                if (loadTimeout) {
                    clearTimeout(loadTimeout);
                    loadTimeout = null;
                }
            };
            
            const onLoaded = () => {
                if (progressTime > 0) video.currentTime = progressTime;
                if (autoplay) state.activePlayer.play().catch(()=>{});
                hideLoaderSmoothly();
                cleanListeners();
            };
            
            const onError = (e) => {
                console.error("Native HLS load error:", e);
                hideLoaderSmoothly();
                showToast("فشل تحميل مشغل HLS الأصلي، يرجى تجربة سيرفر آخر.", "error");
                cleanListeners();
            };
            
            // Register event listeners BEFORE setting source to prevent race conditions!
            video.addEventListener('loadedmetadata', onLoaded);
            video.addEventListener('error', onError);
            
            // 10-second failsafe timeout
            loadTimeout = setTimeout(() => {
                console.warn("Native HLS load timeout reached, forcing loader hide.");
                hideLoaderSmoothly();
                if (autoplay) state.activePlayer.play().catch(()=>{});
                cleanListeners();
            }, 10000);
            
            const previewVideo = document.getElementById('plyr-preview-video');
            if (previewVideo) {
                previewVideo.src = server.url;
            }
            
            video.src = server.url;
            video.load(); // CRITICAL: Force native pipeline load
        }
    } else {
        // Direct MP4 Stream
        let loadTimeout = null;
        
        const cleanListeners = () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            video.removeEventListener('error', onError);
            if (loadTimeout) {
                clearTimeout(loadTimeout);
                loadTimeout = null;
            }
        };
        
        const onLoaded = () => {
            console.log("Direct MP4 metadata loaded successfully!");
            if (progressTime > 0) video.currentTime = progressTime;
            if (autoplay) state.activePlayer.play().catch(()=>{});
            hideLoaderSmoothly();
            cleanListeners();
        };
        
        const onError = (e) => {
            console.error("Direct MP4 load error occurred:", e);
            hideLoaderSmoothly();
            showToast("حدث خطأ أثناء الاتصال بسيرفر البث المباشر، يرجى تجربة سيرفر آخر.", "error");
            cleanListeners();
        };
        
        // Register event listeners BEFORE setting source to prevent race conditions!
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onError);
        
        // 10-second failsafe timeout
        loadTimeout = setTimeout(() => {
            console.warn("Direct MP4 load timeout reached, forcing loader hide.");
            hideLoaderSmoothly();
            if (autoplay) state.activePlayer.play().catch(()=>{});
            cleanListeners();
        }, 10000);
        
        const previewVideo = document.getElementById('plyr-preview-video');
        if (previewVideo) {
            previewVideo.src = server.url;
        }
        
        video.src = server.url;
        video.load(); // CRITICAL: Force native pipeline load to refresh play status
    }
}

function showCenterIndicator(iconClass, persistent = false, textValue = "") {
    const indicator = document.getElementById('player-center-indicator');
    if (!indicator) return;
    
    // Set the icon and dynamic text
    let content = `<i class="${iconClass}"></i>`;
    if (textValue) {
        content += `<div style="font-size: 0.95rem; font-weight: bold; margin-top: 8px; color: var(--accent-violet); filter: drop-shadow(0 0 5px var(--accent-violet));">${textValue}</div>`;
    }
    indicator.innerHTML = content;
    
    // Clear any pending hide timer
    if (state.indicatorTimeout) {
        clearTimeout(state.indicatorTimeout);
        state.indicatorTimeout = null;
    }
    
    // Reset animation classes
    indicator.classList.remove('trigger-anim');
    indicator.style.display = 'flex';
    
    if (persistent) {
        // Persistent mode: stays visible (used for paused state play icon)
        indicator.classList.remove('trigger-anim');
        indicator.style.opacity = '1';
        return;
    }
    
    // Brief flash mode: animate and auto-hide
    void indicator.offsetWidth;
    indicator.classList.add('trigger-anim');
    
    state.indicatorTimeout = setTimeout(() => {
        indicator.style.display = 'none';
        indicator.classList.remove('trigger-anim');
    }, 500);
}



function handleKeyboardShortcuts(e) {
    if (!state.activePlayer) return;
    
    // Prevent shortcut firing if user is writing in input or search fields
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
    }
    
    const code = e.code;
    const handledCodes = [
        'Space', 'KeyK',
        'ArrowLeft', 'KeyJ',
        'ArrowRight', 'KeyL',
        'ArrowUp', 'ArrowDown',
        'KeyF', 'KeyM',
        'Period', 'Comma',
        'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
        'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'
    ];
    
    if (handledCodes.includes(code)) {
        e.preventDefault();
        e.stopPropagation();
    } else {
        return;
    }
    
    switch (code) {
        case 'Space':
        case 'KeyK': // Toggle Play/Pause
            if (state.activePlayer.paused) {
                state.activePlayer.play().catch(()=>{});
            } else {
                state.activePlayer.pause();
            }
            break;
            
        case 'ArrowRight':
        case 'KeyL': // Seek Forward 10s
            state.activePlayer.currentTime = Math.min(state.activePlayer.duration || 0, state.activePlayer.currentTime + 10);
            showCenterIndicator('fa-solid fa-forward');
            break;
            
        case 'ArrowLeft':
        case 'KeyJ': // Seek Backward 10s
            state.activePlayer.currentTime = Math.max(0, state.activePlayer.currentTime - 10);
            showCenterIndicator('fa-solid fa-backward');
            break;
            
        case 'ArrowUp': // Volume Up 10%
            state.activePlayer.volume = Math.min(1, state.activePlayer.volume + 0.1);
            showCenterIndicator('fa-solid fa-volume-high');
            break;
            
        case 'ArrowDown': // Volume Down 10%
            state.activePlayer.volume = Math.max(0, state.activePlayer.volume - 0.1);
            showCenterIndicator(state.activePlayer.volume === 0 ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-low');
            break;
            
        case 'KeyF': // Fullscreen Toggle
            state.activePlayer.fullscreen.toggle();
            break;
            
        case 'KeyM': // Mute Toggle
            state.activePlayer.muted = !state.activePlayer.muted;
            showCenterIndicator(state.activePlayer.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high');
            break;
            
        case 'Period': // Increase playback speed (Shift + >)
            if (e.shiftKey) {
                const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                let currentSpeed = state.activePlayer.speed;
                let nextIdx = speeds.indexOf(currentSpeed) + 1;
                if (nextIdx < speeds.length) {
                    state.activePlayer.speed = speeds[nextIdx];
                    showCenterIndicator('fa-solid fa-gauge-high');
                }
            }
            break;
            
        case 'Comma': // Decrease playback speed (Shift + <)
            if (e.shiftKey) {
                const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                let currentSpeed = state.activePlayer.speed;
                let prevIdx = speeds.indexOf(currentSpeed) - 1;
                if (prevIdx >= 0) {
                    state.activePlayer.speed = speeds[prevIdx];
                    showCenterIndicator('fa-solid fa-gauge-simple');
                }
            }
            break;
            
        default:
            // Handle numeric keys Digit0-Digit9 to seek directly to that percentage of the video
            if (code.startsWith('Digit')) {
                const digit = parseInt(code.replace('Digit', ''));
                if (state.activePlayer.duration) {
                    state.activePlayer.currentTime = state.activePlayer.duration * (digit / 10);
                    showCenterIndicator('fa-solid fa-arrow-right-to-bracket');
                }
            }
            break;
    }
}

function setupAutoplayNext(currentUrl) {
    const nextEpisodeCard = document.getElementById('player-next-episode-card');
    const nextEpisodeTitle = document.getElementById('player-next-episode-title');
    const nextEpisodeSkipBtn = document.getElementById('player-next-skip-btn');
    const progressRing = document.getElementById('countdown-progress-ring');
    const countdownText = document.getElementById('player-next-countdown-text');
    
    if (!nextEpisodeCard || !nextEpisodeTitle || !nextEpisodeSkipBtn || !progressRing || !countdownText) return;
    
    // Hide card initially
    nextEpisodeCard.style.display = 'none';
    
    if (state.selectedItem && state.selectedItem.type === 'مسلسل' && state.currentEpisodes && state.currentEpisodes.length > 0) {
        // Find index of current episode
        const currentIdx = state.currentEpisodes.findIndex(ep => ep.url === currentUrl);
        if (currentIdx !== -1 && currentIdx + 1 < state.currentEpisodes.length) {
            const nextEp = state.currentEpisodes[currentIdx + 1];
            
            // Set title
            nextEpisodeTitle.innerText = nextEp.title;
            
            // Listen to ended event on player
            const onEpisodeEnded = () => {
                // Show countdown card overlay inside player
                nextEpisodeCard.style.display = 'flex';
                
                let secondsLeft = 5;
                countdownText.innerText = secondsLeft;
                
                // Animate progress ring
                progressRing.style.strokeDasharray = "100, 100";
                
                const triggerNextEpisode = () => {
                    clearInterval(state.countdownTimer);
                    nextEpisodeCard.style.display = 'none';
                    
                    // Highlight the next episode button in details grid silently
                    highlightActiveEpisode(nextEp.url);
                    
                    // Build next display title
                    const activeSeasonBtn = elements.modalSeasonsGrid.querySelector('.season-btn.active');
                    const seasonTitle = activeSeasonBtn ? activeSeasonBtn.innerText.trim() : "";
                    const nextDisplayTitle = seasonTitle ? `${state.selectedItem.title} - ${seasonTitle} - ${nextEp.title}` : `${state.selectedItem.title} - ${nextEp.title}`;
                    
                    // Trigger resolved list update silently, then play!
                    fetchStreamingServers(
                        nextEp.url, 
                        nextDisplayTitle, 
                        state.selectedItem.title, 
                        true, 
                        seasonTitle, 
                        nextEp.title
                    ).then(() => {
                        // Launch the new stream
                        if (state.bestServer) {
                            launchPlayer(state.bestServer, nextDisplayTitle);
                        }
                    });
                };
                
                nextEpisodeSkipBtn.onclick = () => {
                    triggerNextEpisode();
                };
                
                state.countdownTimer = setInterval(() => {
                    secondsLeft -= 1;
                    countdownText.innerText = Math.max(0, secondsLeft);
                    
                    // Calculate stroke ring dash offset
                    const percentage = (secondsLeft / 5) * 100;
                    progressRing.style.strokeDasharray = `${percentage}, 100`;
                    
                    if (secondsLeft <= 0) {
                        triggerNextEpisode();
                    }
                }, 1000);
            };
            
            state.activePlayer.on('ended', onEpisodeEnded);
        }
    }
}

function launchPlayer(server, title) {
    try {
        // Hide details close button IMMEDIATELY to prevent multiple overlapping close buttons
        if (elements.closeDetailsBtn) {
        elements.closeDetailsBtn.style.display = 'none';
    }
    
    // Check if the stream option is unavailable (about:blank)
    if (!server || server.url === 'about:blank' || !server.url) {
        state.currentPlayingServer = server;
        elements.playerServerBadge.innerText = '⚠️ غير متوفر للبث';
        elements.playerModal.style.display = 'block';
        
        // Hide poster wrapper, show player wrapper inline
        const posterWrapper = document.getElementById('modal-poster-wrapper');
        if (posterWrapper) posterWrapper.style.display = 'none';
        
        // Render a beautiful neon warning inside elements.playerRenderArea
        elements.playerRenderArea.innerHTML = `
            <div class="player-error-fallback" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: #0b0c10; border-radius: 12px; padding: 30px; text-align: center; border: 1px solid rgba(225, 29, 72, 0.3); box-shadow: 0 0 30px rgba(225, 29, 72, 0.15);">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3.5rem; color: #rose; margin-bottom: 20px; text-shadow: 0 0 20px rgba(225, 29, 72, 0.6); animation: pulse 2s infinite;"></i>
                <h3 style="font-family: var(--font-ar); font-size: 1.4rem; color: #fff; margin-bottom: 12px; font-weight: 700;">عذراً، مسار البث المباشر غير متوفر حالياً</h3>
                <p style="font-family: var(--font-ar); font-size: 0.95rem; color: var(--text-muted); max-width: 480px; margin-bottom: 24px; line-height: 1.6;">فشلت محاولة توليد رابط مباشر آمن من الخادم الخارجي، أو قد يكون المصدر قد تم حذفه بسبب حقوق الملكية. يرجى تجربة خيارات تشغيل أخرى أو إعادة المحاولة لاحقاً.</p>
                <button class="error-retry-btn" onclick="closePlayerModal()" style="font-family: var(--font-ar); font-weight: 700; font-size: 0.9rem; padding: 10px 24px; border-radius: 12px; background: rgba(124, 58, 237, 0.15); border: 1px solid var(--accent-violet); color: var(--accent-violet); cursor: pointer; transition: all 0.3s ease; box-shadow: 0 0 15px rgba(124, 58, 237, 0.25);">
                    <i class="fa-solid fa-arrow-rotate-left" style="margin-left: 8px;"></i> العودة لتفاصيل العرض
                </button>
            </div>
        `;
        
        // Hide loader smoothly
        const customLoader = document.getElementById('player-custom-loader');
        if (customLoader) {
            customLoader.style.transition = 'opacity 0.2s ease';
            customLoader.style.opacity = '0';
            setTimeout(() => {
                customLoader.style.display = 'none';
                customLoader.style.opacity = '1';
            }, 200);
        }
        return;
    }

    elements.playerTitleDisplay.innerText = title;
    state.activePlayerTitle = title; // Used for consistent progress tracking
    elements.playerRenderArea.innerHTML = '';
    
    // Hide overlays initially
    const nextEpisodeCard = document.getElementById('player-next-episode-card');
    if (nextEpisodeCard) nextEpisodeCard.style.display = 'none';
    const centerIndicator = document.getElementById('player-center-indicator');
    if (centerIndicator) centerIndicator.style.display = 'none';
    
    // Hide poster wrapper, show player wrapper inline
    const posterWrapper = document.getElementById('modal-poster-wrapper');
    if (posterWrapper) posterWrapper.style.display = 'none';
    
    elements.playerModal.style.display = 'block';
    
    // Clean existing Hls instance if present
    if (state.hlsInstance) {
        state.hlsInstance.destroy();
        state.hlsInstance = null;
    }
    
    if (state.previewHlsInstance) {
        state.previewHlsInstance.destroy();
        state.previewHlsInstance = null;
    }
    
    if (server.type === 'embed') {
        state.currentPlayingServer = server;
        elements.playerServerBadge.innerText = server.server;
        
        const iframe = document.createElement('iframe');
        iframe.src = server.url;
        iframe.className = 'plyr-embed-iframe';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; encrypted-media');
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-forms');
        
        elements.playerRenderArea.appendChild(iframe);
        
        // Hide loader smoothly
        const customLoader = document.getElementById('player-custom-loader');
        if (customLoader) {
            customLoader.style.transition = 'opacity 0.4s ease';
            customLoader.style.opacity = '0';
            setTimeout(() => {
                customLoader.style.display = 'none';
                customLoader.style.opacity = '1';
            }, 400);
        }
        return;
    }
    
    const video = document.createElement('video');
    video.id = 'video-player';
    video.className = 'plyr-video-player';
    video.setAttribute('playsinline', '');
    video.setAttribute('controls', '');
    video.setAttribute('preload', 'auto');
    if (state.selectedItem && state.selectedItem.poster) {
        video.setAttribute('poster', state.selectedItem.poster);
    }
    
    elements.playerRenderArea.appendChild(video);
    
    // Create and append custom YouTube-like preview tooltip container
    const previewTooltip = document.createElement('div');
    previewTooltip.id = 'plyr-preview-tooltip';
    previewTooltip.className = 'plyr-preview-tooltip';
    previewTooltip.style.display = 'none';
    previewTooltip.innerHTML = `
        <div class="plyr-preview-card">
            <video id="plyr-preview-video" muted playsinline style="width: 160px; height: 90px; object-fit: cover; border-radius: 8px; background: #000;"></video>
            <div class="plyr-preview-time" id="plyr-preview-time">00:00</div>
        </div>
    `;
    elements.playerRenderArea.appendChild(previewTooltip);
    
    // Extract available quality resolutions
    const qualityOptions = [];
    state.activeServerList.forEach(srv => {
        const qMatch = srv.server.match(/(\d+)/);
        if (qMatch) {
            qualityOptions.push(parseInt(qMatch[1]));
        }
    });
    const uniqueQualityOptions = [...new Set(qualityOptions)].sort((a, b) => b - a);
    
    const initialQMatch = server.server.match(/(\d+)/);
    const defaultQuality = initialQMatch ? parseInt(initialQMatch[1]) : (uniqueQualityOptions[0] || 1080);
    
    // Initialize Plyr with native settings menu quality options
    state.activePlayer = new Plyr(video, {
        controls: [
            'play-large', 'play', 'progress', 'current-time', 'duration',
            'mute', 'volume', 'settings', 'pip', 'fullscreen'
        ],
        settings: ['quality', 'speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        quality: {
            default: defaultQuality,
            options: uniqueQualityOptions,
            forced: true,
            onChange: (newQuality) => {
                const currentQMatch = state.currentPlayingServer ? state.currentPlayingServer.server.match(/(\d+)/) : null;
                const currentQuality = currentQMatch ? parseInt(currentQMatch[1]) : null;
                
                if (currentQuality === newQuality) return;
                
                const targetServer = state.activeServerList.find(srv => {
                    const qMatch = srv.server.match(/(\d+)/);
                    const size = qMatch ? parseInt(qMatch[1]) : 1080;
                    return size === newQuality;
                });
                
                if (targetServer) {
                    const currentTime = state.activePlayer ? state.activePlayer.currentTime : 0;
                    const isPlaying = state.activePlayer ? !state.activePlayer.paused : true;
                    
                    // Seamless HLS Quality Switch if URL is identical!
                    if (state.hlsInstance && state.currentPlayingServer && targetServer.url === state.currentPlayingServer.url) {
                        console.log("URL is identical. Switching HLS currentLevel seamlessly to:", newQuality);
                        let targetLevelIdx = -1;
                        
                        // Find corresponding level index in HLS manifest
                        state.hlsInstance.levels.forEach((level, idx) => {
                            if (level.height === newQuality) {
                                targetLevelIdx = idx;
                            }
                        });
                        
                        if (targetLevelIdx !== -1) {
                            state.hlsInstance.currentLevel = targetLevelIdx;
                            state.hlsInstance.loadLevel = targetLevelIdx;
                            state.currentPlayingServer = targetServer;
                            
                            // Show indicator for seamless switch
                            showCenterIndicator('fa-solid fa-bolt', false, `${newQuality}p`);
                            return; // Exit early, no need to reload source!
                        } else {
                            console.warn("Quality level not found in HLS manifest, falling back to full reload.");
                        }
                    }
                    
                    console.log("Player quality switched in gear settings menu to:", newQuality);
                    loadPlayerSource(targetServer, currentTime, isPlaying);
                }
            }
        },
        tooltips: { controls: false, seek: true }
    });
    
    // Fast Scrubbing: instant frame-by-frame seeking during timeline drag
    state.activePlayer.on('ready', () => {
        // Strip native title attributes to prevent OS-level tooltips from showing on mobile
        document.querySelectorAll('.plyr__control').forEach(btn => {
            if (btn.hasAttribute('title')) btn.removeAttribute('title');
            if (btn.hasAttribute('data-plyr-tooltip')) btn.removeAttribute('data-plyr-tooltip');
        });
        
        const seekInput = elements.playerRenderArea.querySelector('.plyr__progress input[data-plyr="seek"], .plyr__progress input[type="range"]');
        if (seekInput) {
            let lastSeekTime = 0;
            let seekTimeout = null;
            
            const isTimeBuffered = (time) => {
                try {
                    const buffered = video.buffered;
                    for (let i = 0; i < buffered.length; i++) {
                        if (time >= buffered.start(i) && time <= buffered.end(i)) {
                            return true;
                        }
                    }
                } catch (e) {}
                return false;
            };

            const performSeek = (targetTime) => {
                if (isFinite(targetTime) && video.duration) {
                    video.currentTime = targetTime;
                }
            };

            seekInput.addEventListener('input', () => {
                const targetTime = (seekInput.value / 100) * video.duration;
                if (!isFinite(targetTime) || !video.duration) return;
                
                const now = Date.now();
                const buffered = isTimeBuffered(targetTime);
                const throttleInterval = buffered ? 33 : 150; // 30fps for buffered, 150ms for network

                if (now - lastSeekTime > throttleInterval) {
                    lastSeekTime = now;
                    performSeek(targetTime);
                } else {
                    if (seekTimeout) clearTimeout(seekTimeout);
                    seekTimeout = setTimeout(() => {
                        performSeek(targetTime);
                    }, throttleInterval);
                }
            });

            seekInput.addEventListener('change', () => {
                if (seekTimeout) clearTimeout(seekTimeout);
                const targetTime = (seekInput.value / 100) * video.duration;
                performSeek(targetTime);
            });

            // YouTube-like Hover Preview Tooltip Logic
            const progressContainer = elements.playerRenderArea.querySelector('.plyr__progress');
            const previewTooltip = document.getElementById('plyr-preview-tooltip');
            const previewVideo = document.getElementById('plyr-preview-video');
            const previewTime = document.getElementById('plyr-preview-time');
            
            if (progressContainer && previewTooltip && previewVideo) {
                let isHovering = false;
                let hoverSeekTimeout = null;

                const formatTime = (secs) => {
                    if (isNaN(secs)) return '00:00';
                    const h = Math.floor(secs / 3600);
                    const m = Math.floor((secs % 3600) / 60);
                    const s = Math.floor(secs % 60);
                    const mStr = m.toString().padStart(2, '0');
                    const sStr = s.toString().padStart(2, '0');
                    if (h > 0) {
                        return `${h}:${mStr}:${sStr}`;
                    }
                    return `${mStr}:${sStr}`;
                };

                progressContainer.addEventListener('mouseenter', () => {
                    isHovering = true;
                    previewTooltip.classList.add('show');
                    previewTooltip.style.display = 'block';
                });

                progressContainer.addEventListener('mousemove', (e) => {
                    if (!isHovering) return;
                    
                    const rect = progressContainer.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const percent = Math.min(Math.max(mouseX / rect.width, 0), 1);
                    const duration = video.duration || 0;
                    const targetTime = percent * duration;

                    // Position the tooltip centered over the mouse X position
                    const parentRect = elements.playerRenderArea.getBoundingClientRect();
                    const relativeX = e.clientX - parentRect.left;
                    
                    const tooltipWidth = 168; // approx width of tooltip including padding/border
                    const halfWidth = tooltipWidth / 2;
                    const clampedX = Math.min(Math.max(relativeX, halfWidth), parentRect.width - halfWidth);
                    
                    previewTooltip.style.left = `${clampedX}px`;

                    // Update timestamp text
                    previewTime.innerText = formatTime(targetTime);

                    // Seek preview video (throttled to 80ms)
                    if (hoverSeekTimeout) clearTimeout(hoverSeekTimeout);
                    hoverSeekTimeout = setTimeout(() => {
                        if (isFinite(targetTime)) {
                            previewVideo.currentTime = targetTime;
                        }
                    }, 80);
                });

                progressContainer.addEventListener('mouseleave', () => {
                    isHovering = false;
                    previewTooltip.classList.remove('show');
                    setTimeout(() => {
                        if (!isHovering) {
                            previewTooltip.style.display = 'none';
                        }
                    }, 150);
                    if (hoverSeekTimeout) clearTimeout(hoverSeekTimeout);
                });
            }
        }
    });
    
    // Setup Playback progress saver (save current time every 2 seconds)
    state.progressSaveTimer = setInterval(() => {
        if (state.activePlayer && !state.activePlayer.paused && state.activePlayer.currentTime > 5) {
            // Only save if progress is less than 95% complete to prevent looping completed videos
            if (state.activePlayer.currentTime < state.activePlayer.duration * 0.95) {
                localStorage.setItem(getProgressKey(server.url), state.activePlayer.currentTime);
            } else {
                localStorage.removeItem(getProgressKey(server.url)); // remove completed progress
            }
        }
    }, 2000);
    
    // Bind Advanced Keyboard control listener in CAPTURING phase
    window.addEventListener('keydown', handleKeyboardShortcuts, true);
    
    // Single Click & Double Click gesture actions inside a unified Click handler in CAPTURING phase
    state.clickTimer = null;
    // Ensure YouTube Seek Overlays exist in DOM
    const ensureSeekOverlays = () => {
        const plyrContainer = elements.playerRenderArea.querySelector('.plyr');
        if (plyrContainer && !document.getElementById('yt-seek-left-overlay')) {
            plyrContainer.insertAdjacentHTML('beforeend', `
                <div id="yt-seek-left-overlay" class="yt-seek-overlay yt-seek-left">
                    <div class="yt-seek-ripple"></div>
                    <div class="yt-seek-content">
                        <div class="yt-seek-triangles">
                            <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
                            <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
                            <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
                        </div>
                        <div class="yt-seek-text">10 ثوانٍ</div>
                    </div>
                </div>
                <div id="yt-seek-right-overlay" class="yt-seek-overlay yt-seek-right">
                    <div class="yt-seek-ripple"></div>
                    <div class="yt-seek-content">
                        <div class="yt-seek-triangles">
                            <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                            <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                            <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                        </div>
                        <div class="yt-seek-text">10 ثوانٍ</div>
                    </div>
                </div>
            `);
        }
    };

    state.playerClickListener = (e) => {
        // Prevent interfering with actual buttons or sliders
        const isControlElement = e.target.closest('button, input, [role="menuitem"], .plyr__menu');
        if (isControlElement) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        ensureSeekOverlays();
        const plyrContainer = elements.playerRenderArea.querySelector('.plyr');
        const rect = plyrContainer ? plyrContainer.getBoundingClientRect() : elements.playerRenderArea.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        const widthPercent = (tapX / rect.width) * 100;
        const currentSide = widthPercent > 65 ? 'forward' : (widthPercent < 35 ? 'backward' : 'middle');

        if (state.clickTimer) {
            clearTimeout(state.clickTimer);
            state.clickTimer = null;
        } else if (state.seekOverlayTimer && currentSide === state.seekDirection) {
            // Continuation of consecutive tapping
        } else {
            // Wait to distinguish from double click
            state.clickTimer = setTimeout(() => {
                state.clickTimer = null;
                if (state.activePlayer) {
                    if (state.activePlayer.paused) {
                        state.activePlayer.play().catch(()=>{});
                    } else {
                        state.activePlayer.pause();
                    }
                }
            }, 250);
            return;
        }

        // Handle Double Tap / Consecutive Taps
        if (state.activePlayer) {
            // Hide player controls to keep the view clean for the animation
            try { state.activePlayer.toggleControls(false); } catch(err){}
        }
        if (plyrContainer) {
            plyrContainer.classList.add('hide-controls-force');
        }

        if (currentSide === 'middle') {
            if (state.activePlayer) state.activePlayer.fullscreen.toggle();
            if (plyrContainer) plyrContainer.classList.remove('hide-controls-force');
            return;
        }

        state.seekDirection = currentSide;
        if (!state.accumulatedSeek) state.accumulatedSeek = 0;
        state.accumulatedSeek += 10;
        
        // Execute the seek IMMEDIATELY (jump 10s per tap instantly)
        if (state.activePlayer) {
            if (currentSide === 'forward') {
                state.activePlayer.currentTime = Math.min(state.activePlayer.duration || 0, state.activePlayer.currentTime + 10);
            } else {
                state.activePlayer.currentTime = Math.max(0, state.activePlayer.currentTime - 10);
            }
        }
        
        // Show UI Overlay
        const overlayId = currentSide === 'forward' ? 'yt-seek-right-overlay' : 'yt-seek-left-overlay';
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.classList.remove('animate-ripple');
            void overlay.offsetWidth; // trigger reflow
            overlay.classList.add('active', 'animate-ripple');
            overlay.querySelector('.yt-seek-text').innerText = `${state.accumulatedSeek} ثوانٍ`;
        }

        if (state.seekOverlayTimer) clearTimeout(state.seekOverlayTimer);
        state.seekOverlayTimer = setTimeout(() => {
            // Hide Overlay and restore controls visibility state
            if (overlay) {
                overlay.classList.remove('active', 'animate-ripple');
            }
            if (plyrContainer) {
                plyrContainer.classList.remove('hide-controls-force');
            }
            
            // Reset state
            state.accumulatedSeek = 0;
            state.seekDirection = null;
            state.seekOverlayTimer = null;
        }, 700);
    };
    
    elements.playerRenderArea.addEventListener('click', state.playerClickListener, true);
    
    // Block native dblclick events on video viewport in capturing phase to prevent Plyr overlay takeovers
    state.playerDblClickListener = (e) => {
        const isVideoClick = e.target.closest('.plyr__video-wrapper') || e.target.tagName === 'VIDEO';
        if (!isVideoClick) return;
        
        e.preventDefault();
        e.stopPropagation();
    };
    elements.playerRenderArea.addEventListener('dblclick', state.playerDblClickListener, true);
    
    // Mobile Touch Gesture Engine (Swipes for Volume/Brightness)
    let startX = 0;
    let startY = 0;
    let startVolume = 0;
    let startBrightness = state.currentBrightness || 1.0;
    let isSwiping = false;
    let touchSide = ''; // 'left' or 'right'
    
    // Pinch to Zoom state
    let initialPinchDistance = 0;
    let isPinching = false;
    let hasToggledZoom = false;

    state.playerTouchStart = (e) => {
        if (e.touches.length === 2) {
            // Multi-touch for pinch to zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDistance = Math.hypot(dx, dy);
            isPinching = true;
            hasToggledZoom = false;
            return;
        }
        
        isPinching = false;
        const touch = e.touches[0];
        const rect = elements.playerRenderArea.getBoundingClientRect();
        startX = touch.clientX;
        startY = touch.clientY;
        startVolume = state.activePlayer ? state.activePlayer.volume : 1.0;
        startBrightness = state.currentBrightness || 1.0;
        isSwiping = false;

        const xRelative = startX - rect.left;
        if (xRelative > rect.width / 2) {
            touchSide = 'right'; // Volume adjustment
        } else {
            touchSide = 'left'; // Brightness adjustment
        }
    };

    state.playerTouchMove = (e) => {
        if (!state.activePlayer) return;
        
        if (isPinching && e.touches.length === 2) {
            if (e.cancelable) e.preventDefault(); // Prevent native zoom/scroll
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.hypot(dx, dy);
            
            const pinchDiff = currentDistance - initialPinchDistance;
            const videoEl = elements.playerRenderArea.querySelector('video');
            
            if (videoEl && !hasToggledZoom) {
                // Threshold of 60px distance change to toggle zoom safely
                if (pinchDiff > 60) { // Pinch Out (Zoom to fill)
                    if (!videoEl.classList.contains('video-zoomed')) {
                        videoEl.classList.add('video-zoomed');
                        showCenterIndicator('fa-solid fa-expand', false, "تم ملء الشاشة");
                        hasToggledZoom = true;
                    }
                } else if (pinchDiff < -60) { // Pinch In (Zoom out to original fit)
                    if (videoEl.classList.contains('video-zoomed')) {
                        videoEl.classList.remove('video-zoomed');
                        showCenterIndicator('fa-solid fa-compress', false, "الوضع الأصلي");
                        hasToggledZoom = true;
                    }
                }
            }
            return;
        }
        
        if (isPinching || e.touches.length > 1) return; // Prevent single swipe if currently pinching

        const touch = e.touches[0];
        const rect = elements.playerRenderArea.getBoundingClientRect();
        
        const diffX = touch.clientX - startX;
        const diffY = startY - touch.clientY; // swipe up is positive

        // Threshold of 15px to start swiping vertically
        if (!isSwiping && Math.abs(diffY) > 15 && Math.abs(diffY) > Math.abs(diffX)) {
            isSwiping = true;
        }

        if (isSwiping) {
            if (e.cancelable) e.preventDefault(); // Prevent page scroll while swiping
            
            if (touchSide === 'right') {
                const deltaPercent = diffY / rect.height;
                // Adjust Volume
                const newVolume = Math.min(1, Math.max(0, startVolume + deltaPercent * 1.2));
                state.activePlayer.volume = newVolume;
                
                const volPercent = Math.round(newVolume * 100);
                let icon = 'fa-solid fa-volume-high';
                if (volPercent === 0) icon = 'fa-solid fa-volume-xmark';
                else if (volPercent < 40) icon = 'fa-solid fa-volume-low';
                
                showCenterIndicator(icon, false, `${volPercent}%`);
            }
            // Brightness swipe disabled per user request
        }
    };

    state.playerTouchEnd = (e) => {
        if (isPinching) {
            if (e.touches.length < 2) {
                isPinching = false;
            }
            if (e.cancelable) e.preventDefault();
            return;
        }
        
        if (isSwiping) {
            // Prevent the touchend click/tap trigger
            if (e.cancelable) e.preventDefault();
            isSwiping = false;
        }
    };

    elements.playerRenderArea.addEventListener('touchstart', state.playerTouchStart, { passive: true });
    elements.playerRenderArea.addEventListener('touchmove', state.playerTouchMove, { passive: false });
    elements.playerRenderArea.addEventListener('touchend', state.playerTouchEnd, { passive: false });

    // Setup next episode autoplay
    setupAutoplayNext(server.url);
    
    // Load initial source
    loadPlayerSource(server, 0, true);
    } catch (error) {
        console.error("Launch Player Crash:", error);
        if (elements.playerServerBadge) elements.playerServerBadge.innerText = 'CRASH: ' + error.message;
        if (elements.playerTitleDisplay) elements.playerTitleDisplay.innerText = 'CRASH: ' + error.stack;
    }
}

function closePlayerModal() {
    // Clear Saved save progress timer
    if (state.progressSaveTimer) {
        clearInterval(state.progressSaveTimer);
    }
    if (state.countdownTimer) {
        clearInterval(state.countdownTimer);
    }
    if (state.loaderIntervals) {
        state.loaderIntervals.forEach(t => clearTimeout(t));
    }
    
    // Unbind Keyboard shortcuts in CAPTURING phase
    window.removeEventListener('keydown', handleKeyboardShortcuts, true);
    
    if (state.clickTimer) {
        clearTimeout(state.clickTimer);
        state.clickTimer = null;
    }
    
    if (state.playerClickListener && elements.playerRenderArea) {
        elements.playerRenderArea.removeEventListener('click', state.playerClickListener, true);
        state.playerClickListener = null;
    }
    
    if (state.playerDblClickListener && elements.playerRenderArea) {
        elements.playerRenderArea.removeEventListener('dblclick', state.playerDblClickListener, true);
        state.playerDblClickListener = null;
    }
    
    if (state.playerTouchStart && elements.playerRenderArea) {
        elements.playerRenderArea.removeEventListener('touchstart', state.playerTouchStart, { passive: true });
        elements.playerRenderArea.removeEventListener('touchmove', state.playerTouchMove, { passive: false });
        elements.playerRenderArea.removeEventListener('touchend', state.playerTouchEnd, { passive: false });
        state.playerTouchStart = null;
        state.playerTouchMove = null;
        state.playerTouchEnd = null;
    }
    
    if (state.activePlayer) {
        state.activePlayer.destroy();
        state.activePlayer = null;
    }
    
    if (state.hlsInstance) {
        state.hlsInstance.destroy();
        state.hlsInstance = null;
    }
    
    if (state.previewHlsInstance) {
        state.previewHlsInstance.destroy();
        state.previewHlsInstance = null;
    }
    
    state.currentPlayingServer = null;
    if (elements.playerRenderArea) elements.playerRenderArea.innerHTML = '';
    if (elements.playerModal) elements.playerModal.style.display = 'none';
    
    // Show poster wrapper again
    const posterWrapper = document.getElementById('modal-poster-wrapper');
    if (posterWrapper) posterWrapper.style.display = 'block';
    
    // Show close details button again
    if (elements.closeDetailsBtn) {
        elements.closeDetailsBtn.style.display = 'flex';
    }
}

