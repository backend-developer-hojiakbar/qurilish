import React, { useState, useRef, useEffect } from 'react';
import { SunIcon, MoonIcon, ChevronDownIcon } from './icons';

interface ViewControlsProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: string, replacements?: { [key: string]: string }) => string;
}

const LANGUAGES = [
    { code: 'uz-lat', name: 'O‘zbek' },
    { code: 'uz-cyr', name: 'Ўзбек' },
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' },
];

export const ViewControls: React.FC<ViewControlsProps> = ({ theme, toggleTheme, language, setLanguage }) => {
    const [isLangOpen, setIsLangOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleLangSelect = (langCode: string) => {
        setLanguage(langCode);
        setIsLangOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsLangOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const currentLangName = LANGUAGES.find(l => l.code === language)?.name.substring(0, 2).toUpperCase() || 'EN';

    return (
        <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="lang-switcher" ref={dropdownRef}>
                <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="flex items-center gap-1.5 polished-pane px-3 py-1.5 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-transform transform hover:scale-105"
                >
                    <span>{currentLangName}</span>
                    <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
                </button>
                {isLangOpen && (
                    <div className="lang-switcher-dropdown polished-pane p-2 animate-assemble-in">
                        <div className="space-y-1">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLangSelect(lang.code)}
                                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-all transform ${language === lang.code ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] hover:translate-x-1'}`}
                                >
                                    {lang.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Theme Switcher */}
            <button onClick={toggleTheme} className="theme-switch" aria-label="Toggle theme">
                <div className="theme-switch-handle">
                    <SunIcon className="sun-icon h-4 w-4 text-black" />
                    <MoonIcon className="moon-icon h-4 w-4 text-black" />
                </div>
            </button>
        </div>
    );
};