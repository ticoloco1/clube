import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-center p-4">
      <div>
        <p className="text-8xl mb-4">🔍</p>
        <h1 className="text-4xl font-black text-[var(--text)] mb-3">Page not found</h1>
        <p className="text-[var(--text2)] mb-8">This page doesn't exist.</p>
        <Link href="/" className="btn-primary px-8 py-3">Go Home</Link>
      </div>
    </div>
  );
}
