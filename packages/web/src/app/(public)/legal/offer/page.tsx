import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Оферта',
  description: 'Публичная оферта на оказание услуг платформы Юнити. Черновой текст для юридического согласования.',
};

export default function OfferPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900">Публичная оферта</h1>
        <p className="mt-2 text-sm text-gray-500">Черновая редакция — март 2026 г.</p>

        <div className="mt-8 rounded-card border border-secondary-200 bg-secondary-50/40 p-5 text-sm text-gray-800">
          <p className="font-semibold text-secondary-800">[ТРЕБУЕТ ПРОВЕРКИ ЮРИСТОМ]</p>
          <p className="mt-2">
            Ниже приведена упрощённая структура договора присоединения. Реквизиты сторон, предмет, цена,
            порядок оплаты, ответственность и порядок разрешения споров должны быть заполнены и согласованы с
            юристом перед размещением на сайте.
          </p>
        </div>

        <div className="mt-10 space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-gray-900">1. Термины</h2>
            <p className="mt-3 leading-relaxed">
              <strong className="text-gray-900">Исполнитель</strong> — лицо, предоставляющее доступ к сервису
              Юнити на условиях настоящей оферты. <strong className="text-gray-900">Заказчик</strong> — лицо,
              акцептовавшее оферту и оплатившее услуги (или пользующееся бесплатным функционалом в рамках
              тарифа). <strong className="text-gray-900">Услуги</strong> — предоставление доступа к
              программным функциям Платформы в соответствии с выбранным тарифом.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">2. Предмет договора</h2>
            <p className="mt-3 leading-relaxed">
              Исполнитель обязуется предоставить Заказчику возможность использования Платформы, а Заказчик
              обязуется соблюдать правила сервиса и при наличии платной подписки — своевременно оплачивать
              услуги. Услуги носят информационно-технический характер; Исполнитель не является стороной
              трудовых или гражданско-правовых сделок между пользователями Платформы, если прямо не
              предусмотрено дополнительным соглашением.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">3. Акцепт оферты</h2>
            <p className="mt-3 leading-relaxed">
              Акцептом признаётся совершение Заказчиком действий: регистрация на сайте с принятием условий,
              оплата счёта или подтверждение заказа услуги в интерфейсе Платформы — в зависимости от выбранной
              модели (конкретный момент акцепта уточняется в финальной редакции).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">4. Стоимость и порядок расчётов</h2>
            <p className="mt-3 leading-relaxed">
              Стоимость услуг, валюта, НДС, способы оплаты и сроки указаны на странице тарифов и/или в счёте.
              Исполнитель вправе изменять цены для новых периодов подписки с уведомлением в интерфейсе или по
              email. [Детали подлежат заполнению.]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">5. Срок и прекращение</h2>
            <p className="mt-3 leading-relaxed">
              Договор действует до момента удаления аккаунта или до окончания оплаченного периода — в
              зависимости от модели. Стороны вправе расторгнуть договор в случаях, предусмотренных
              законодательством и финальной редакцией оферты (неисполнение оплаты, существенное нарушение
              правил Платформы и т.д.).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">6. Ответственность</h2>
            <p className="mt-3 leading-relaxed">
              Стороны несут ответственность в пределах, установленных законом и настоящей офертой. Исполнитель
              не отвечает за косвенные убытки и упущенную выгоду Заказчика. [Ограничения и исключения —
              по согласованию с юристом.]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">7. Реквизиты Исполнителя</h2>
            <p className="mt-3 leading-relaxed text-gray-500">
              [Полное наименование, ИНН, КПП, юридический адрес, банковские реквизиты — вставить после
              регистрации юридического лица.]
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          Связанные документы:{' '}
          <Link href="/legal/terms" className="text-primary-600 hover:text-primary-700">
            Пользовательское соглашение
          </Link>
          {' · '}
          <Link href="/legal/privacy" className="text-primary-600 hover:text-primary-700">
            Политика конфиденциальности
          </Link>
        </p>
      </div>
    </div>
  );
}
