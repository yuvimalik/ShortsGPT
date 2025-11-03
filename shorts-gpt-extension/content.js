console.log("News Cards extension active.");

// Configuration - Using Real-Time News Data API
const API_CONFIG = {
  endpoint: 'https://real-time-news-data.p.rapidapi.com/top-headlines',
  apiKey: '44fc49fe73msh495642fa777e576p19ac8djsn97b9ccb8b6ff',
  apiHost: 'real-time-news-data.p.rapidapi.com'
};

// Expose test function immediately to window
window.testNewsAPI = function() {
  console.log('🧪 Testing News API...');
  
  return new Promise((resolve, reject) => {
    const data = null;
    const xhr = new XMLHttpRequest();
    // Removed withCredentials - causes CORS issues with wildcard Access-Control-Allow-Origin

    xhr.addEventListener('readystatechange', function () {
      console.log(`📊 ReadyState: ${this.readyState}, Status: ${this.status}`);
      
      if (this.readyState === 4) { // XMLHttpRequest.DONE = 4
        console.log('✅ Request completed');
        console.log('Response status:', this.status);
        console.log('Response text length:', this.responseText?.length || 0);
        
        try {
          if (this.status >= 200 && this.status < 300) {
            console.log('📦 Raw response:', this.responseText.substring(0, 500));
            const responseData = JSON.parse(this.responseText);
            console.log('✅ Parsed JSON:', responseData);
            console.log('📊 Response structure:', {
              isArray: Array.isArray(responseData),
              hasData: !!responseData.data,
              hasArticles: !!responseData.articles,
              hasResults: !!responseData.results,
              keys: Object.keys(responseData)
            });
            
            // Use the parseNewsResponse function if it exists
            if (typeof parseNewsResponse === 'function') {
              const tweets = parseNewsResponse(responseData);
              console.log(`✅ Parsed ${tweets.length} articles`);
              console.log('Sample article:', tweets[0]);
              resolve({ tweets, rawResponse: responseData });
            } else {
              console.log('📋 Raw response data:', responseData);
              resolve({ rawResponse: responseData });
            }
          } else if (this.status === 429) {
            console.error('❌ Rate limit exceeded');
            reject(new Error('Rate limit exceeded. Please try again later.'));
          } else {
            console.error(`❌ HTTP error! status: ${this.status}`);
            console.error('Response:', this.responseText);
            reject(new Error(`HTTP error! status: ${this.status}`));
          }
        } catch (error) {
          console.error('❌ Parse error:', error);
          console.error('Response text:', this.responseText?.substring(0, 500));
          reject(new Error('Failed to parse response: ' + error.message));
        }
      }
    });

    xhr.addEventListener('error', function(e) {
      console.error('❌ Network error:', e);
      reject(new Error('Network error'));
    });

    xhr.addEventListener('timeout', function() {
      console.error('❌ Request timed out');
      reject(new Error('Request timed out'));
    });

    xhr.addEventListener('loadstart', function() {
      console.log('🚀 Request started');
    });

    const url = 'https://real-time-news-data.p.rapidapi.com/top-headlines?limit=500&country=US&lang=en';
    console.log('📡 Opening request to:', url);
    
    xhr.open('GET', url);
    xhr.setRequestHeader('x-rapidapi-key', '44fc49fe73msh495642fa777e576p19ac8djsn97b9ccb8b6ff');
    xhr.setRequestHeader('x-rapidapi-host', 'real-time-news-data.p.rapidapi.com');
    xhr.timeout = 15000; // 15 second timeout
    
    console.log('📤 Sending request...');
    xhr.send(data);
  });
};

console.log('💡 Test function available: Call window.testNewsAPI() in console to test the API');

// Manual trigger function for testing
window.showNewsOverlay = function(query = null) {
  console.log('🎯 Manually triggering overlay with query:', query);
  showOverlay(query);
};

// Force show overlay for debugging
window.forceShowOverlay = function() {
  console.log('🔧 Force showing overlay for debugging...');
  const overlay = createOverlay();
  if (!document.body.contains(overlay)) {
    document.body.appendChild(overlay);
  }
  updateOverlayPosition();
  overlay.style.display = 'flex';
  overlay.style.visibility = 'visible';
  overlay.style.opacity = '1';
  overlay.style.transform = 'translateY(-100%)';
  overlay.style.zIndex = '10000';
  overlay.style.backgroundColor = '#343541';
  overlay.style.border = '2px solid red'; // Debug border
  
  const content = overlay.querySelector('#tweet-content');
  if (content) {
    content.innerHTML = '<div style="padding: 20px; color: white;">DEBUG: Overlay is visible!</div>';
  }
  
  console.log('✅ Force show complete. Overlay element:', overlay);
  console.log('Computed styles:', {
    display: window.getComputedStyle(overlay).display,
    visibility: window.getComputedStyle(overlay).visibility,
    opacity: window.getComputedStyle(overlay).opacity,
    position: window.getComputedStyle(overlay).position,
    top: window.getComputedStyle(overlay).top,
    left: window.getComputedStyle(overlay).left,
    zIndex: window.getComputedStyle(overlay).zIndex
  });
  
  return overlay;
};

// Query cache (in-memory)
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// State management - SIMPLIFIED
let lastUserPrompt = '';
let currentState = 'IDLE'; // IDLE, THINKING, GENERATING, MINIMIZED
let debounceTimer = null;
let mutationObserver = null;
let overlayElement = null;
let currentTab = 'news'; // 'news', 'twitter', 'youtube'

// Debounce function
function debounce(func, wait) {
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(debounceTimer);
      func(...args);
    };
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(later, wait);
  };
}

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
}

// testNewsAPI function is now defined at the top level on window

