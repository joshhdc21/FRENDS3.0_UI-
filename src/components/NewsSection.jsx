import { useEffect, useState } from "react";

function NewsSection() {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const API_KEY = "21604dffca378c5d621f8cf55ff15c08";

const fetchNews = () => {
  console.log("Fetching latest news...");

  setLoading(true);

  const random = Math.floor(Math.random() * 999999);


  fetch(
    `https://gnews.io/api/v4/search?q=(flood OR traffic OR weather OR typhoon OR rainfall OR MMDA OR PAGASA)&lang=en&country=ph&max=10&sortby=publishedAt&apikey=${API_KEY}&_=${random}`
  )
    .then((res) => {
      console.log("Status:", res.status);
      return res.json();
    })

    .then((data) => {

      console.log("Response:", data);


      if (data.articles) {


        const filtered = data.articles.filter((article) => {

          const text =
            (
              (article.title || "") +
              " " +
              (article.description || "")
            ).toLowerCase();


          return (
            text.includes("flood") ||
            text.includes("rain") ||
            text.includes("weather") ||
            text.includes("traffic") ||
            text.includes("road") ||
            text.includes("mmda") ||
            text.includes("pagasa") ||
            text.includes("typhoon")
          );

        });



        const formatted = filtered.map((article,index)=>{


          const text =
          (
            article.title +
            " " +
            article.description
          ).toLowerCase();



          let category="📰 General News";


          if(
            text.includes("flood") ||
            text.includes("flooding") ||
            text.includes("water level") ||
            text.includes("river")
          ){

            category="🌊 Flood Advisory";

          }


          else if(
            text.includes("traffic") ||
            text.includes("road") ||
            text.includes("mmda") ||
            text.includes("congestion")
          ){

            category="🚗 Traffic Advisory";

          }


          else if(
            text.includes("weather") ||
            text.includes("rain") ||
            text.includes("storm") ||
            text.includes("typhoon") ||
            text.includes("pagasa")
          ){

            category="🌦 Weather Advisory";

          }



          return {

            id:
            article.url || index,

            category,

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



        setNewsItems(formatted);


        setLastUpdated(
          new Date().toLocaleString()
        );

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
  const interval = setInterval(fetchNews, 15 * 60 * 1000);

  // Clean up the timer when leaving the page
  return () => clearInterval(interval);
}, []);

  return (
    <section id="news" className="page-section">
     <div className="section-heading">
  <div>
    <p className="eyebrow">LIVE NEWS</p>
    <h3>Latest Flood, Traffic & Weather Updates</h3>

    <p className="last-updated">
      Last Updated: {lastUpdated || "Loading..."}
    </p>
  </div>

  <button
    type="button"
    className="secondary-button"
    onClick={fetchNews}
  >
    🔄 Refresh Updates
  </button>
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