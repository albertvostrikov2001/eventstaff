import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { SiteJsonLd } from '@/components/seo/SiteJsonLd';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteJsonLd />
      <Header />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
    </>
  );
}
