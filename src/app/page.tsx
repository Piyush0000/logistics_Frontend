import { redirect } from 'next/navigation';
import { getDemoSession } from '@/lib/auth/session';

export default async function HomePage() {
  redirect((await getDemoSession()) ? '/dashboard' : '/login');
}
