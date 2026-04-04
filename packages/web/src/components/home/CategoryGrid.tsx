import { CategoryCard } from './CategoryCard';
import { categoriesContent } from '@/content/categoriesContent';

export function CategoryGrid() {
  const { categories } = categoriesContent;

  return (
    <section className="categories-section" aria-labelledby="categories-heading">
      <div className="container-page">
        <div className="section-header">
          <h2 id="categories-heading" className="categories-heading">
            Категории персонала
          </h2>
          <p className="categories-subheading">
            Найдите специалиста под любое мероприятие
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} name={cat.name} icon={cat.icon} href={cat.href} />
          ))}
        </div>
      </div>
    </section>
  );
}
