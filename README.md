# Tweet Cards for ChatGPT

A browser extension that displays relevant tweet cards while ChatGPT is generating responses. Stay informed with real-time social media insights related to your conversation.

## Features

- 🐦 **Automatic Tweet Display**: Shows relevant tweets when ChatGPT starts "thinking"
- 🔍 **Smart Query Extraction**: Uses your last prompt to find relevant tweets
- 💾 **Intelligent Caching**: In-memory cache reduces API calls (5-minute TTL)
- ⚡ **Performance Optimized**: Debounced requests, single MutationObserver, efficient DOM watching
- ♿ **Accessibility First**: ARIA roles, keyboard navigation, high contrast support, reduced motion
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🌙 **Dark Mode**: Automatic dark mode support
- 🎛️ **Minimized State**: Compact pill view when minimized
- 🔄 **Error Handling**: Graceful fallbacks for network errors and rate limits

## Installation

1. Clone this repository
   ```bash
   git clone <repository-url>
   cd ShortsGPT
   ```

2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)

3. Enable "Developer mode" (toggle in top-right)

4. Click "Load unpacked" and select the `shorts-gpt-extension` folder

5. The extension is now active! Visit [ChatGPT](https://chat.openai.com) to use it.

## Usage

1. **Automatic Activation**: Start a conversation in ChatGPT. When ChatGPT begins generating a response, relevant tweets will automatically appear in a floating overlay (bottom-right).

2. **Interact with Tweets**:
   - Click any tweet card to open it on X/Twitter
   - Use keyboard navigation (Tab, Enter/Space)
   - Press `Escape` to close the overlay

3. **Minimize/Expand**:
   - Click the minimize button (↓) to collapse to a compact pill
   - Click again (↑) to expand

4. **Manual Close**:
   - Click the close button (×) or press `Escape`

The overlay automatically hides 2 seconds after ChatGPT finishes generating, unless you've interacted with it.

## API Configuration

The extension currently uses **mock data** for demonstration. To use real tweet data:

### Option 1: RapidAPI Twitter API
1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to a Twitter API (e.g., "Twitter API v2")
3. Add your API key to `content.js`:
   ```javascript
   API_CONFIG.apiKey = 'your-api-key-here';
   API_CONFIG.endpoint = 'https://twitter-api-v2.p.rapidapi.com/search';
   ```

### Option 2: SerpAPI
1. Get an API key from [SerpAPI](https://serpapi.com/)
2. Update the endpoint and headers in `content.js`

### Option 3: X API (formerly Twitter API)
1. Apply for developer access at [developer.twitter.com](https://developer.twitter.com/)
2. Configure OAuth 2.0 or Bearer token authentication
3. Update the API endpoint accordingly

## Technical Details

### Architecture
- **Manifest V3** compliant
- **Content Script** injection (no background page needed)
- **Single MutationObserver** for efficient DOM watching
- **Debounced requests** (300ms) to prevent excessive API calls
- **In-memory cache** with 5-minute TTL

### Performance Optimizations
- Throttled DOM observations
- Query result caching
- Lazy overlay creation
- Disconnected observer on page unload
- Respects `prefers-reduced-motion`

### Accessibility Features
- ARIA roles (`complementary`, `article`, `banner`)
- Keyboard navigation (Tab, Enter, Space, Escape)
- Focus indicators
- High contrast mode support
- Screen reader friendly
- Reduced motion animations

### Permissions
- `activeTab`: Required for content script injection
- `scripting`: Required for MV3 compatibility
- Host permissions: `https://chat.openai.com/*`, `https://chatgpt.com/*`

## File Structure

```
shorts-gpt-extension/
├── manifest.json       # Extension manifest (MV3)
├── content.js          # Core logic, API calls, DOM observation
├── styles.css          # Styles for overlay, cards, accessibility
└── icon.png            # Extension icon
```

## Browser Compatibility

- Chrome 88+ (Manifest V3)
- Edge 88+ (Manifest V3)
- Other Chromium-based browsers supporting MV3

## Privacy

- All API calls are made directly from the content script
- No data is stored or transmitted to third-party servers (except the tweet API)
- Query cache is stored locally in memory (cleared on page reload)
- No tracking or analytics

## Troubleshooting

### Tweets not appearing
1. Check browser console for errors (`F12` → Console)
2. Verify API key is configured (if using real API)
3. Check network tab for failed API requests

### Overlay not showing during "thinking"
1. Refresh the ChatGPT page
2. Check if extension is enabled in `chrome://extensions/`
3. Verify you're on `chat.openai.com` or `chatgpt.com`

### Performance issues
1. The extension uses efficient observers, but very active pages may slow down
2. Reduce cache TTL in `content.js` if memory is a concern
3. Check browser DevTools Performance tab

## Contributing

Contributions welcome! Areas for improvement:
- Additional tweet API integrations
- Better query extraction algorithms
- Enhanced error handling
- More customization options

## License

[Your License Here]

## Credits

Built with Manifest V3, designed for accessibility and performance.
