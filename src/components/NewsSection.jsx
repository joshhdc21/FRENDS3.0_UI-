import { useEffect, useState } from "react";

function NewsSection() {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [nextRefresh, setNextRefresh] = useState("");

  const API_KEY = "21604dffca378c5d621f8cf55ff15c08";
  const TRUSTED_SOURCES = [
  "gma",
  "abs-cbn",
  "inquirer",
  "philstar",
  "manila bulletin",
  "manilabulletin",
  "rappler",
  "pagasa",
  "mmda",
];

const fetchNews = () => {
  console.log("Fetching latest news...");

  setLoading(true);

  const random = Math.floor(Math.random() * 999999);


  const floodRequest = fetch(
  `https://gnews.io/api/v4/search?q=flood OR flooding&country=ph&lang=en&max=10&sortby=publishedAt&apikey=${API_KEY}&_=${random}`
);

const trafficRequest = fetch(
  `https://gnews.io/api/v4/search?q=traffic OR mmda OR road OR accident&country=ph&lang=en&max=10&sortby=publishedAt&apikey=${API_KEY}&_=${random}`
);

const weatherRequest = fetch(
  `https://gnews.io/api/v4/search?q=weather OR pagasa OR rainfall OR typhoon&country=ph&lang=en&max=10&sortby=publishedAt&apikey=${API_KEY}&_=${random}`
);

Promise.all([
  floodRequest,
  trafficRequest,
  weatherRequest
])
  .then((responses) => Promise.all(responses.map((res) => res.json())))
  .then(([floodData, trafficData, weatherData]) => {

    console.log("Flood Data:", floodData);
    console.log("Traffic Data:", trafficData);
    console.log("Weather Data:", weatherData);


      const allArticles = [
  ...(floodData.articles || []),
  ...(trafficData.articles || []),
  ...(weatherData.articles || [])
];

// Debug logs
console.log("Flood Articles:", floodData.articles?.length);
console.log("Traffic Articles:", trafficData.articles?.length);
console.log("Weather Articles:", weatherData.articles?.length);
console.log("Total Articles:", allArticles.length);

if (allArticles.length > 0) {

  const filtered = allArticles.filter((article) => {

  const text =
    (
      (article.title || "") +
      " " +
      (article.description || "")
    ).toLowerCase();

  const source =
    (article.source?.name || "").toLowerCase();

  const isRelevant =
  text.includes("flood") ||
  text.includes("flooding") ||
  text.includes("rain") ||
  text.includes("rainfall") ||
  text.includes("weather") ||
  text.includes("traffic") ||
  text.includes("road") ||
  text.includes("expressway") ||
  text.includes("highway") ||
  text.includes("accident") ||
  text.includes("collision") ||
  text.includes("congestion") ||
  text.includes("vehicle") ||
  text.includes("commuter") ||
  text.includes("typhoon") ||
  text.includes("storm") ||
  text.includes("pagasa") ||
  text.includes("mmda") ||
  text.includes("lto") ||
  text.includes("ltfrb");

  const isTrusted =
    TRUSTED_SOURCES.some((name) =>
      source.includes(name)
    );

 return isRelevant;

        });



        const uniqueArticles = filtered.filter(
  (article, index, self) =>
    index ===
    self.findIndex(
      (a) =>
        a.title === article.title ||
        a.url === article.url
    )
);

// Debug logs
console.log("Filtered Articles:", filtered.length);
console.log("Unique Articles:", uniqueArticles.length);

uniqueArticles.sort((a, b) => {
  const trustedA = TRUSTED_SOURCES.some((name) =>
    (a.source?.name || "").toLowerCase().includes(name)
  );


  const trustedB = TRUSTED_SOURCES.some((name) =>
    (b.source?.name || "").toLowerCase().includes(name)
  );

  // Trusted sources come first
  if (trustedA && !trustedB) return -1;
  if (!trustedA && trustedB) return 1;

  // If both are trusted (or both are not),
  // show the newest article first
  return new Date(b.publishedAt) - new Date(a.publishedAt);

});

const formatted = uniqueArticles.map((article, index) => {


          const text =
          (
            article.title +
            " " +
            article.description
          ).toLowerCase();



          let category="General News";


          if(
           text.includes("flooding") ||
            text.includes("water level") ||
            text.includes("river")
          ){

            category="Flood Advisory";

          }


          else if(
            text.includes("traffic") ||
            text.includes("road") ||
            text.includes("mmda") ||
            text.includes("congestion")
          ){

            category="Traffic Advisory";

          }


          else if(
            text.includes("weather") ||
            text.includes("rain") ||
            text.includes("storm") ||
            text.includes("typhoon") ||
            text.includes("pagasa")
          ){

            category="Weather Advisory";

          }



          return {

  id:
  article.url || index,

  category,

  source:
  article.source?.name || "Unknown Source",

  date:
  new Date(article.publishedAt)
  .toLocaleString(),

  title:
  article.title,

  description:
  article.description ||
  "No description available.",

  image:
  article.image,

  url:
  article.url

};

        });

        setNewsItems(formatted.slice(0, 9));


        setLastUpdated(
          new Date().toLocaleString()
        );

        const next = new Date(Date.now() + 5 * 60 * 1000);

setNextRefresh(next.toLocaleTimeString());

      }


      setLoading(false);

    })


    .catch((err)=>{

      console.error(
        "Fetch Error:",
        err
      );

      setLoading(false);

    });

};

useEffect(() => {
  // Load news immediately
  fetchNews();

  // Refresh every 15 minutes 
  const interval = setInterval(fetchNews, 5 * 60 * 1000);

  // Clean up the timer when leaving the page
  return () => clearInterval(interval);
}, []);

  return (
    <section id="news" className="page-section">
     <div className="section-heading">
  <div>
    <p className="eyebrow">LIVE NEWS</p>
    <h3>Latest Flood, Traffic & Weather Updates</h3>

    <p className="next-refresh">
  Next Refresh: {nextRefresh || "Calculating..."}
</p>
  </div>

</div>

      {loading ? (
        <p>Loading latest news...</p>
      ) : (
        <div className="news-grid">
          {newsItems.map((news) => (
            <article className="news-card" key={news.id}>
              {news.image && (
                <img
                  src={news.image}
                  alt={news.title}
                  className="news-image"
                />
              )}

              <div className="news-meta">
               <span>{news.category}</span>
               <span>{news.source}</span>
               <time>{news.date}</time>
              </div>

              <h4>{news.title}</h4>

              <p>{news.description}</p>

              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-button"
              >
                Read Full Article →
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default NewsSection;