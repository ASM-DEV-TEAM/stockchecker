# Netlify Deployment Guide

## Project Structure
```
├── public/                 # Main deployment folder
│   ├── index.html          # Main application
│   ├── manifest.json       # PWA configuration
│   ├── sw.js               # Service Worker
│   ├── icons/              # App icons
│   └── vendor/             # External libraries
├── netlify.toml           # Netlify configuration
├── package.json           # Project metadata
└── README.md              # Documentation
```

## Auto Deployment Setup

### 1. Connect to Netlify
1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Netlify
3. Set the following deployment settings:

### 2. Netlify Settings
- **Build command**: `echo 'No build needed'`
- **Publish directory**: `public`
- **Node version**: `18` (or latest)

### 3. Environment Variables (Optional)
- `NODE_VERSION`: `18`

### 4. Deployment Configuration
The `netlify.toml` file is already configured with:
- Publish directory: `public`
- Security headers
- Service Worker caching rules
- PWA manifest headers
- Static asset caching

### 5. Automatic Deployments
- **Main branch**: Auto-deploy to production
- **Dev branch**: Auto-deploy to staging (if configured)
- **Pull requests**: Deploy preview sites

## Manual Deployment
If you prefer manual deployment:
1. Run: `npm run deploy`
2. Upload the `public` folder to Netlify
3. Or drag-and-drop the `public` folder to Netlify dashboard

## PWA Features
- Service Worker: `/sw.js`
- Manifest: `/manifest.json`
- Offline support enabled
- Add to Home Screen ready

## Performance Optimizations
- Static assets cached for 1 year
- Service Worker bypassed for updates
- Gzip compression enabled
- CDN distribution via Netlify

## Troubleshooting
- Ensure all files are in the `public` folder
- Check `netlify.toml` configuration
- Verify Service Worker registration
- Test PWA installation on mobile devices
