import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description:
    'Как сервис Юнити обрабатывает персональные данные пользователей. Юрисдикция РФ. Черновой текст для согласования с юристом.',
};

export default function PrivacyPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900">Политика конфиденциальности</h1>
        <p className="mt-2 text-sm text-gray-500">Последнее обновление: март 2026 г.</p>

        <div className="mt-8 rounded-card border border-secondary-200 bg-secondary-50/40 p-5 text-sm text-gray-800">
          <p className="font-semibold text-secondary-800">[ТРЕБУЕТ ПРОВЕРКИ ЮРИСТОМ]</p>
          <p className="mt-2">
            Документ подготовлен как шаблон в соответствии с ориентирами законодательства Российской Федерации о
            персональных данных. Перед внедрением необходима юридическая экспертиза и при необходимости —
            регистрация в реестре операторов ПДн.
          </p>
        </div>

        <div className="mt-10 space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-gray-900">1. Кто обрабатывает данные</h2>
            <p className="mt-3 leading-relaxed">
              Оператором персональных данных при использовании сервиса Юнити выступает юридическое лицо,
              указанное в реквизитах на сайте (далее — «Оператор»). Контакт для обращений по вопросам
              персональных данных:{' '}
              <a href="mailto:info@unity-staff.ru" className="text-primary-600 hover:text-primary-700">
                info@unity-staff.ru
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">2. Какие данные собираются</h2>
            <p className="mt-3 leading-relaxed">
              Мы можем обрабатывать: данные, указанные при регистрации (имя, email, телефон, роль на платформе);
              данные профиля (опыт, фото, портфолио); технические данные (IP-адрес, cookie, сведения об
              устройстве и браузере); переписку внутри Платформы в объёме, необходимом для работы сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">3. Цели обработки</h2>
            <p className="mt-3 leading-relaxed">
              Данные используются для предоставления доступа к Платформе, идентификации пользователей,
              подбора вакансий и кандидатов, улучшения сервиса, связи с пользователем, выполнения требований
              законодательства и защиты прав Оператора и третьих лиц.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">4. Хранение и юрисдикция</h2>
            <p className="mt-3 leading-relaxed">
              Обработка персональных данных осуществляется в соответствии с законодательством Российской
              Федерации. Хранение и обработка данных, насколько это применимо, организуются с использованием
              средств, находящихся на территории РФ или иным образом соответствующих требованиям локализации,
              после уточнения юристом и выбора инфраструктуры.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">5. Права субъекта персональных данных</h2>
            <p className="mt-3 leading-relaxed">
              Пользователь вправе запросить доступ к своим данным, уточнение, блокирование или удаление (с
              учётом законных ограничений), отозвать согласие на обработку, обжаловать действия Оператора в
              уполномоченный орган по защите прав субъектов персональных данных. Для реализации прав направьте
              запрос на email Оператора с темой «Персональные данные».
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">6. Cookie и аналитика</h2>
            <p className="mt-3 leading-relaxed">
              Сайт может использовать cookie и аналогичные технологии для работы авторизации, настроек и
              обезличенной аналитики. Пользователь может ограничить cookie в настройках браузера; часть функций
              при этом может стать недоступной.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">7. Изменения политики</h2>
            <p className="mt-3 leading-relaxed">
              Оператор вправе обновлять настоящую Политику. Новая редакция вступает в силу с момента публикации,
              если иное не указано отдельно.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          <Link href="/legal/terms" className="text-primary-600 hover:text-primary-700">
            Пользовательское соглашение
          </Link>
          {' · '}
          <Link href="/contacts" className="text-primary-600 hover:text-primary-700">
            Контакты
          </Link>
        </p>
      </div>
    </div>
  );
}
