import './App.css';
import { useCallback, useEffect, useMemo, useState } from 'react';

const IMAGE_SUFFIXES = ['png', 'jpg', 'jpeg'];

const ensureAbsoluteUrl = (rawUrl) => {
  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl).toString();
  } catch (error) {
    try {
      return new URL(`https://${rawUrl}`).toString();
    } catch (nestedError) {
      return null;
    }
  }
};

const extractImageLinks = (htmlText, baseUrl) => {
  const parser = new DOMParser();
  const document = parser.parseFromString(htmlText, 'text/html');
  const anchors = Array.from(document.querySelectorAll('a[href]'));
  const base = new URL(baseUrl);

  const resolvedUrls = anchors
    .map((anchor) => {
      try {
        return new URL(anchor.getAttribute('href'), base);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .filter((url) => {
      const pathname = url.pathname.toLowerCase();
      return IMAGE_SUFFIXES.some((suffix) => pathname.endsWith(`.${suffix}`));
    })
    .map((url) => url.toString());

  return Array.from(new Set(resolvedUrls));
};

function App() {
  const [urlInput, setUrlInput] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedImage = useMemo(
    () => (imageUrls.length ? imageUrls[selectedIndex] : null),
    [imageUrls, selectedIndex],
  );

  const handlePrev = useCallback(() => {
    setSelectedIndex((current) => (current > 0 ? current - 1 : current));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex((current) =>
      current < imageUrls.length - 1 ? current + 1 : current,
    );
  }, [imageUrls.length]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!imageUrls.length) {
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        handlePrev();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, imageUrls.length]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedUrl = ensureAbsoluteUrl(urlInput.trim());

    if (!normalizedUrl) {
      setError('Enter a valid URL (include protocol or a valid domain).');
      setImageUrls([]);
      setSelectedIndex(0);
      return;
    }

    setLoading(true);
    setError('');
    setImageUrls([]);
    setSelectedIndex(0);

    try {
      const response = await fetch(normalizedUrl);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const htmlText = await response.text();
      const links = extractImageLinks(htmlText, normalizedUrl);
      setImageUrls(links);

      if (!links.length) {
        setError('No image links found on this page.');
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to fetch the provided URL.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <form className="url-form" onSubmit={handleSubmit}>
          <input
            className="url-input"
            type="text"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            placeholder="Enter a page URL (e.g. https://example.com)"
            aria-label="Page URL"
            disabled={loading}
          />
          <button className="apply-button" type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Apply'}
          </button>
        </form>
        <div className="status-area">
          {loading && <span className="status-message">Fetching links…</span>}
          {!loading && error && (
            <span className="status-message error-message">{error}</span>
          )}
          {!loading && !error && imageUrls.length > 0 && (
            <span className="status-message">
              Found {imageUrls.length} image
              {imageUrls.length === 1 ? '' : 's'}.
            </span>
          )}
        </div>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <h2 className="sidebar-title">Image Links</h2>
          <ul className="image-list">
            {imageUrls.map((link, index) => (
              <li
                key={link}
                className={`image-list-item${
                  index === selectedIndex ? ' selected' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className="image-list-button"
                  aria-current={index === selectedIndex}
                >
                  {link}
                </button>
              </li>
            ))}
            {!imageUrls.length && !loading && !error && (
              <li className="image-list-empty">No images to display.</li>
            )}
          </ul>
        </aside>
        <main className="viewer">
          {selectedImage ? (
            <div className="viewer-content">
              <div className="viewer-controls">
                <button
                  type="button"
                  className="nav-button"
                  onClick={handlePrev}
                  disabled={selectedIndex === 0}
                  aria-label="Previous image"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="nav-button"
                  onClick={handleNext}
                  disabled={selectedIndex === imageUrls.length - 1}
                  aria-label="Next image"
                >
                  ↓
                </button>
              </div>
              <div className="image-wrapper">
                <img src={selectedImage} alt="Selected from the page" />
              </div>
              <a
                className="image-link"
                href={selectedImage}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open image in new tab
              </a>
            </div>
          ) : (
            <div className="viewer-empty">
              {loading
                ? 'Loading image preview…'
                : 'Load a page with image links to preview.'}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
