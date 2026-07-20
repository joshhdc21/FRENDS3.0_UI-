const newsItems = [
  {
    id: 1,
    category: "System",
    date: "Waiting for updates",
    title: "Frends 3.0 monitoring dashboard created",
    description:
      "The initial React interface is ready for Firebase and ESP32 integration.",
  },
  {
    id: 2,
    category: "Weather",
    date: "No current report",
    title: "Weather advisory information",
    description:
      "Weather and rainfall advisories can be displayed here in a later version.",
  },
  {
    id: 3,
    category: "Flood Alert",
    date: "No active alert",
    title: "No sensor-based flood alert available",
    description:
      "Flood alerts will be generated after live sensor monitoring is enabled.",
  },
];

function NewsSection() {
  return (
    <section id="news" className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NEWS AND ADVISORIES</p>
          <h3>Latest system and flood information</h3>
        </div>

        <button type="button" className="secondary-button">
          Refresh updates
        </button>
      </div>

      <div className="news-grid">
        {newsItems.map((news) => (
          <article className="news-card" key={news.id}>
            <div className="news-meta">
              <span>{news.category}</span>
              <time>{news.date}</time>
            </div>

            <h4>{news.title}</h4>
            <p>{news.description}</p>

            <button type="button" className="text-button">
              Read details
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default NewsSection;