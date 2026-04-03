import { Header } from '@/components/layout/Header';
import { TarotReader } from '@/components/mystic/TarotReader';

export default function MisticoTarotPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <TarotReader />
    </div>
  );
}
