# i18n (Internationalization) Implementation Guide

## Overview

This application now supports 4 languages:

- **English** (en) - Default
- **Chinese** (zh) - 中文
- **Japanese** (ja) - 日本語
- **Indonesian** (id) - Indonesia

## How It Works

### 1. Translation Files

Translation files are stored in `/locales` and copied to `/public/locales`:

- `locales/en.json` - English translations
- `locales/zh.json` - Chinese translations
- `locales/ja.json` - Japanese translations
- `locales/id.json` - Indonesian translations

### 2. Usage in Components

Import the `useLocale` hook:

```jsx
import { useLocale } from '../context/LocaleContext';

export default function MyComponent() {
  const { t, locale, setLocale } = useLocale();

  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <p>{t('nav.dashboard')}</p>
    </div>
  );
}
```

### 3. Translation Keys Structure

Translations are organized hierarchically:

```javascript
{
  "nav": {
    "quest": "Quest",
    "dashboard": "Dashboard"
  },
  "login": {
    "title": "Login",
    "email": "Email"
  },
  "common": {
    "loading": "Loading...",
    "save": "Save"
  }
}
```

Access nested keys using dot notation: `t('nav.quest')`, `t('login.title')`

### 4. Language Switcher

The `<LanguageSwitcher />` component is already added to the Navbar. Users can click on it to change languages.

### 5. Adding New Translations

#### Step 1: Add to all language files

Add your new key to all 4 files in `/locales`:

**en.json:**

```json
{
  "mySection": {
    "myKey": "Hello World"
  }
}
```

**zh.json:**

```json
{
  "mySection": {
    "myKey": "你好世界"
  }
}
```

**ja.json:**

```json
{
  "mySection": {
    "myKey": "こんにちは世界"
  }
}
```

**id.json:**

```json
{
  "mySection": {
    "myKey": "Halo Dunia"
  }
}
```

#### Step 2: Copy to public directory

```powershell
Copy-Item -Path "locales\*" -Destination "public\locales\" -Force
```

#### Step 3: Use in your component

```jsx
const { t } = useLocale();
return <div>{t('mySection.myKey')}</div>;
```

### 6. Already Translated Components

The following components have been updated to use translations:

- ✅ Navbar (including dropdowns)
- ✅ Login page (Home page)
- ✅ Home page branding and taglines
- ✅ Admin Stats component (partial)
- ✅ User Profile component (partial)

### 7. Components That Need Translation

To complete the i18n implementation, update these components:

- [ ] Admin Dashboard tabs and content
- [ ] Manager Dashboard
- [ ] User Dashboard
- [ ] Task components
- [ ] Company management
- [ ] Invite management
- [ ] All modals and forms
- [ ] Toast messages
- [ ] Error messages

### 8. Best Practices

1. **Always provide all 4 translations** when adding new keys
2. **Use descriptive key names**: `user.profile.email` instead of `e1`
3. **Group related translations** under the same parent key
4. **Keep translations consistent** across all languages
5. **Test language switching** after adding new translations

### 9. Persistence

The selected language is saved in a cookie (`NEXT_LOCALE`) and persists across sessions.

### 10. Development Workflow

1. Add translation keys to all 4 JSON files
2. Copy files to public directory
3. Use `t('key.path')` in components
4. Test with language switcher
5. Verify all languages display correctly

## Technical Details

- **Library**: Custom implementation with React Context
- **Storage**: Browser cookies
- **Loading**: Dynamic fetch from `/public/locales/[locale].json`
- **Fallback**: Returns the key if translation is missing

## Example: Converting a Component

**Before:**

```jsx
<button>Save Changes</button>
```

**After:**

```jsx
import { useLocale } from '../context/LocaleContext';

export default function MyComponent() {
  const { t } = useLocale();
  return <button>{t('common.save')}</button>;
}
```

## Support

For questions or issues with i18n, check:

1. Translation keys exist in all 4 language files
2. Files are copied to public/locales directory
3. Component imports `useLocale` correctly
4. Key path matches JSON structure exactly