// Fetch news from API using exact XMLHttpRequest code
function fetchTweets(query) {
  return new Promise((resolve, reject) => {
    console.log('📰 Fetching news for query:', query || 'none');
    
    // Check cache first
    const cacheKey = 'news-headlines'; // Cache by news type, not query
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('💾 Using cached data');
      // Filter cached results by query if provided
      const filteredTweets = filterNewsByQuery(cached.data, query);
      return resolve({ tweets: filteredTweets, fromCache: true });
    }

    console.log('🌐 Fetching from API...');
    const data = null;

    const xhr = new XMLHttpRequest();
    // Removed withCredentials - causes CORS issues with wildcard Access-Control-Allow-Origin

    xhr.addEventListener('readystatechange', function () {
      if (this.readyState === 4) { // XMLHttpRequest.DONE = 4
        console.log(`📊 API Response - Status: ${this.status}, ReadyState: ${this.readyState}`);
        
        try {
          if (this.status >= 200 && this.status < 300) {
            console.log('✅ API call successful');
            const responseData = JSON.parse(this.responseText);
            console.log('📦 Response keys:', Object.keys(responseData));
            console.log('📊 Response structure:', {
              isArray: Array.isArray(responseData),
              hasData: !!responseData.data,
              dataLength: responseData.data?.length || 0
            });
            
            const tweets = parseNewsResponse(responseData);
            console.log(`✅ Parsed ${tweets.length} articles from API`);
            
            // Cache all news articles
            queryCache.set(cacheKey, {
              data: tweets,
              timestamp: Date.now()
            });
            
            // Filter by query
            const filteredTweets = filterNewsByQuery(tweets, query);
            console.log(`✅ Returning ${filteredTweets.length} filtered articles`);
            resolve({ tweets: filteredTweets });
          } else if (this.status === 429) {
            console.error('❌ Rate limit exceeded');
            reject(new Error('Rate limit exceeded. Please try again later.'));
          } else {
            console.error(`❌ HTTP error! status: ${this.status}`);
            console.error('Response:', this.responseText?.substring(0, 200));
            reject(new Error(`HTTP error! status: ${this.status}`));
          }
        } catch (error) {
          console.error('❌ News API parse error:', error);
          console.error('Response text preview:', this.responseText?.substring(0, 500));
          reject(new Error('Failed to parse response: ' + error.message));
        }
      }
    });

    xhr.addEventListener('error', function(e) {
      console.error('❌ Network error:', e);
      reject(new Error('Network error'));
    });

    xhr.addEventListener('timeout', function() {
      console.error('❌ Request timed out');
      reject(new Error('Request timed out'));
    });

    const url = 'https://real-time-news-data.p.rapidapi.com/top-headlines?limit=500&country=US&lang=en';
    console.log('📡 API URL:', url);
    
    xhr.open('GET', url);
    xhr.setRequestHeader('x-rapidapi-key', '44fc49fe73msh495642fa777e576p19ac8djsn97b9ccb8b6ff');
    xhr.setRequestHeader('x-rapidapi-host', 'real-time-news-data.p.rapidapi.com');
    xhr.timeout = 15000; // 15 second timeout

    console.log('📤 Sending API request...');
    xhr.send(data);
  });
}

// Filter news articles by query relevance
function filterNewsByQuery(newsArticles, query) {
  if (!query || query.trim().length < 2) {
    // Return top 10 if no query
    return newsArticles.slice(0, 10);
  }

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  if (queryWords.length === 0) {
    return newsArticles.slice(0, 10);
  }

  // Score articles by relevance
  const scored = newsArticles.map(article => {
    let score = 0;
    const title = (article.title || '').toLowerCase();
    const description = (article.description || '').toLowerCase();
    const source = (article.source || '').toLowerCase();
    const combinedText = `${title} ${description} ${source}`;

    queryWords.forEach(word => {
      // Title matches are most relevant
      if (title.includes(word)) score += 10;
      // Description matches
      if (description.includes(word)) score += 5;
      // Source matches
      if (source.includes(word)) score += 2;
      // Partial matches
      if (combinedText.includes(word)) score += 1;
    });

    return { article, score };
  });

  // Sort by score and return top 10
  const relevant = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.article);

  // If we have relevant results, return them; otherwise return top 10
  return relevant.length > 0 ? relevant : newsArticles.slice(0, 10);
}

// Parse news API response and convert to tweet-like format
function parseNewsResponse(data) {
  const articles = [];
  
  console.log('🔍 Parsing response, type:', typeof data, 'isArray:', Array.isArray(data));
  
  // Handle different possible response structures
  if (Array.isArray(data)) {
    console.log('📋 Response is array, length:', data.length);
    data.forEach(item => articles.push(convertNewsToTweet(item)));
  } else if (data.data && Array.isArray(data.data)) {
    console.log('📋 Response has data array, length:', data.data.length);
    data.data.forEach(item => articles.push(convertNewsToTweet(item)));
  } else if (data.articles && Array.isArray(data.articles)) {
    console.log('📋 Response has articles array, length:', data.articles.length);
    data.articles.forEach(item => articles.push(convertNewsToTweet(item)));
  } else if (data.results && Array.isArray(data.results)) {
    console.log('📋 Response has results array, length:', data.results.length);
    data.results.forEach(item => articles.push(convertNewsToTweet(item)));
  } else {
    console.warn('⚠️ Unknown response structure:', Object.keys(data));
    console.warn('Full response:', JSON.stringify(data).substring(0, 500));
  }

  console.log(`✅ Parsed ${articles.length} articles`);
  return articles;
}

// Convert news article to tweet-like format
function convertNewsToTweet(newsItem) {
  return {
    author: newsItem.source || newsItem.source_name || newsItem.author || 'News Source',
    handle: newsItem.source ? `@${newsItem.source.toLowerCase().replace(/\s+/g, '')}` : '@news',
    text: newsItem.title || newsItem.description || newsItem.content || 'No content',
    timestamp: newsItem.pubDate || newsItem.publishedAt || newsItem.date || new Date().toISOString(),
    link: newsItem.link || newsItem.url || newsItem.article_url || '#'
  };
}



// Extract last user prompt from DOM
function extractLastUserPrompt() {
  // Look for user message elements in ChatGPT DOM
  const selectors = [
    '[data-message-author-role="user"]',
    '.user-message',
    '[class*="user"] [class*="message"]',
    '[class*="request"]'
  ];

  for (const selector of selectors) {
    const messages = document.querySelectorAll(selector);
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const text = lastMessage.textContent?.trim() || '';
      if (text.length > 0) {
        // Limit to last 100 characters for API query
        return text.slice(-100);
      }
    }
  }

  // Fallback: look for textarea/composer
  const composer = document.querySelector('textarea[placeholder*="Message"], textarea[id*="prompt"], [contenteditable="true"]');
  if (composer) {
    const text = composer.value || composer.textContent || '';
    return text.trim().slice(-100);
  }

  return '';
}

// Detect if text is being generated (real words appearing)
function detectTextGenerating() {
  const assistantTurns = document.querySelectorAll('[data-message-author-role="assistant"]');

  for (const turn of assistantTurns) {
    const text = turn.textContent?.trim() || '';

    // Check if there's actual content being generated (more than 5 characters to catch it early)
    if (text.length > 5) {
      return true;
    }
  }

  return false;
}

