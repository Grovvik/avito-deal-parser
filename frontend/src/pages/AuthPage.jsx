import React from 'react';
import { Lock } from 'lucide-react';
import avitoLogo from '../assets/avito.svg';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const AuthPage = ({ t, handleLoginSubmit, authPasswordInput, setAuthPasswordInput, setAuthError, authError }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 shadow-2xl border bg-card text-card-foreground rounded-2xl relative overflow-hidden">
        <div className="flex flex-col items-center space-y-3 mb-6">
          <img src={avitoLogo} alt="Avito Logo" className="h-10 w-auto object-contain" />
          <h1 className="text-2xl font-bold tracking-tight">Avito<span className="text-primary">Parser</span></h1>
          <p className="text-sm text-muted-foreground text-center">{t('enterPassword')}</p>
        </div>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <Input
            label={t('password')}
            type="password"
            value={authPasswordInput}
            onChange={(e) => { setAuthPasswordInput(e.target.value); setAuthError(''); }}
            placeholder="••••••••"
            required
          />
          {authError && (
            <div className="text-xs text-destructive font-medium bg-destructive/10 border border-destructive/20 rounded-md p-2.5 text-center">
              {authError}
            </div>
          )}
          <Button type="submit" className="w-full py-2.5 font-semibold text-base shadow-lg">
            {t('login')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
