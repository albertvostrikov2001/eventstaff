'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

const YM_ID = 109707049;

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

/** Отправляет hit при клиентских SPA-переходах (первый просмотр считает сам init). */
function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (typeof window.ym === 'function') {
      const qs = searchParams?.toString();
      window.ym(YM_ID, 'hit', pathname + (qs ? `?${qs}` : ''));
    }
  }, [pathname, searchParams]);

  return null;
}

export function YandexMetrika() {
  // Не грузим в dev-режиме, чтобы не засорять статистику локальными заходами.
  if (process.env.NODE_ENV !== 'production') return null;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}','ym');ym(${YM_ID},'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`}
      </Script>
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${YM_ID}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
