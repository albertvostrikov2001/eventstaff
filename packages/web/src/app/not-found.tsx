import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="error-page" aria-labelledby="err404-title">
        <div
          className="error-page__bg"
          aria-hidden="true"
        />
        <div className="container-page relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16 text-center">
          <p
            className="error-page__code"
            id="err404-title"
            aria-label="Ошибка 404"
          >
            404
          </p>
          <h1 className="error-page__heading">Страница не найдена</h1>
          <p className="error-page__desc">
            Кажется, эта страница переехала или её никогда не было
          </p>
          <div className="mt-10 flex w-full max-w-sm flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Button asChild variant="primary" size="lg" className="w-full min-[640px]:w-auto">
              <Link href="/">Вернуться на главную</Link>
            </Button>
            <Link
              href="/workers"
              className="error-page__secondary-link w-full min-[640px]:w-auto"
            >
              Перейти в каталог
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
