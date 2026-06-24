import { redirect } from 'next/navigation';

// Раздел «Медиа» объединён со страницей профиля работника.
// Сохраняем маршрут для обратной совместимости со старыми ссылками/закладками.
export default function WorkerProfileMediaRedirect() {
  redirect('/worker/profile');
}
