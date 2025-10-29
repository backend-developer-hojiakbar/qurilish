import React, { useState } from 'react';

interface PricingViewProps {
    onLogin: (token: string) => void;
    t: (key: string, replacements?: { [key: string]: string }) => string;
    loginError: string | null;
}

export const PricingView: React.FC<PricingViewProps> = ({ onLogin, t, loginError }) => {
    
    const [phone, setPhone] = useState('+998911231212');
    const [token, setToken] = useState('AD2025');
    const [agreed, setAgreed] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (agreed && token.trim() && phone.trim()) {
            onLogin(token);
        }
    };

    const plans = [
        { nameKey: 'pricing_plan_one_time', priceKey: 'pricing_price_one_time', recommended: false },
        { nameKey: 'pricing_plan_1_month', priceKey: 'pricing_price_1_month', recommended: false },
        { nameKey: 'pricing_plan_3_month', priceKey: 'pricing_price_3_month', recommended: true },
        { nameKey: 'pricing_plan_6_month', priceKey: 'pricing_price_6_month', recommended: false },
        { nameKey: 'pricing_plan_12_month', priceKey: 'pricing_price_12_month', recommended: false },
    ];

    return (
        <div className="h-screen w-full relative flex flex-col items-center justify-center p-4 bg-transparent text-[var(--text-primary)]">
            <div className="w-full max-w-4xl animate-assemble-in">
                <div className="polished-pane p-8 md:p-10 rounded-2xl backdrop-blur-3xl">
                    <h1 className="text-5xl font-extrabold tracking-wider animated-gradient-text text-center">
                        {t('app_name')}
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-4 leading-relaxed max-w-2xl mx-auto text-center">
                        {t('auth_welcome_desc')}
                    </p>

                    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                        {/* Left Column: Pricing */}
                        <div>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-5 text-center">{t('pricing_title')}</h2>
                             <div className="grid grid-cols-2 gap-4 text-white">
                                {plans.map((plan) => (
                                    <div key={plan.nameKey} className={`relative ${plan.recommended ? 'pt-3' : ''}`}>
                                        <a
                                            href="https://t.me/adolatAI_bot"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`w-full h-full block polished-pane interactive-hover p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-300 border ${
                                                plan.recommended ? 'border-[var(--accent-primary)] shadow-2xl shadow-[var(--glow-color-primary)]' : 'border-transparent'
                                            }`}
                                        >
                                            <div className="text-base font-bold text-[var(--text-primary)]">{t(plan.nameKey)}</div>
                                            <div className="text-2xl font-black animated-gradient-text mt-1">{t(plan.priceKey)}</div>
                                            <span className="mt-3 text-xs bg-slate-700/50 px-3 py-1 rounded-full">{t('login_buy_plan')}</span>
                                        </a>
                                        {plan.recommended && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[var(--accent-primary)] text-black px-3 py-0.5 rounded-full text-xs font-bold tracking-wide z-10">
                                                {t('pricing_recommended')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Column: Login */}
                        <div className="border-t md:border-t-0 md:border-l border-[var(--border-color)] pt-8 md:pt-0 md:pl-8">
                             <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-5 text-center">{t('login_title')}</h2>
                             <form onSubmit={handleLogin} className="space-y-5">
                                 <div>
                                     <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('login_phone_label')}</label>
                                     <input
                                         type="tel"
                                         id="phone"
                                         value={phone}
                                         onChange={e => setPhone(e.target.value)}
                                         className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all duration-300"
                                         required
                                     />
                                 </div>
                                 <div>
                                     <label htmlFor="token" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('login_token_label')}</label>
                                     <input
                                         type="text"
                                         id="token"
                                         value={token}
                                         onChange={e => setToken(e.target.value)}
                                         className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all duration-300"
                                         required
                                     />
                                 </div>
                                 <div className="flex items-start">
                                     <div className="flex items-center h-5">
                                         <input
                                             id="terms"
                                             name="terms"
                                             type="checkbox"
                                             checked={agreed}
                                             onChange={e => setAgreed(e.target.checked)}
                                             className="h-4 w-4 rounded border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                                         />
                                     </div>
                                     <div className="ml-3 text-sm">
                                         <label htmlFor="terms" className="text-[var(--text-secondary)]">
                                             <a href="#" className="font-medium text-[var(--accent-primary)] hover:underline">{t('terms_of_service')}</a> {t('login_terms_agree')} 
                                         </label>
                                     </div>
                                 </div>
                                 <button
                                     type="submit"
                                     disabled={!agreed}
                                     className="w-full bg-[var(--accent-primary)] text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                 >
                                     {t('login_button')}
                                 </button>
                                 {loginError && <p className="text-red-400 text-sm text-center mt-3">{loginError}</p>}
                             </form>
                        </div>
                    </div>
                </div>
            </div>
            <footer className="app-footer absolute bottom-0 left-0 right-0">
                <div className="footer-content">
                    <span>© 2025 <a href="https://cdcgroup.uz" target="_blank" rel="noopener noreferrer" className="footer-link">CDCGroup</a>. {t('footer_rights')}</span>
                    <span className="footer-separator" aria-hidden="true"></span>
                    <span>{t('footer_supporter')} <a href="https://cdcgroup.uz" target="_blank" rel="noopener noreferrer" className="footer-link">CraDev company</a></span>
                </div>
            </footer>
        </div>
    );
};