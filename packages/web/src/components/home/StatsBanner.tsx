import { statsContent } from '@/content/statsContent';

export function StatsBanner() {
  return (
    <section className="stats-banner" aria-label="Ключевые показатели платформы">
      <div className="container-page">
        <div className="stats-grid">
          {statsContent.items.map((item) => (
            <div key={item.label} className="stats-item">
              <span className="stats-value" aria-label={`${item.value} — ${item.label}`}>
                {item.value}
              </span>
              <span className="stats-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
