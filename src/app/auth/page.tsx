'use client';
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, Shield, Coins, Zap } from 'lucide-react';

function AuthForm() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/editor';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) router.push(redirect); }, [user]);

  const handleGoogle = () => {
    // Google Auth — wallet is created silently on first login via webhook
    signInWithGoogle();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = mode === 'signin'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);
      if (error) throw error;
      toast.success(mode === 'signin' ? 'Bem-vindo!' : 'Conta criada! Verifique seu email.');
      router.push(redirect);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand/30">
            <span className="text-white font-black text-2xl">T</span>
          </div>
          <h1 className="font-black text-2xl text-[var(--text)]">TrustBank</h1>
          <p className="text-sm text-[var(--text2)] mt-1">
            {mode === 'signin' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </p>
        </div>

        <div className="card p-6 space-y-4">

          {/* Google — primary CTA */}
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-bold text-sm transition-all hover:opacity-90 text-white shadow-md"
            style={{ background: 'linear-gradient(135deg,#4285F4,#34A853)' }}>
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          {/* Silent wallet info */}
          <div className="bg-[var(--bg2)] rounded-xl p-3 flex items-start gap-2.5">
            <Coins className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              <span className="font-semibold text-[var(--text)]">Pagamentos automáticos em USDC.</span> Você não precisa lidar com carteiras. Para <span className="text-brand font-semibold">receber pagamentos</span> (vídeos, CV, slugs), adicione seu endereço Polygon no editor.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text2)]">ou email</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label block mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text2)]" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input pl-9" placeholder="voce@exemplo.com" required />
              </div>
            </div>
            <div>
              <label className="label block mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text2)]" />
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9 pr-9" placeholder="••••••••" required minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text2)]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-2.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Carregando...' : mode === 'signin' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text2)]">
            {mode === 'signin' ? 'Não tem conta? ' : 'Já tem conta? '}
            <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-brand hover:underline font-semibold">
              {mode === 'signin' ? 'Criar grátis' : 'Entrar'}
            </button>
          </p>
        </div>

        {/* Security note */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[var(--text2)]">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Sem senhas de carteira</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> USDC · Polygon</span>
          <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> Split automático</span>
        </div>
      </div>
    </div>
  );
}
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
