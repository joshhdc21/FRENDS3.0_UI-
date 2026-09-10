import { useEffect, useState } from "react";

// =====================================================
// GNEWS CONFIGURATION
// =====================================================

const GNEWS_API_KEY =
  import.meta.env.VITE_GNEWS_API_KEY ||
  "193c9fd1bfd5d5af48ff44210ad2b923";

// =====================================================
// NEWS CACHE CONFIGURATION
// =====================================================

// GNews will only be requested once every 12 hours.
const NEWS_REFRESH_INTERVAL = 12 * 60 * 60 * 1000;

// Local storage keys
const NEWS_STORAGE_KEY = "frends_weather_news";
const NEWS_TIMESTAMP_KEY = "frends_weather_news_timestamp";

// =====================================================
// EMERGENCY HOTLINES
// =====================================================

const EMERGENCY_HOTLINES = [
  {
    name: "National Emergency",
    number: "911",
    tel: "911",
    icon: "🚨",
    desc: "Police, Fire, Medical & Disaster Response",
  },
  {
    name: "MMDA / Road Emergency",
    number: "136",
    tel: "136",
    icon: "🚗",
    desc: "Metro Manila Road & Traffic Assistance",
  },
  {
    name: "Philippine Red Cross",
    number: "143",
    tel: "143",
    icon: "🏥",
    desc: "Medical & Rescue Assistance",
  },
  {
    name: "Fire Department",
    number: "911",
    tel: "911",
    icon: "🔥",
    desc: "Fire & Rescue Emergency Assistance",
  },
];

// =====================================================
// TRUSTED PHILIPPINE SOURCES
// =====================================================

const TRUSTED_SOURCES = [
  "PAGASA",
  "GMA News",
  "GMA",
  "ABS-CBN",
  "Inquirer",
  "Philstar",
  "The Philippine Star",
  "Manila Bulletin",
  "Rappler",
  "CNN Philippines",
  "Manila Standard",
  "Philippine News Agency",
  "PNA",
  "Manila Times",
  "SunStar",
  "BusinessWorld",
  "Daily Tribune",
  "Philippine Daily Inquirer",
];

// =====================================================
// PHILIPPINE LOCATIONS
// =====================================================

const PHILIPPINE_LOCATIONS = [
  "Philippines",
  "Philippine",
  "Metro Manila",
  "Manila",
  "Quezon City",
  "Makati",
  "Pasig",
  "Taguig",
  "Pasay",
  "Parañaque",
  "Paranaque",
  "Caloocan",
  "Malabon",
  "Navotas",
  "Valenzuela",
  "Marikina",
  "Mandaluyong",
  "San Juan",
  "Las Piñas",
  "Las Pinas",
  "Muntinlupa",
  "Pateros",
  "Cavite",
  "Laguna",
  "Batangas",
  "Rizal",
  "Bulacan",
  "Pampanga",
  "Tarlac",
  "Zambales",
  "Pangasinan",
  "Nueva Ecija",
  "Bataan",
  "Luzon",
  "Visayas",
  "Mindanao",
  "Cebu",
  "Davao",
  "Iloilo",
  "Baguio",
  "Palawan",
  "Leyte",
  "Samar",
  "Bicol",
];

// =====================================================
// FOREIGN LOCATIONS
// =====================================================

const FOREIGN_LOCATIONS = [
  "United States",
  "USA",
  "Japan",
  "China",
  "Taiwan",
  "Hong Kong",
  "Vietnam",
  "Thailand",
  "Indonesia",
  "Malaysia",
  "India",
  "Australia",
  "Canada",
  "United Kingdom",
  "UK",
  "Europe",
  "South Korea",
  "Korea",
  "North Korea",
  "Russia",
  "Myanmar",
  "Bangladesh",
  "Pakistan",
  "Nepal",
];

// =====================================================
// WEATHER KEYWORDS
// =====================================================

