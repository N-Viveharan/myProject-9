import {
  useState, useEffect, useRef, useCallback, useId,
} from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css';

/* ── Constants ───────────────────────────────────────────────── */
const DEBOUNCE_MS      = 320;
const MAX_HISTORY      = 6;
const MAX_SUGGESTIONS  = 6;
const HISTORY_KEY      = 'foodie_search_history';

const TRENDING = [
  { label: 'Butter Chicken',  icon: '🍗' },
  { label: 'Margherita Pizza',icon: '🍕' },
  { label: 'Vegan Bowls',     icon: '🌱' },
  { label: 'Sushi Platter',   icon: '🍣' },
  { label: 'Chocolate Lava',  icon: '🍫' },
];

/* ── Highlight matching substring ────────────────────────────── */
function HighlightedText({ text = '', query = '' }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ── Local-storage history helpers ───────────────────────────── */
const getHistory  = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
};
const saveHistory = (q) => {
  const prev = getHistory().filter((h) => h.toLowerCase() !== q.toLowerCase());
  localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...prev].slice(0, MAX_HISTORY)));
};
const clearHistory = () => localStorage.removeItem(HISTORY_KEY);

/* ── Component ───────────────────────────────────────────────── */

/**
 * SearchBar
 *
 * Props:
 *   onSearch      {fn(query)}         — called on submit / suggestion click
 *   fetchSuggestions {fn(q) => Promise<Product[]>} — live search API call
 *   placeholder   {string}
 *   initialValue  {string}            — pre-fill (e.g. from URL params)
 *   size          {'sm'|'md'|'lg'}    — default 'md'
 *   showButton    {boolean}           — show Search button (default true)
 *   autoFocus     {boolean}
 *   className     {string}
 */
