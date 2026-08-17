import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function Root() {
  const headersList = await headers();
  const userAgent = (headersList.get('user-agent') || '').toLowerCase();
  
  if (userAgent.includes('telegram')) {
    redirect('/tg-app');
  }
  
  redirect('/home');
}
