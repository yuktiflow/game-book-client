import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import mrTranslations from '../locales/mr.json';

const LanguageContext = createContext();

const translations = {
    en: enTranslations,
    mr: mrTranslations
};

export const LanguageProvider = ({ children }) => {
    // Get initial language from localStorage or default to 'en'
    const [language, setLanguage] = useState(() => {
        const savedLanguage = localStorage.getItem('language');
        return savedLanguage || 'en';
    });

    // Save language preference to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    // Translation function
    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }

        return value || key;
    };

    // Toggle between languages
    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'mr' : 'en');
    };

    // Set specific language
    const changeLanguage = (lang) => {
        if (lang === 'en' || lang === 'mr') {
            setLanguage(lang);
        }
    };

    const value = {
        language,
        t,
        toggleLanguage,
        changeLanguage
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom hook to use language context
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