export default function SearchBar({
  onSearch,
  fetchSuggestions,
  placeholder    = 'Search dishes, cuisines, restaurants…',
  initialValue   = '',
  size           = 'md',
  showButton     = true,
  autoFocus      = false,
  className      = '',
}) {
  const navigate = useNavigate();
  const inputId  = useId();

  const [query,        setQuery]        = useState(initialValue);
  const [suggestions,  setSuggestions]  = useState([]);
  const [history,      setHistory]      = useState(getHistory);
  const [loading,      setLoading]      = useState(false);
  const [open,         setOpen]         = useState(false);
  const [focusedIdx,   setFocusedIdx]   = useState(-1);

  const inputRef   = useRef(null);
  const dropdownRef= useRef(null);
  const debounceRef= useRef(null);

  /* ── Derived dropdown items list ────────────────────────────── */
  // When query is empty → show history + trending
  // When query present  → show API suggestions
  const showingSuggestions = query.trim().length > 0;

  /* ── Debounced fetch ────────────────────────────────────────── */
  useEffect(() => {
    if (!query.trim() || !fetchSuggestions) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(query.trim());
        setSuggestions((results || []).slice(0, MAX_SUGGESTIONS));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  /* ── Open/close on focus ────────────────────────────────────── */
  const handleFocus = () => setOpen(true);
  const handleClose = useCallback(() => {
    setOpen(false);
    setFocusedIdx(-1);
  }, []);

  /* ── Submit ─────────────────────────────────────────────────── */
  const handleSubmit = useCallback((q = query) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveHistory(trimmed);
    setHistory(getHistory());
    handleClose();
    if (onSearch) {
      onSearch(trimmed);
    } else {
      navigate(`/products?search=${encodeURIComponent(trimmed)}`);
    }
  }, [query, onSearch, navigate, handleClose]);

  /* ── Suggestion click ───────────────────────────────────────── */
  const handleSuggestionClick = useCallback((product) => {
    handleClose();
    navigate(`/products/${product._id}`);
  }, [navigate, handleClose]);

  /* ── Trending / history click ───────────────────────────────── */
  const handleQuickSearch = useCallback((label) => {
    setQuery(label);
    handleSubmit(label);
  }, [handleSubmit]);

  /* ── Clear history ───────────────────────────────────────────── */
  const handleClearHistory = (e) => {
    e.stopPropagation();
    clearHistory();
    setHistory([]);
  };

  /* ── Keyboard navigation ────────────────────────────────────── */
  const allItems = showingSuggestions
    ? suggestions
    : [...history.map((h) => ({ _history: true, name: h })), ...TRENDING.map((t) => ({ _trending: true, name: t.label, icon: t.icon }))];

  const handleKeyDown = (e) => {
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return; }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, allItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIdx >= 0 && allItems[focusedIdx]) {
          const item = allItems[focusedIdx];
          if (item._id) {
            handleSuggestionClick(item);
          } else {
            handleQuickSearch(item.name);
          }
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        handleClose();
        inputRef.current?.blur();
        break;
      case 'Tab':
        handleClose();
        break;
      default:
        break;
    }
  };

  /* ── Input change ────────────────────────────────────────────── */
  const handleChange = (e) => {
    setQuery(e.target.value);
    setFocusedIdx(-1);
    if (!open) setOpen(true);
  };

  /* ── Clear input ────────────────────────────────────────────── */
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setFocusedIdx(-1);
    inputRef.current?.focus();
  };

  const isOpen = open && (
    query.trim().length > 0
      ? (loading || suggestions.length > 0)
      : (history.length > 0 || TRENDING.length > 0)
  );

  return (
    <>
      {/* Overlay to close dropdown on outside click */}
      {isOpen && (
        <div
          className="search-bar__overlay"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      <div
        className={[
          'search-bar',
          size !== 'md' ? `search-bar--${size}` : '',
          className,
        ].filter(Boolean).join(' ')}
        role="search"
      >
        {/* ── Input shell ─────────────────────────────────── */}
        <div className="search-bar__shell">

          {/* Icon / Spinner */}
          <div className="search-bar__icon-wrap" aria-hidden="true">
            {loading
              ? <div className="search-bar__spinner" />
              : <span>🔍</span>
            }
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            className="search-bar__input"
            placeholder={placeholder}
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            aria-label="Search"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={isOpen ? 'search-dropdown' : undefined}
            aria-activedescendant={
              focusedIdx >= 0 ? `search-item-${focusedIdx}` : undefined
            }
            role="combobox"
          />

          {/* Clear button */}
          {query && (
            <button
              className="search-bar__clear"
              onClick={handleClear}
              type="button"
              aria-label="Clear search"
              tabIndex={-1}
            >
              ✕
            </button>
          )}

          {/* Submit button */}
          {showButton && (
            <button
              className="search-bar__submit"
              onClick={() => handleSubmit()}
              type="button"
              aria-label="Search"
            >
              <span>Search</span>
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>

        {/* ── Dropdown ────────────────────────────────────── */}
        {isOpen && (
          <div
            id="search-dropdown"
            className="search-bar__dropdown"
            ref={dropdownRef}
            role="listbox"
            aria-label="Search suggestions"
          >

            {/* ── Live results ─────────────────────────────── */}
            {showingSuggestions && (
              <>
                {suggestions.length > 0 ? (
                  <>
                    <div className="search-bar__section-title">
                      Results
                    </div>

                    {suggestions.map((product, idx) => (
                      <button
                        key={product._id}
                        id={`search-item-${idx}`}
                        className={[
                          'search-bar__item',
                          focusedIdx === idx ? 'search-bar__item--focused' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleSuggestionClick(product)}
                        role="option"
                        aria-selected={focusedIdx === idx}
                      >
                        {/* Thumbnail */}
                        <div className="search-bar__item-thumb">
                          {product.image
                            ? <img src={product.image} alt="" loading="lazy" onError={(e) => { e.target.style.display='none'; }} />
                            : <span>🍽️</span>
                          }
                        </div>

                        {/* Name + category */}
                        <div className="search-bar__item-text">
                          <div className="search-bar__item-name">
                            <HighlightedText text={product.name} query={query} />
                          </div>
                          {product.category && (
                            <div className="search-bar__item-sub">{product.category}</div>
                          )}
                        </div>

                        {/* Price */}
                        {product.price && (
                          <span className="search-bar__item-badge">
                            ₹{Number(product.price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </button>
                    ))}

                    {/* View all results */}
                    <div className="search-bar__dropdown-footer">
                      <button
                        className="search-bar__view-all"
                        onClick={() => handleSubmit()}
                      >
                        <span>View all results for "{query}"</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </>
                ) : !loading ? (
                  /* No results */
                  <div className="search-bar__empty">
                    <span className="search-bar__empty-icon" aria-hidden="true">🍽️</span>
                    <div className="search-bar__empty-title">No results found</div>
                    <div>Try searching for "pizza" or "burger"</div>
                  </div>
                ) : null}
              </>
            )}

            {/* ── Empty state: history + trending ──────────── */}
            {!showingSuggestions && (
              <>
                {/* Recent searches */}
                {history.length > 0 && (
                  <>
                    <div className="search-bar__section-title">
                      Recent
                      <button
                        className="search-bar__section-clear"
                        onClick={handleClearHistory}
                        type="button"
                        aria-label="Clear search history"
                      >
                        Clear
                      </button>
                    </div>

                    {history.map((item, idx) => {
                      const itemIdx = idx;
                      return (
                        <button
                          key={item}
                          id={`search-item-${itemIdx}`}
                          className={[
                            'search-bar__item',
                            focusedIdx === itemIdx ? 'search-bar__item--focused' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => handleQuickSearch(item)}
                          role="option"
                          aria-selected={focusedIdx === itemIdx}
                        >
                          <div className="search-bar__item-icon" aria-hidden="true">🕐</div>
                          <div className="search-bar__item-text">
                            <div className="search-bar__item-name">{item}</div>
                          </div>
                        </button>
                      );
                    })}

                    <div className="search-bar__divider" aria-hidden="true" />
                  </>
                )}

                {/* Trending */}
                <div className="search-bar__section-title">
                  Trending 🔥
                </div>

                {TRENDING.map((trend, idx) => {
                  const itemIdx = history.length + idx;
                  return (
                    <button
                      key={trend.label}
                      id={`search-item-${itemIdx}`}
                      className={[
                        'search-bar__item',
                        focusedIdx === itemIdx ? 'search-bar__item--focused' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleQuickSearch(trend.label)}
                      role="option"
                      aria-selected={focusedIdx === itemIdx}
                    >
                      <div className="search-bar__item-icon" aria-hidden="true">
                        {trend.icon}
                      </div>
                      <div className="search-bar__item-text">
                        <div className="search-bar__item-name">{trend.label}</div>
                      </div>
                      <span className="search-bar__trending-tag" aria-hidden="true">
                        trending
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {/* Keyboard hint */}
            {allItems.length > 1 && (
              <div className="search-bar__kbd-hint" aria-hidden="true">
                <kbd className="search-bar__kbd">↑</kbd>
                <kbd className="search-bar__kbd">↓</kbd>
                <span>to navigate</span>
                <kbd className="search-bar__kbd">↵</kbd>
                <span>to select</span>
                <kbd className="search-bar__kbd">Esc</kbd>
                <span>to close</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}