// Detect if ChatGPT is thinking/loading - IMMEDIATE detection
function detectThinkingState() {
  // First priority: Check if user just sent a message (send button is disabled)
  const sendButton = document.querySelector('button[data-testid*="send"], button[aria-label*="Send"]');

  // If send button is disabled, ChatGPT is processing
  if (sendButton && sendButton.disabled) {
    return true;
  }

  // Check for stop generating button (appears when thinking/generating)
  const stopButton = document.querySelector('button[aria-label*="Stop"], button[data-testid*="stop"]');
  if (stopButton) {
    return true;
  }

  // Check for assistant turn without final text (skeleton/spinner)
  const assistantTurns = document.querySelectorAll('[data-message-author-role="assistant"]');

  for (const turn of assistantTurns) {
    const text = turn.textContent?.trim() || '';
    const hasSpinner = turn.querySelector('[class*="spinner"], [class*="loading"], [class*="animate-pulse"]');
    const hasSkeleton = turn.querySelector('[class*="skeleton"]');
    const hasTypingIndicator = turn.textContent?.includes('▊') || turn.textContent?.includes('█');

    // If assistant turn exists but has no substantial text and has loading indicators
    if ((text.length < 5 || hasSpinner || hasSkeleton || hasTypingIndicator)) {
      return true;
    }
  }

  // Check for streaming/thinking indicators
  const thinkingIndicators = [
    '[class*="result-streaming"]',
    '[class*="thinking"]',
    '[class*="generating"]',
    '[class*="typing"]',
    '[data-thinking]',
    '[data-streaming="true"]',
    'button[aria-label*="Stop"]', // Stop generating button appears when thinking
    'button[aria-label*="Regenerate"]' // Regenerate button appears when thinking
  ];

  for (const selector of thinkingIndicators) {
    try {
      if (document.querySelector(selector)) {
        return true;
      }
  } catch (e) {
      // Invalid selector, skip
    }
  }

  // Check for empty assistant messages that just appeared
  const recentAssistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
  for (const msg of recentAssistantMessages) {
    const text = msg.textContent?.trim() || '';
    // If message exists but is very short, might be thinking
    if (text.length > 0 && text.length < 5) {
      const hasVisibleContent = msg.querySelector('p, div[class*="markdown"], code');
      if (!hasVisibleContent) {
        return true;
      }
    }
  }

  // Check if there's a textarea with content but no recent assistant response
  const textarea = document.querySelector('textarea[placeholder*="Message"], textarea[id*="prompt"]');
  if (textarea && textarea.value.trim()) {
    // Check if last message is from user (meaning ChatGPT hasn't responded yet)
    const allMessages = document.querySelectorAll('[data-message-author-role]');
    if (allMessages.length > 0) {
      const lastMessage = allMessages[allMessages.length - 1];
      const lastRole = lastMessage.getAttribute('data-message-author-role');
      if (lastRole === 'user') {
        // User just sent message, ChatGPT is probably thinking
        return true;
      }
    }
  }

  return false;
}

