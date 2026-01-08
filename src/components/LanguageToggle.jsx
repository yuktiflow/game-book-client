import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { FaGlobe, FaChevronDown } from 'react-icons/fa';

const LanguageToggle = ({ variant = 'default' }) => {
    const { language, changeLanguage, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'mr', name: 'मराठी', flag: '🇮🇳' }
    ];

    const currentLanguage = languages.find(lang => lang.code === language);

    const handleLanguageChange = (langCode) => {
        changeLanguage(langCode);
        setIsOpen(false);
    };

    // Compact variant for mobile header
    if (variant === 'compact') {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    <FaGlobe className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                        {currentLanguage?.flag}
                    </span>
                </button>

                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${language === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                        }`}
                                >
                                    <span>{lang.flag}</span>
                                    <span className="text-sm font-medium">{lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Default variant for sidebar
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
            >
                <div className="flex items-center gap-3">
                    <FaGlobe className="text-gray-600 text-lg" />
                    <div className="flex flex-col items-start">
                        <span className="text-xs text-gray-500">{t('language.selectLanguage')}</span>
                        <span className="text-sm font-medium text-gray-700">
                            {currentLanguage?.flag} {currentLanguage?.name}
                        </span>
                    </div>
                </div>
                <FaChevronDown className={`text-gray-400 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${language === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                            >
                                <span className="text-xl">{lang.flag}</span>
                                <span className="text-sm font-medium">{lang.name}</span>
                                {language === lang.code && (
                                    <span className="ml-auto text-blue-600">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default LanguageToggle;