const WEATHER_KEYWORDS = [
  "typhoon",
  "bagyo",
  "tropical cyclone",
  "tropical storm",
  "tropical depression",
  "storm",
  "weather",
  "rainfall",
  "rain",
  "rains",
  "heavy rain",
  "heavy rains",
  "flood",
  "flooding",
  "flooded",
  "pagasa",
  "monsoon",
  "habagat",
  "amihan",
  "low pressure area",
  "lpa",
  "thunderstorm",
  "thunderstorms",
  "heat index",
  "rainy",
  "drought",
  "el niño",
  "el nino",
  "weather disturbance",
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const extractArticleText = (article) =>
  `${article?.title || ""} ${article?.description || ""} ${
    article?.content || ""
  }`
    .toLowerCase()
    .trim();

// =====================================================
// TRUSTED SOURCE CHECK
// =====================================================

const isTrustedSource = (article) => {
  const sourceName =
    article?.source?.name?.toLowerCase() || "";

  return TRUSTED_SOURCES.some((source) =>
    sourceName.includes(source.toLowerCase())
  );
};

// =====================================================
// PHILIPPINE LOCATION CHECK
// =====================================================

const containsPhilippineLocation = (article) => {
  const text = extractArticleText(article);

  return PHILIPPINE_LOCATIONS.some((location) =>
    text.includes(location.toLowerCase())
  );
};

// =====================================================
// FOREIGN LOCATION CHECK
// =====================================================

const containsForeignLocation = (article) => {
  const text = extractArticleText(article);

  return FOREIGN_LOCATIONS.some((location) =>
    text.includes(location.toLowerCase())
  );
};

// =====================================================
// WEATHER CHECK
// =====================================================

const isWeatherNews = (article) => {
  const text = extractArticleText(article);

  return WEATHER_KEYWORDS.some((keyword) =>
    text.includes(keyword.toLowerCase())
  );
};

// =====================================================
// PHILIPPINE WEATHER RELEVANCE CHECK
// =====================================================

const isRelevantPhilippineWeatherNews = (article) => {
  if (!article) {
    return false;
  }

  const text = extractArticleText(article);

  const trusted = isTrustedSource(article);
  const philippine = containsPhilippineLocation(article);
  const foreign = containsForeignLocation(article);
  const weather = isWeatherNews(article);

  // Must be weather-related.
  if (!weather) {
    return false;
  }

  // Reject obvious foreign-only articles.
  if (foreign && !philippine) {
    return false;
  }

  // Accept trusted Philippine news sources.
  if (trusted) {
    return true;
  }

  // Accept articles mentioning the Philippines.
  if (philippine) {
    return true;
  }

  // PAGASA is considered relevant.
  if (text.includes("pagasa")) {
    return true;
  }

  return false;
};

// =====================================================
// REMOVE DUPLICATES
// =====================================================

const removeDuplicateArticles = (articles) => {
  const seen = new Set();

  return articles.filter((article) => {
    const key =
      article?.id ||
      article?.url ||
      `${article?.title || ""}-${article?.source?.name || ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
};

// =====================================================
// LOAD CACHED NEWS
// =====================================================

const getCachedNews = () => {
  try {
    const savedNews = localStorage.getItem(
      NEWS_STORAGE_KEY
    );

    if (!savedNews) {
      return [];
    }

    const parsedNews = JSON.parse(savedNews);

    return Array.isArray(parsedNews)
      ? parsedNews
      : [];
  } catch (error) {
    console.error(
      "Unable to load cached news:",
      error
    );

    return [];
  }
};

// =====================================================
// GET LAST NEWS UPDATE TIME
// =====================================================

const getLastNewsUpdate = () => {
  try {
    const timestamp = localStorage.getItem(
      NEWS_TIMESTAMP_KEY
    );

    if (!timestamp) {
      return 0;
    }

    return Number(timestamp) || 0;
  } catch (error) {
    console.error(
      "Unable to read news timestamp:",
      error
    );

    return 0;
  }
};

// =====================================================
// SAVE NEWS TO LOCAL STORAGE
// =====================================================

const saveNewsToCache = (articles) => {
  try {
    localStorage.setItem(
      NEWS_STORAGE_KEY,
      JSON.stringify(articles)
    );

    localStorage.setItem(
      NEWS_TIMESTAMP_KEY,
      Date.now().toString()
    );
  } catch (error) {
    console.error(
      "Unable to save news cache:",
      error
    );
  }
};

// =====================================================
// CHECK IF NEWS CACHE IS EXPIRED
// =====================================================

const isNewsCacheExpired = () => {
  const lastUpdate = getLastNewsUpdate();

  // No previous update means news must be loaded.
  if (!lastUpdate) {
    return true;
  }

  const elapsedTime = Date.now() - lastUpdate;

  return elapsedTime >= NEWS_REFRESH_INTERVAL;
};

// =====================================================
// EMERGENCY SECTION
// =====================================================

function EmergencySection() {
  return (
    <div className="emergency-section">
      <div className="emergency-header">
        <span className="section-label">
          EMERGENCY ASSISTANCE
        </span>

        <h2>Need Help?</h2>

        <p>
          Contact the appropriate emergency service when
          immediate assistance is needed.
        </p>
      </div>

      <div className="emergency-grid">
        {EMERGENCY_HOTLINES.map((item, idx) => (
          <a
            key={idx}
            href={`tel:${item.tel}`}
            className="emergency-card"
          >
            <div className="emergency-icon">
              {item.icon}
            </div>

            <div>
              <span>{item.name}</span>

              <strong>{item.number}</strong>

              <p>{item.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// ABOUT FRENDS SECTION
// =====================================================

function AboutFrendsSection() {
  return (
    <div className="about-frends-section">
      <div className="about-frends-content">
        <span className="section-label">
          ABOUT FRENDS
        </span>

        <h2>
          Smarter Navigation.
          <br />
          Safer Journeys.
        </h2>

        <p>
          FRENDS provides real-time flood and traffic
          information to help commuters and motorists make
          informed travel decisions throughout Metro
          Manila.
        </p>

        <p>
          By combining sensor-based flood monitoring, live
          traffic information, and timely weather updates,
          FRENDS helps users identify potentially dangerous
          areas and plan safer routes.
        </p>
      </div>
    </div>
  );
}

// =====================================================
// NEWS SECTION
// =====================================================

function NewsSection({
  news,
  newsLoading,
  newsError,
}) {
  return (
    <div className="news-section">

      {/* =================================================
          NEWS HEADER
      ================================================= */}

      <div className="news-header">
        <div>
          <span className="section-label">
            WEATHER NEWS
          </span>

          <h2>
            Philippine Weather & Typhoon Updates
          </h2>

          <p>
            Stay updated with weather, rainfall, flood,
            and typhoon-related news from Philippine
            sources.
          </p>
        </div>
      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {newsLoading && news.length === 0 && (
        <div className="news-empty">
          <div className="news-loading-icon">
            📰
          </div>

          <p>
            Loading Philippine weather news...
          </p>

          <span>
            Please wait while FRENDS retrieves the latest
            articles.
          </span>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {!newsLoading &&
        newsError &&
        news.length === 0 && (
          <div className="news-empty">
            <div className="news-loading-icon">
              ⚠️
            </div>

            <p>
              Unable to load news right now.
            </p>

            <span>{newsError}</span>
          </div>
        )}

      {/* =================================================
          NO NEWS
      ================================================= */}

      {!newsLoading &&
        !newsError &&
        news.length === 0 && (
          <div className="news-empty">
            <div className="news-loading-icon">
              📰
            </div>

            <p>
              No Philippine weather or typhoon news is
              available right now.
            </p>

            <span>
              News will automatically update when the
              12-hour refresh period is reached.
            </span>
          </div>
        )}

      {/* =================================================
          NEWS CARDS
      ================================================= */}

      {news.length > 0 && (
        <div className="news-grid">
          {news.map((item, index) => (
            <article
              key={
                item.id ||
                item.url ||
                `${item.title}-${index}`
              }
              className="news-card"
            >

              {/* =================================================
                  IMAGE
              ================================================= */}

              {item.image ? (
                <div className="news-image">
                  <img
                    src={item.image}
                    alt={
                      item.title ||
                      "Weather news"
                    }
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.parentElement.style.display =
                        "none";
                    }}
                  />
                </div>
              ) : (
                <div className="news-image news-image-placeholder">
                  <span>🌧️</span>
                </div>
              )}

              {/* =================================================
                  CONTENT
              ================================================= */}

              <div className="news-content">
                <div className="news-meta">
                  <span className="news-source">
                    {item.source?.name ||
                      "Philippine News"}
                  </span>

                  {item.publishedAt && (
                    <span className="news-date">
                      {new Date(
                        item.publishedAt
                      ).toLocaleDateString(
                        "en-PH",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </span>
                  )}
                </div>

                <h3>{item.title}</h3>

                {item.description && (
                  <p>{item.description}</p>
                )}

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="read-more-btn"
                  >
                    Read Full Details →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// MAIN MONITORING SECTION
// =====================================================

export default function MonitoringSection() {

  // ===================================================
  // LOAD CACHED NEWS IMMEDIATELY
  // ===================================================

  const cachedNews = getCachedNews();

  const [news, setNews] = useState(cachedNews);

  const [newsLoading, setNewsLoading] = useState(
    cachedNews.length === 0
  );

  const [newsError, setNewsError] = useState("");

  // ===================================================
  // LOAD NEWS FROM GNEWS
  // ===================================================

  const loadNews = async () => {
    try {
      setNewsLoading(true);

      setNewsError("");

      // ------------------------------------------------
      // MAIN GNEWS QUERY
      // ------------------------------------------------

      const query =
        'Philippines AND (typhoon OR bagyo OR "tropical cyclone" OR "tropical storm" OR "tropical depression" OR PAGASA OR flood OR flooding OR rainfall OR weather OR monsoon OR habagat)';

      const url =
        "https://gnews.io/api/v4/search?" +
        `q=${encodeURIComponent(query)}` +
        "&country=ph" +
        "&lang=en" +
        "&max=10" +
        "&sortby=publishedAt" +
        `&apikey=${GNEWS_API_KEY}`;

      console.log(
        "Loading GNews:",
        url.replace(
          GNEWS_API_KEY,
          "***"
        )
      );

      // ------------------------------------------------
      // FETCH
      // ------------------------------------------------

      const response = await fetch(url);

      // ------------------------------------------------
      // HTTP ERROR HANDLING
      // ------------------------------------------------

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "GNews request limit reached. FRENDS will continue showing the previously loaded news."
          );
        }

        if (response.status === 401) {
          throw new Error(
            "GNews API key is invalid or unauthorized."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "GNews API access was denied. Check your GNews plan or API key."
          );
        }

        throw new Error(
          `GNews request failed with status ${response.status}.`
        );
      }

      // ------------------------------------------------
      // PARSE JSON
      // ------------------------------------------------

      const data = await response.json();

      console.log(
        "GNews response:",
        data
      );

      // ------------------------------------------------
      // GET ARTICLES
      // ------------------------------------------------

      const articles = Array.isArray(
        data?.articles
      )
        ? data.articles
        : [];

      // ------------------------------------------------
      // FILTER ARTICLES
      // ------------------------------------------------

      let filteredArticles =
        articles.filter(
          isRelevantPhilippineWeatherNews
        );

      // ------------------------------------------------
      // REMOVE DUPLICATES
      // ------------------------------------------------

      filteredArticles =
        removeDuplicateArticles(
          filteredArticles
        );

      // ------------------------------------------------
      // SORT NEWEST FIRST
      // ------------------------------------------------

      filteredArticles.sort(
        (a, b) => {
          const dateA = new Date(
            a?.publishedAt || 0
          ).getTime();

          const dateB = new Date(
            b?.publishedAt || 0
          ).getTime();

          return dateB - dateA;
        }
      );

      // ------------------------------------------------
      // DISPLAY ONLY 6 ARTICLES
      // ------------------------------------------------

      filteredArticles =
        filteredArticles.slice(0, 6);

      console.log(
        `FRENDS: ${filteredArticles.length} usable news articles`
      );

      // ------------------------------------------------
      // ONLY REPLACE OLD NEWS IF NEW NEWS EXISTS
      // ------------------------------------------------

      if (filteredArticles.length > 0) {
        setNews(filteredArticles);

        // Save the new articles locally.
        saveNewsToCache(
          filteredArticles
        );
      }

      // ------------------------------------------------
      // GNEWS FREE PLAN MESSAGE
      // ------------------------------------------------

      if (
        data?.information
          ?.realTimeArticles
          ?.message
      ) {
        console.info(
          "GNews plan information:",
          data.information.realTimeArticles
            .message
        );
      }

      // ------------------------------------------------
      // NO MATCHING ARTICLES
      // ------------------------------------------------

      if (
        filteredArticles.length === 0 &&
        articles.length > 0
      ) {
        setNewsError(
          "News was received, but no articles matched the FRENDS weather filters."
        );
      }

    } catch (error) {
      console.error(
        "News loading error:",
        error
      );

      // IMPORTANT:
      // Do NOT erase the existing news.
      //
      // If GNews fails, the previous articles
      // remain visible in the interface.

      if (news.length === 0) {
        setNewsError(
          error?.message ||
            "Unable to retrieve Philippine weather news."
        );
      } else {
        console.warn(
          "FRENDS: Keeping previously loaded news because the latest GNews request failed."
        );
      }

    } finally {
      setNewsLoading(false);
    }
  };

  // ===================================================
  // INITIAL LOAD + 12-HOUR AUTOMATIC REFRESH
  // ===================================================

  useEffect(() => {

    // -------------------------------------------------
    // CHECK EXISTING NEWS CACHE
    // -------------------------------------------------

    const cacheExpired =
      isNewsCacheExpired();

    console.log(
      "FRENDS News Cache:",
      cacheExpired
        ? "Expired - checking GNews"
        : "Still valid - using cached articles"
    );

    // -------------------------------------------------
    // ONLY REQUEST GNEWS IF:
    //
    // 1. There are no cached articles
    // OR
    // 2. The 12-hour cache has expired
    // -------------------------------------------------

    if (
      cachedNews.length === 0 ||
      cacheExpired
    ) {
      loadNews();
    } else {

      // Cached articles are already displayed.
      setNewsLoading(false);
    }

    // -------------------------------------------------
    // CHECK EVERY MINUTE WHETHER 12 HOURS HAVE PASSED
    // -------------------------------------------------

    const interval = setInterval(() => {

      if (isNewsCacheExpired()) {

        console.log(
          "FRENDS: 12-hour news cache expired. Loading new articles..."
        );

        loadNews();
      }

    }, 60 * 1000);

    // -------------------------------------------------
    // CLEANUP
    // -------------------------------------------------

    return () => {
      clearInterval(interval);
    };

  }, []);

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <section
      className="monitoring-section"
      id="monitoring"
    >

      {/* =================================================
          1. NEWS
      ================================================= */}

      <NewsSection
        news={news}
        newsLoading={newsLoading}
        newsError={newsError}
      />

      {/* =================================================
          2. ABOUT FRENDS
      ================================================= */}

      <AboutFrendsSection />

      {/* =================================================
          3. EMERGENCY HOTLINES
      ================================================= */}

      <EmergencySection />

    </section>
  );
}