// Create tweet card element with card-style design and hover
function createTweetCard(tweet) {
  const card = document.createElement('article');
  card.className = 'tweet-card';
  card.setAttribute('role', 'article');
  card.setAttribute('tabindex', '0');
  
  // Match ChatGPT's card styling
  card.style.cssText = `
    border-radius: 8px;
    padding: 12px 16px;
    margin: 0;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    font-family: 'Söhne', 'SF Pro Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  // Header with user and handle
  const header = document.createElement('div');
  header.style.cssText = 'font-weight: 500; margin-bottom: 6px;';
  
  const author = document.createElement('span');
  author.textContent = sanitizeHTML(tweet.author || 'Unknown');
  author.style.cssText = 'color: #ececec; font-weight: 700; font-size: 14px; letter-spacing: -0.01em; font-family: "Söhne", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';

  const handle = document.createElement('span');
  handle.textContent = ' ' + sanitizeHTML(tweet.handle || '@unknown');
  handle.style.cssText = 'color: #8e8e93; font-weight: 400; font-size: 13px; font-family: "Söhne Mono", "SF Mono", Monaco, Consolas, monospace;';
  
  header.appendChild(author);
  header.appendChild(handle);

  // Content text
  const text = document.createElement('div');
  text.style.cssText = 'line-height: 1.45;';
  
  const fullText = sanitizeHTML(tweet.text || 'No content');
  
  // Split into title (first sentence) and description (rest)
  const textParts = fullText.split(/[.!\?]\s+/);
  
  if (textParts.length > 1 && textParts[0].length > 10) {
    // Has multiple sentences - format as title + description
    const title = document.createElement('div');
    title.style.cssText = 'font-weight: 650; font-size: 15px; color: #f5f5f7; margin-bottom: 4px; line-height: 1.4; letter-spacing: -0.02em; font-family: "Söhne", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
    title.textContent = textParts[0] + (fullText.includes(textParts[0] + '.') ? '.' :
                                        fullText.includes(textParts[0] + '!') ? '!' :
                                        fullText.includes(textParts[0] + '?') ? '?' : '');

    const description = document.createElement('div');
    description.style.cssText = 'font-size: 13px; color: #a1a1a6; line-height: 1.6; font-weight: 400; letter-spacing: -0.01em; font-family: "Söhne", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
    const remainingText = textParts.slice(1).join('. ');
    description.textContent = remainingText + (fullText.endsWith('.') ? '.' :
                                               fullText.endsWith('!') ? '!' :
                                               fullText.endsWith('?') ? '?' : '');

    text.appendChild(title);
    text.appendChild(description);
  } else {
    // Single sentence - display as regular text
    text.textContent = fullText;
    text.style.cssText += 'color: #f5f5f7; font-size: 14px; font-weight: 500; letter-spacing: -0.01em; font-family: "Söhne", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5;';
  }

  card.appendChild(header);
  card.appendChild(text);

  // Hover effects matching ChatGPT
  card.addEventListener('mouseover', function() {
    this.style.background = 'rgba(255, 255, 255, 0.08)';
    this.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    this.style.transform = 'translateY(-1px)';
  });

  card.addEventListener('mouseout', function() {
    this.style.background = 'rgba(255, 255, 255, 0.05)';
    this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    this.style.transform = 'translateY(0)';
  });

  if (tweet.link) {
    card.setAttribute('title', 'Click to read full article');
    card.addEventListener('click', () => {
      window.open(tweet.link, '_blank', 'noopener,noreferrer');
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.open(tweet.link, '_blank', 'noopener,noreferrer');
      }
    });
  }

  return card;
}

// Create pill-shaped navbar component
function createNavbar() {
  const navbar = document.createElement('nav');
  navbar.className = 'tweet-navbar';
  navbar.setAttribute('role', 'tablist');
  navbar.setAttribute('aria-label', 'Content type selection');
  navbar.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    background: transparent;
    border-radius: 0;
    position: relative;
    flex: 0 0 auto;
  `;

  const tabs = [
    { id: 'news', label: 'News' },
    { id: 'twitter', label: 'Twitter' },
    { id: 'youtube', label: 'Shorts' }
  ];

  tabs.forEach((tab, index) => {
    const tabButton = document.createElement('button');
    tabButton.className = 'tweet-navbar-tab';
    tabButton.setAttribute('role', 'tab');
    tabButton.setAttribute('aria-selected', currentTab === tab.id ? 'true' : 'false');
    tabButton.setAttribute('aria-controls', `tabpanel-${tab.id}`);
    tabButton.setAttribute('tabindex', currentTab === tab.id ? '0' : '-1');
    tabButton.dataset.tabId = tab.id;
    
    tabButton.textContent = tab.label;
    
    // ChatGPT-style pill-shaped buttons
    tabButton.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 14px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #b4b4b4;
      font-size: 13px;
      font-weight: 500;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: "Söhne", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      white-space: nowrap;
      z-index: 1;
    `;

    // Active state
    if (currentTab === tab.id) {
      tabButton.style.color = '#ececec';
      tabButton.style.background = 'rgba(255, 255, 255, 0.15)';
      tabButton.style.fontWeight = '600';
    }

    // Hover effect
    tabButton.addEventListener('mouseenter', function() {
      if (currentTab !== tab.id) {
        this.style.background = 'rgba(255, 255, 255, 0.12)';
        this.style.color = '#ececec';
      }
    });

    tabButton.addEventListener('mouseleave', function() {
      if (currentTab !== tab.id) {
        this.style.background = 'rgba(255, 255, 255, 0.1)';
        this.style.color = '#b4b4b4';
      }
    });

    // Click handler
    tabButton.addEventListener('click', () => switchTab(tab.id));
    
    tabButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchTab(tab.id);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = e.key === 'ArrowLeft' ? 
          (index - 1 + tabs.length) % tabs.length : 
          (index + 1) % tabs.length;
        tabs[nextIndex].id && switchTab(tabs[nextIndex].id);
        navbar.querySelector(`[data-tab-id="${tabs[nextIndex].id}"]`)?.focus();
      }
    });

    navbar.appendChild(tabButton);
  });

  return navbar;
}

// Switch between tabs
async function switchTab(tabId) {
  if (currentTab === tabId || !overlayElement) return;
  
  console.log(`🔄 Switching tab from ${currentTab} to ${tabId}`);
  currentTab = tabId;
  
  // Update navbar active states
  const navbar = overlayElement.querySelector('.tweet-navbar');
  if (navbar) {
    const tabs = navbar.querySelectorAll('.tweet-navbar-tab');
    tabs.forEach(tab => {
      const isActive = tab.dataset.tabId === tabId;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');

      if (isActive) {
        tab.style.color = '#ececec';
        tab.style.background = 'rgba(255, 255, 255, 0.15)';
        tab.style.fontWeight = '600';
      } else {
        tab.style.color = '#b4b4b4';
        tab.style.background = 'rgba(255, 255, 255, 0.1)';
        tab.style.fontWeight = '500';
      }
    });
  }
  
  // Load content for the new tab
  await loadTabContent(tabId);
}

// Load content based on active tab
async function loadTabContent(tabId) {
  const overlay = overlayElement;
  if (!overlay) return;
  
  const content = overlay.querySelector('#tweet-content');
  if (!content) return;
  
  // Update label based on tab
  const container = overlay.querySelector('.tweet-overlay-container');
  const articlesLabel = container?.querySelector('div:first-child');
  if (articlesLabel) {
    const labels = { news: 'News Articles', twitter: 'Twitter Posts', youtube: 'YouTube Shorts' };
    articlesLabel.textContent = labels[tabId] || 'News Articles';
  }
  
  // Show loading state with smooth fade
  content.style.opacity = '0.5';
  content.style.transition = 'opacity 0.2s ease';
  
  const query = lastUserPrompt || 'latest';
  
  try {
    let result;
    
    if (tabId === 'news') {
      result = await fetchTweets(query);
    } else if (tabId === 'twitter') {
      result = await fetchTwitter(query);
    } else if (tabId === 'youtube') {
      result = await fetchYouTubeShorts(query);
    }
    
    // Fade in new content
    content.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (result.error || !result.tweets || result.tweets.length === 0) {
      content.innerHTML = `
        <div class="tweet-empty">
          <div class="tweet-empty-icon">${tabId === 'news' ? '📰' : tabId === 'twitter' ? '🐦' : '▶️'}</div>
          <div class="tweet-empty-message">No ${tabId === 'news' ? 'news' : tabId === 'twitter' ? 'tweets' : 'videos'} found</div>
        </div>
      `;
    } else {
      content.innerHTML = '';
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      result.tweets.forEach((tweet, i) => {
        const card = createTweetCard(tweet);
        if (!prefersReducedMotion) {
          card.style.animationDelay = `${i * 0.05}s`;
        }
        content.appendChild(card);
      });
    }
    
    // Fade in
    await new Promise(resolve => setTimeout(resolve, 50));
    content.style.opacity = '1';
    
    // Ensure overlay is expanded when content loads
    if (overlay.classList.contains('minimized')) {
      overlay.classList.remove('minimized');
      isMinimized = false;
    }
    
  } catch (error) {
    console.error(`Error loading ${tabId}:`, error);
    content.innerHTML = `
      <div class="tweet-error">
        <div class="tweet-error-icon">⚠️</div>
        <div class="tweet-error-message">Failed to load ${tabId}</div>
      </div>
    `;
    content.style.opacity = '1';
  }
}

// Placeholder functions for Twitter and YouTube
async function fetchTwitter(query) {
  // TODO: Implement Twitter API integration
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ 
        tweets: [
          {
            author: 'Twitter',
            handle: '@twitter',
            text: 'Twitter integration coming soon. Check back later!',
            timestamp: Date.now(),
            url: '#'
          }
        ]
      });
    }, 500);
  });
}

// Fetch YouTube Shorts trending videos using exact XMLHttpRequest code
async function fetchYouTubeShorts(query) {
  return new Promise((resolve, reject) => {
    console.log('🎬 Fetching YouTube Shorts trending for query:', query || 'none');
    
    // Check cache first
    const cacheKey = 'youtube-shorts-trending';
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('💾 Using cached YouTube Shorts data');
      resolve({ tweets: cached.data, fromCache: true });
      return;
    }

    console.log('🌐 Fetching from YouTube Shorts API...');
    const data = null;

    const xhr = new XMLHttpRequest();
    // Removed withCredentials - causes CORS issues with wildcard Access-Control-Allow-Origin

    xhr.addEventListener('readystatechange', function () {
      if (this.readyState === 4) { // XMLHttpRequest.DONE = 4
        console.log(`📊 YouTube Shorts API Response - Status: ${this.status}, ReadyState: ${this.readyState}`);
        
        try {
          if (this.status >= 200 && this.status < 300) {
            console.log('✅ YouTube Shorts API call successful');
            const responseData = JSON.parse(this.responseText);
            console.log('📦 YouTube Shorts Response keys:', Object.keys(responseData));
            console.log('📊 YouTube Shorts Response structure:', {
              isArray: Array.isArray(responseData),
              hasData: !!responseData.data,
              hasResults: !!responseData.results,
              dataLength: responseData.data?.length || responseData.results?.length || 0
            });
            
            const shorts = parseYouTubeShortsResponse(responseData);
            console.log(`✅ Parsed ${shorts.length} YouTube Shorts from API`);
            
            // Cache the shorts
            queryCache.set(cacheKey, {
              data: shorts,
              timestamp: Date.now()
            });
            
            resolve({ tweets: shorts });
          } else if (this.status === 429) {
            console.error('❌ Rate limit exceeded');
            reject(new Error('Rate limit exceeded. Please try again later.'));
          } else {
            console.error(`❌ HTTP error! status: ${this.status}`);
            console.error('Response:', this.responseText?.substring(0, 200));
            reject(new Error(`HTTP error! status: ${this.status}`));
          }
        } catch (error) {
          console.error('❌ YouTube Shorts API parse error:', error);
          console.error('Response text preview:', this.responseText?.substring(0, 500));
          reject(new Error('Failed to parse response: ' + error.message));
        }
      }
    });

    xhr.addEventListener('error', function(e) {
      console.error('❌ Network error:', e);
      reject(new Error('Network error'));
    });

    xhr.addEventListener('timeout', function() {
      console.error('❌ Request timed out');
      reject(new Error('Request timed out'));
    });

    const url = 'https://youtube-video-and-shorts-downloader.p.rapidapi.com/trending.php?type=now';
    console.log('📡 YouTube Shorts API URL:', url);
    
    xhr.open('GET', url);
    xhr.setRequestHeader('x-rapidapi-key', '44fc49fe73msh495642fa777e576p19ac8djsn97b9ccb8b6ff');
    xhr.setRequestHeader('x-rapidapi-host', 'youtube-video-and-shorts-downloader.p.rapidapi.com');
    xhr.timeout = 15000; // 15 second timeout
    
    console.log('📤 Sending YouTube Shorts request...');
    xhr.send(data);
  });
}

// Parse YouTube Shorts API response
function parseYouTubeShortsResponse(data) {
  const shorts = [];
  
  console.log('🔍 Parsing YouTube Shorts response, type:', typeof data, 'isArray:', Array.isArray(data));
  
  // Handle different possible response structures
  if (Array.isArray(data)) {
    console.log('📋 Response is array, length:', data.length);
    data.forEach(item => shorts.push(convertYouTubeShortToTweet(item)));
  } else if (data.data && Array.isArray(data.data)) {
    console.log('📋 Response has data array, length:', data.data.length);
    data.data.forEach(item => shorts.push(convertYouTubeShortToTweet(item)));
  } else if (data.results && Array.isArray(data.results)) {
    console.log('📋 Response has results array, length:', data.results.length);
    data.results.forEach(item => shorts.push(convertYouTubeShortToTweet(item)));
  } else if (data.videos && Array.isArray(data.videos)) {
    console.log('📋 Response has videos array, length:', data.videos.length);
    data.videos.forEach(item => shorts.push(convertYouTubeShortToTweet(item)));
  } else if (data.shorts && Array.isArray(data.shorts)) {
    console.log('📋 Response has shorts array, length:', data.shorts.length);
    data.shorts.forEach(item => shorts.push(convertYouTubeShortToTweet(item)));
  } else {
    console.warn('⚠️ Unknown YouTube Shorts response structure:', Object.keys(data));
    console.warn('Full response:', JSON.stringify(data).substring(0, 500));
  }

  console.log(`✅ Parsed ${shorts.length} YouTube Shorts`);
  return shorts;
}

// Convert YouTube Short to tweet-like format
function convertYouTubeShortToTweet(shortItem) {
  // Extract video ID from URL if present
  const videoId = shortItem.video_id || shortItem.id || 
                  (shortItem.url ? shortItem.url.match(/[?&]v=([^&]+)/)?.[1] : null) ||
                  (shortItem.link ? shortItem.link.match(/[?&]v=([^&]+)/)?.[1] : null);
  
  // Build YouTube URL
  const youtubeUrl = videoId ? `https://www.youtube.com/shorts/${videoId}` : 
                     shortItem.url || shortItem.link || shortItem.video_url || '#';
  
  // Extract channel name
  const channelName = shortItem.channel || shortItem.channel_name || shortItem.uploader || shortItem.author || 'YouTube Creator';
  
  return {
    author: channelName,
    handle: shortItem.channel_id ? `@${shortItem.channel_id}` : '@youtube',
    text: shortItem.title || shortItem.description || shortItem.name || 'YouTube Short',
    timestamp: shortItem.published_at || shortItem.upload_date || shortItem.date || new Date().toISOString(),
    link: youtubeUrl
  };
}

// Find ChatGPT text input field and its container using exact HTML structure
function findChatGPTInputField() {
  // Strategy 1: Look for the exact ProseMirror contenteditable div (primary method)
  // Based on HTML: div[contenteditable="true"][id="prompt-textarea"][class*="ProseMirror"]
  const proseMirror = document.querySelector('div[contenteditable="true"][id="prompt-textarea"], div.ProseMirror[contenteditable="true"], div[contenteditable="true"][id*="prompt"]');
  if (proseMirror && proseMirror.offsetParent !== null) {
    const rect = proseMirror.getBoundingClientRect();
    // Verify it's the main input (near bottom, reasonable size)
    if (rect.width > 400 && rect.bottom > window.innerHeight * 0.6) {
      const container = proseMirror.closest('form[class*="composer"]') || proseMirror.closest('form') || proseMirror.parentElement;
      console.log('✅ Found ProseMirror input:', {
        id: proseMirror.id,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
        bottom: rect.bottom
      });
      return { input: proseMirror, container };
    }
  }
  
  // Strategy 2: Look for form with composer class at bottom
  const composerForm = document.querySelector('form[class*="composer"], form.group\\/composer');
  if (composerForm) {
    const rect = composerForm.getBoundingClientRect();
    if (rect.bottom > window.innerHeight * 0.7 && rect.width > 400) {
      // Find contenteditable or textarea inside
      const input = composerForm.querySelector('div[contenteditable="true"], textarea');
      if (input && input.offsetParent !== null) {
        console.log('✅ Found input via composer form');
        return { input, container: composerForm };
      }
    }
  }
  
  // Strategy 3: Look for the prosemirror parent container
  const prosemirrorParent = document.querySelector('div[class*="prosemirror-parent"]');
  if (prosemirrorParent) {
    const input = prosemirrorParent.querySelector('div[contenteditable="true"], div.ProseMirror');
    if (input && input.offsetParent !== null) {
      const rect = input.getBoundingClientRect();
      if (rect.width > 400 && rect.bottom > window.innerHeight * 0.6) {
        console.log('✅ Found input via prosemirror-parent');
        return { input, container: prosemirrorParent.closest('form') || prosemirrorParent };
      }
    }
  }
  
  // Strategy 4: Fallback - look for any contenteditable div near bottom
  const contentEditables = Array.from(document.querySelectorAll('div[contenteditable="true"]'));
  const visible = contentEditables.filter(el => el.offsetParent !== null);
  if (visible.length > 0) {
    const sorted = visible
      .map(el => ({ input: el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom > window.innerHeight * 0.6 && rect.width > 400)
      .sort((a, b) => b.rect.bottom - a.rect.bottom);
    
    if (sorted.length > 0) {
      const { input } = sorted[0];
      console.log('✅ Found input via fallback (contenteditable)');
      return { input, container: input.closest('form') || input.parentElement };
    }
  }
  
  // Strategy 5: Fallback to textarea search
  const textareas = Array.from(document.querySelectorAll('textarea'));
  const visibleTextareas = textareas.filter(t => t.offsetParent !== null);
  if (visibleTextareas.length > 0) {
    const sorted = visibleTextareas
      .map(t => ({ input: t, rect: t.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom > window.innerHeight * 0.6 && rect.width > 400)
      .sort((a, b) => b.rect.bottom - a.rect.bottom);
    
    if (sorted.length > 0) {
      const { input } = sorted[0];
      console.log('✅ Found input via fallback (textarea)');
      return { input, container: input.closest('form') || input.parentElement };
    }
  }
  
  console.warn('⚠️ Could not find ChatGPT input field');
  return null;
}

// Position overlay above ChatGPT input field with animation
function updateOverlayPosition() {
  if (!overlayElement) return;

  const result = findChatGPTInputField();

  // Default overlay width
  const overlayWidth = 700;
  const maxWidth = Math.min(overlayWidth, window.innerWidth - 40);

  if (!result) {
    // Fallback to centered in viewport when input not found (textbox disappeared)
    overlayElement.style.position = 'fixed';
    overlayElement.style.bottom = '50%';
    overlayElement.style.left = '50%';
    overlayElement.style.right = 'auto';
    overlayElement.style.top = 'auto';
    overlayElement.style.width = `${maxWidth}px`;
    overlayElement.style.maxWidth = `${maxWidth}px`;
    overlayElement.style.transform = 'translate(-50%, 50%)';
    overlayElement.style.zIndex = '10000';
    console.log('⚠️ Input field not found, centering overlay in viewport');
    return;
  }

  const { input: inputField, container } = result;

  // Get the exact computed dimensions from getBoundingClientRect
  const inputRect = inputField.getBoundingClientRect();
  const containerRect = container ? container.getBoundingClientRect() : inputRect;

  // Use container width for better alignment with ChatGPT's design
  const targetWidth = Math.min(Math.max(containerRect.width, inputRect.width), overlayWidth);

  // Gap between overlay bottom and input top (24px for better spacing)
  const gapAbove = 24;

  // Calculate position: place overlay directly above input
  const inputTop = inputRect.top;

  // Center horizontally relative to input container
  const positionReference = containerRect.width > inputRect.width ? containerRect : inputRect;
  const centerLeft = positionReference.left + (positionReference.width / 2) - (targetWidth / 2);

  // Clamp to viewport with padding
  const clampedLeft = Math.max(20, Math.min(window.innerWidth - targetWidth - 20, centerLeft));

  // Position using bottom property for more reliable placement
  const viewportHeight = window.innerHeight;
  const bottomPosition = viewportHeight - inputTop + gapAbove;

  // Check if overlay would be off-screen at the top
  const overlayHeight = overlayElement.offsetHeight || 500;
  const topPosition = viewportHeight - bottomPosition - overlayHeight;

  if (topPosition < 20) {
    // Overlay would be off-screen, center it in viewport instead
    overlayElement.style.position = 'fixed';
    overlayElement.style.bottom = '50%';
    overlayElement.style.left = '50%';
    overlayElement.style.right = 'auto';
    overlayElement.style.top = 'auto';
    overlayElement.style.width = `${targetWidth}px`;
    overlayElement.style.maxWidth = `${targetWidth}px`;
    overlayElement.style.transform = 'translate(-50%, 50%)';
    overlayElement.style.zIndex = '10000';
    console.log('⚠️ Overlay would be off-screen, centering in viewport');
  } else {
    // Normal positioning above input
    overlayElement.style.position = 'fixed';
    overlayElement.style.bottom = `${bottomPosition}px`;
    overlayElement.style.left = `${clampedLeft}px`;
    overlayElement.style.width = `${targetWidth}px`;
    overlayElement.style.maxWidth = `${targetWidth}px`;
    overlayElement.style.top = 'auto';
    overlayElement.style.right = 'auto';
    overlayElement.style.transform = 'translateY(0)';
    overlayElement.style.zIndex = '10000';

    console.log('✅ Positioned overlay above input:', {
      bottom: bottomPosition,
      left: clampedLeft,
      width: targetWidth,
      inputTop: inputRect.top,
      gapAbove: gapAbove
    });
  }
}

// Create overlay element with ChatGPT input field styling
function createOverlay() {
  if (overlayElement) {
    updateOverlayPosition();
    return overlayElement;
  }

  const overlay = document.createElement('div');
  overlay.id = 'tweet-overlay';
  overlay.setAttribute('role', 'complementary');
  overlay.setAttribute('aria-label', 'Content feed');
  overlay.className = isMinimized ? 'minimized' : '';

  // Match ChatGPT's native dark theme colors and styling
  overlay.style.cssText = `
    position: fixed;
    width: 600px;
    max-width: 700px;
    max-height: 500px;
    background: #2f2f2f;
    color: #ececec;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28), 0 0 1px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    display: none;
    z-index: 10000;
    font-family: 'Söhne', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-weight: 400;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    transform: translateY(10px);
    flex-direction: column;
    pointer-events: auto;
    box-sizing: border-box;
  `;
  
  // Insert into page body and update position
  document.body.appendChild(overlay);
  updateOverlayPosition();

  // Top progress / activity bar
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    height: 3px;
    width: 100%;
    background: linear-gradient(90deg, transparent, rgba(16, 163, 127, 0.7), transparent);
    background-size: 200% 100%;
    animation: progressSlide 2s ease-in-out infinite;
  `;
  overlay.appendChild(progressBar);

  // Add CSS animation for progress bar
  const style = document.createElement('style');
  style.textContent = `
    @keyframes progressSlide {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  if (!document.querySelector('style[data-progress-animation]')) {
    style.setAttribute('data-progress-animation', 'true');
    document.head.appendChild(style);
  }

  const header = document.createElement('div');
  header.className = 'tweet-overlay-header';
  header.setAttribute('role', 'banner');
  header.style.cssText = `
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    background: transparent;
    gap: 12px;
  `;

  // Create navbar instead of title
  const navbar = createNavbar();

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; align-items: center; gap: 4px; flex-shrink: 0; margin-left: auto;';

  const minimizeBtn = document.createElement('button');
  minimizeBtn.className = 'tweet-overlay-minimize';
  minimizeBtn.setAttribute('aria-label', isMinimized ? 'Expand' : 'Minimize');
  minimizeBtn.textContent = isMinimized ? '↑' : '↓';
  minimizeBtn.setAttribute('tabindex', '0');
  minimizeBtn.style.cssText = `
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: all 0.15s ease;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-weight: 600;
  `;
  minimizeBtn.addEventListener('mouseenter', () => {
    minimizeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    minimizeBtn.style.color = 'rgba(255, 255, 255, 0.95)';
  });
  minimizeBtn.addEventListener('mouseleave', () => {
    minimizeBtn.style.background = 'transparent';
    minimizeBtn.style.color = 'rgba(255, 255, 255, 0.65)';
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'tweet-overlay-close';
  closeBtn.setAttribute('aria-label', 'Close overlay');
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('tabindex', '0');
  closeBtn.style.cssText = `
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: all 0.15s ease;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-weight: 600;
  `;
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    closeBtn.style.color = 'rgba(255, 255, 255, 0.95)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = 'rgba(255, 255, 255, 0.65)';
  });

  buttonContainer.appendChild(minimizeBtn);
  buttonContainer.appendChild(closeBtn);
  header.appendChild(navbar);
  header.appendChild(buttonContainer);

  const container = document.createElement('div');
  container.className = 'tweet-overlay-container';
  container.setAttribute('role', 'main');
  container.style.cssText = `
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    margin: 12px 16px;
    padding: 16px;
    min-height: 200px;
  `;

  // Add "News Articles" label
  const articlesLabel = document.createElement('div');
  articlesLabel.textContent = 'Related Content';
  articlesLabel.style.cssText = `
    color: #f5f5f7;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.7;
    font-family: "Söhne", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  const content = document.createElement('div');
  content.className = 'tweet-overlay-content';
  content.id = 'tweet-content';
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  container.appendChild(articlesLabel);
  container.appendChild(content);
  overlay.appendChild(header);
  overlay.appendChild(container);

  // Event handlers
  minimizeBtn.addEventListener('click', toggleMinimize);
  minimizeBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMinimize();
    }
  });

  closeBtn.addEventListener('click', hideOverlay);
  closeBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      hideOverlay();
    }
  });

  // Keyboard navigation
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      hideOverlay();
    }
  });

  overlayElement = overlay;
  
  // Update position when window resizes or scrolls
  const updatePosition = () => updateOverlayPosition();
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, { passive: true });
  
  // Watch for input field position changes
  const positionObserver = new MutationObserver(updatePosition);
  positionObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
  
  return overlay;
}

// Show overlay with tweets
async function showOverlay(query = null) {
  console.log('📱 showOverlay called with query:', query);
  const overlay = createOverlay();
  
  // Ensure overlay is in the DOM
  if (!document.body.contains(overlay)) {
    console.log('⚠️ Overlay not in DOM, appending...');
    document.body.appendChild(overlay);
  }
  
  const content = overlay.querySelector('#tweet-content');
  
  if (!content) {
    console.error('❌ No content element found');
    return;
  }

  console.log('✅ Overlay created, showing...');

  // Update position before showing
  updateOverlayPosition();
  
  // Show loading state based on current tab
  const tabNames = { news: 'news', twitter: 'tweets', youtube: 'shorts' };
  content.innerHTML = `<div class="tweet-loading"><span>Loading ${tabNames[currentTab]}...</span></div>`;
  
  // Make overlay visible with smooth animation
  overlay.style.setProperty('display', 'flex', 'important');
  overlay.style.setProperty('visibility', 'visible', 'important');
  overlay.style.zIndex = '10000';
  
  // Verify position is set
  if (!overlay.style.top || overlay.style.top === '0px' || overlay.style.top === 'auto') {
    console.warn('⚠️ Overlay position not set, using fallback');
    overlay.style.top = `${window.innerHeight * 0.3}px`;
    overlay.style.left = '50%';
    overlay.style.transform = 'translateX(-50%)';
  }
  
  // Smooth slide-up animation from below
  overlay.style.opacity = '0';
  overlay.style.transform = 'translateY(20px)';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'translateY(0)';
      console.log('✅ Overlay animated in:', {
        bottom: overlay.style.bottom,
        left: overlay.style.left,
        width: overlay.style.width,
        opacity: overlay.style.opacity,
        display: overlay.style.display,
        visibility: overlay.style.visibility
      });
    });
  });
  
  // Don't minimize initially - let it show fully
  overlay.classList.remove('minimized');
  isMinimized = false;
  
  // Force header to be visible
  const header = overlay.querySelector('.tweet-overlay-header');
  if (header) {
    header.style.display = 'flex';
    header.style.visibility = 'visible';
  }
  
  // Update minimize button
  const minimizeBtn = overlay.querySelector('.tweet-overlay-minimize');
  if (minimizeBtn) {
    minimizeBtn.setAttribute('aria-label', 'Minimize');
    minimizeBtn.textContent = '↓';
  }
  
  console.log('✅ Overlay displayed with animation');
  
  // Force visibility - ensure it's actually visible
  overlay.style.setProperty('display', 'flex', 'important');
  overlay.style.setProperty('visibility', 'visible', 'important');
  overlay.style.zIndex = '10000';
  
  // Log computed styles for debugging
  setTimeout(() => {
    const computed = window.getComputedStyle(overlay);
    console.log('📊 Overlay computed styles:', {
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      position: computed.position,
      top: computed.top,
      left: computed.left,
      width: computed.width,
      height: computed.height,
      zIndex: computed.zIndex,
      transform: computed.transform,
      backgroundColor: computed.backgroundColor
    });
    
    // Log bounding rect
    const rect = overlay.getBoundingClientRect();
    console.log('📐 Overlay bounding rect:', {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0
    });
  }, 100);

  // Load content for current tab
  await loadTabContent(currentTab);
}

// Hide overlay gracefully
function hideOverlay() {
  if (!overlayElement) return;

  overlayElement.style.opacity = '0';
  overlayElement.style.transform = 'scale(0.9)';

  setTimeout(() => {
    if (overlayElement) {
      overlayElement.style.display = 'none';
    }
  }, 300);
}

// Minimize to bottom-right bubble
function minimizeToBubble() {
  if (!overlayElement || currentState === 'MINIMIZED') return;

  console.log('🧞 Minimizing to bubble...');
  currentState = 'MINIMIZED';

  // Fade out overlay
  overlayElement.style.transition = 'all 0.3s ease';
  overlayElement.style.opacity = '0';
  overlayElement.style.transform = 'scale(0.9)';

  setTimeout(() => {
    overlayElement.style.display = 'none';

    // Create bubble if it doesn't exist
    let bubble = document.getElementById('genie-bubble');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.id = 'genie-bubble';
      bubble.innerHTML = '📰';
      bubble.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        cursor: pointer;
        background: #2f2f2f;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.3s ease;
      `;

      bubble.addEventListener('click', (e) => {
        e.stopPropagation();
        expandFromBubble();
      });

      bubble.addEventListener('mouseenter', () => {
        bubble.style.transform = 'scale(1.1)';
        bubble.style.borderColor = 'rgba(255, 255, 255, 0.4)';
      });

      bubble.addEventListener('mouseleave', () => {
        bubble.style.transform = 'scale(1)';
        bubble.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      });

      document.body.appendChild(bubble);
    }

    // Fade in bubble
    requestAnimationFrame(() => {
      bubble.style.opacity = '1';
      bubble.style.transform = 'scale(1)';
    });
  }, 300);
}

// Expand from bubble
function expandFromBubble() {
  console.log('🧞 Expanding from bubble...');

  const bubble = document.getElementById('genie-bubble');
  if (bubble) {
    bubble.style.opacity = '0';
    setTimeout(() => bubble.remove(), 300);
  }

  currentState = 'GENERATING'; // Keep in generating state

  // Show overlay
  if (overlayElement) {
    overlayElement.style.display = 'flex';
    overlayElement.style.opacity = '0';
    overlayElement.style.transform = 'scale(0.9)';

    requestAnimationFrame(() => {
      overlayElement.style.transition = 'all 0.3s ease';
      overlayElement.style.opacity = '1';
      overlayElement.style.transform = 'translateY(0)';
    });
  }
}

// Remove bubble completely
function removeBubble() {
  const bubble = document.getElementById('genie-bubble');
  if (bubble) {
    bubble.style.opacity = '0';
    setTimeout(() => bubble.remove(), 300);
  }
}

// Main state handler - REBUILT FROM SCRATCH
const handleThinkingState = debounce(async () => {
  const thinking = detectThinkingState();
  const generating = detectTextGenerating();
  const textboxVisible = !!findChatGPTInputField();

  console.log('🔍 State:', {
    current: currentState,
    thinking,
    generating,
    textboxVisible,
    hasOverlay: !!overlayElement
  });

  // STATE MACHINE - Simple and clear
  switch (currentState) {
    case 'IDLE':
      // IDLE → THINKING: ChatGPT starts thinking
      if (thinking) {
        console.log('🧠 ChatGPT thinking → Show overlay');
        currentState = 'THINKING';
        lastUserPrompt = extractLastUserPrompt();

        if (overlayElement) {
          updateOverlayPosition();
        }

        await showOverlay(lastUserPrompt || null);
      }
      break;

    case 'THINKING':
      // THINKING → GENERATING: Text starts appearing
      if (generating) {
        console.log('✨ Text generating → Minimize to bubble');
        currentState = 'GENERATING';
        minimizeToBubble();
      }
      // THINKING → IDLE: Stopped thinking without generating
      else if (!thinking) {
        console.log('❌ Stopped thinking → Close overlay');
        currentState = 'IDLE';
        hideOverlay();
      }
      break;

    case 'GENERATING':
      // GENERATING → IDLE: Response complete, textbox returns
      if (textboxVisible && !generating) {
        console.log('✅ Generation complete → Remove bubble');
        currentState = 'IDLE';
        removeBubble();
        hideOverlay();
      }
      break;

    case 'MINIMIZED':
      // MINIMIZED → IDLE: User finished, textbox returns
      if (textboxVisible && !generating) {
        console.log('✅ User done → Remove bubble');
        currentState = 'IDLE';
        removeBubble();
      }
      // MINIMIZED → THINKING: New request while minimized
      else if (thinking && !generating) {
        console.log('🔄 New request → Show overlay');
        currentState = 'THINKING';
        removeBubble();
        lastUserPrompt = extractLastUserPrompt();
        await showOverlay(lastUserPrompt || null);
      }
      break;
  }

  // Update overlay position if showing
  if (overlayElement && overlayElement.style.display !== 'none' && currentState === 'THINKING') {
    updateOverlayPosition();
  }
}, 100); // Reduced to 100ms for faster response

// Main mutation observer
function startObserver() {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver(() => {
    handleThinkingState();
    
    // Also update last prompt on mutations
    const newPrompt = extractLastUserPrompt();
    if (newPrompt && newPrompt !== lastUserPrompt) {
      lastUserPrompt = newPrompt;
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-message-author-role', 'data-thinking', 'data-streaming']
  });

  // Initial check
  handleThinkingState();
}

// Initialize
function init() {
  // Check if we're on ChatGPT
  if (!window.location.hostname.includes('chat.openai.com') && 
      !window.location.hostname.includes('chatgpt.com')) {
    return;
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  // Periodic check as fallback (faster for immediate detection)
  setInterval(() => {
    handleThinkingState();
  }, 200);

  // testNewsAPI is already exposed at top level
  console.log('✅ Extension initialized.');
  console.log('💡 Test functions available:');
  console.log('   - window.testNewsAPI() - Test the API');
  console.log('   - window.showNewsOverlay("query") - Manually show overlay');
  console.log('   - window.forceShowOverlay() - Force show overlay for debugging');
  console.log('   - Check thinking state:', detectThinkingState());
  
  // Also check if input field can be found
  const inputResult = findChatGPTInputField();
  console.log('🔍 Input field detection:', inputResult ? 'Found' : 'Not found');
  if (inputResult) {
    const rect = inputResult.input.getBoundingClientRect();
    console.log('   Input position:', { top: rect.top, left: rect.left, width: rect.width });
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
  });
}

// Start
init();
