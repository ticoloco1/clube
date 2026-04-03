import { redirect } from 'next/navigation';

/** Página pública descontinuada — middleware também redireciona `/jackpot` → `/`. */
export default function JackpotRedirectPage() {
  redirect('/');
}
