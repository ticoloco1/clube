import { Header } from '@/components/layout/Header';
import { LotteryGenerator } from '@/components/mystic/LotteryGenerator';

export default function MisticoLoteriaPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <LotteryGenerator />
    </div>
  );
}
