# 🌐 Internationalization (i18n) Implementation Guide

## Overview
La Racine now supports multiple languages (English, French, Spanish) with a complete internationalization system using react-i18next.

## Supported Languages
- **English (en)** 🇺🇸 - Default language
- **Français (fr)** 🇫🇷 - French
- **Español (es)** 🇪🇸 - Spanish

## Features Implemented

### 1. Language Selector
- Located in the Header component (top-right corner)
- Displays current language flag and code
- Dropdown menu with all available languages
- Persists language selection in localStorage
- Click-outside functionality to close dropdown

### 2. Translation System
- Comprehensive translation files for all UI text
- Organized by feature/component categories:
  - Common (buttons, actions, labels)
  - Authentication (login, register, logout)
  - Dashboard (overview, stats, actions)
  - Tree Types (all family tree categories)
  - Tree Management (create, edit, view)
  - Member Management (add, edit, fields)
  - Relationships
  - Notifications
  - Activity Feed
  - Visualization Controls
  - Form Validation Messages

### 3. Component Updates
All major components now use translations:
- **Header** - Navigation and user info
- **Login** - Authentication form
- **Dashboard** - Stats, actions, tree list
- **FamilyTree** - Visualization controls
- **AddMember** - Form labels and placeholders

## File Structure

```
frontend/src/
├── i18n/
│   ├── i18n.js                 # i18next configuration
│   └── locales/
│       ├── en.json             # English translations
│       ├── fr.json             # French translations
│       └── es.json             # Spanish translations
├── context/
│   └── LanguageContext.jsx     # Language state management
└── components/
    └── [All components updated with useTranslation hook]
```

## Usage Guide

### Using Translations in Components

```jsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### Using Language Context

```jsx
import { useLanguage } from '../context/LanguageContext';

const MyComponent = () => {
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  
  return (
    <div>
      <p>Current: {currentLanguage}</p>
      <button onClick={() => changeLanguage('fr')}>
        Switch to French
      </button>
    </div>
  );
};
```

## Adding New Translations

### 1. Add to Translation Files
Edit `frontend/src/i18n/locales/[language].json`:

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "Feature description"
  }
}
```

### 2. Use in Component
```jsx
const { t } = useTranslation();
<h1>{t('myFeature.title')}</h1>
```

## Adding New Languages

### 1. Create Translation File
Create `frontend/src/i18n/locales/[code].json` with all translations

### 2. Update i18n Configuration
Edit `frontend/src/i18n/i18n.js`:

```javascript
import newLangTranslations from './locales/[code].json';

const resources = {
  // ... existing languages
  [code]: {
    translation: newLangTranslations
  }
};
```

### 3. Update Language Context
Edit `frontend/src/context/LanguageContext.jsx`:

```javascript
const languages = [
  // ... existing languages
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];
```

## Testing Language Switching

1. **Login to the application**
2. **Look for language selector** in top-right corner of header
3. **Click language button** to open dropdown
4. **Select a language** (English, Français, or Español)
5. **Verify translations** across different pages:
   - Dashboard stats and actions
   - Navigation tabs
   - Forms and labels
   - Buttons and links
6. **Refresh page** to verify persistence

## Troubleshooting

### Translation Not Showing
- Check if translation key exists in JSON file
- Verify translation file is properly imported in `i18n.js`
- Check browser console for i18next warnings

### Language Not Persisting
- Check localStorage for `i18nextLng` key
- Verify LanguageDetector is properly configured

### Component Not Updating
- Ensure component uses `useTranslation()` hook
- Check that LanguageProvider wraps the app in App.jsx

## Best Practices

1. **Use Descriptive Keys**: `dashboard.familyStatistics` not `ds.fs`
2. **Organize by Feature**: Group related translations together
3. **Keep Consistent**: Same structure across all language files
4. **Provide Context**: Add comments in JSON for complex translations
5. **Test All Languages**: Verify UI layout works in all languages
6. **Handle Long Text**: Consider text length in different languages

## CSS Considerations

Language selector styling is in `frontend/src/index.css`:
- `.language-selector-wrapper` - Container with positioning
- `.language-selector-btn` - Main button styles
- `.language-dropdown` - Dropdown menu styles
- `.language-option` - Individual language option styles
- Responsive styles for mobile devices

## Performance Notes

- All translations are loaded at initialization (small size impact)
- Language changes are instant (no page reload required)
- Translation keys are cached by react-i18next
- localStorage caching prevents unnecessary re-renders

## Future Enhancements

- [ ] Add more languages (German, Italian, Portuguese, etc.)
- [ ] Implement lazy loading for language files
- [ ] Add date/time localization
- [ ] Add number formatting per locale
- [ ] Translate backend Django admin interface
- [ ] Add RTL (Right-to-Left) support for Arabic/Hebrew
- [ ] Export/import translation files for translators
- [ ] Add translation management interface

## Support

For issues or questions about translations:
1. Check this documentation
2. Review translation files for missing keys
3. Check i18next documentation: https://react.i18next.com/
4. Review GitHub issues for known translation problems
