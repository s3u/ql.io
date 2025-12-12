# ql.io Modern Console

A modern, React-based web console for ql.io with enhanced developer experience.

## Features

- 🎨 **Modern UI** - Clean, responsive interface built with React + Ant Design
- 📝 **Advanced Editor** - Monaco Editor with SQL syntax highlighting and auto-completion
- 📊 **Rich Results** - Table and JSON views with export functionality
- 🔍 **Table Browser** - Interactive sidebar showing available tables
- ⚡ **Real-time** - Live query execution with loading states
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- 🎯 **Keyboard Shortcuts** - Ctrl+Enter to execute queries
- 💾 **Export Data** - Download results as JSON

## Quick Start

1. **Install dependencies:**
   ```bash
   cd console-ui
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Start ql.io backend:**
   ```bash
   # In project root
   node bin/minimal-server.js
   ```

4. **Open browser:**
   - Modern Console: http://localhost:3001
   - API Server: http://localhost:3000

## Architecture

```
console-ui/
├── src/
│   ├── components/          # React components
│   │   ├── SqlEditor.tsx    # Monaco-based SQL editor
│   │   ├── ResultsViewer.tsx # Results display with table/JSON views
│   │   └── TableBrowser.tsx  # Sidebar table browser
│   ├── services/
│   │   └── api.ts           # API client for ql.io backend
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── package.json
└── vite.config.ts           # Vite configuration with proxy
```

## API Integration

The console connects to the ql.io backend via proxy configuration:

- **Frontend:** http://localhost:3001 (Vite dev server)
- **Backend:** http://localhost:3000 (ql.io API server)
- **Proxy:** `/api/*` → `http://localhost:3000/*`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Key Dependencies

- **React 18** - Modern React with hooks
- **Monaco Editor** - VS Code editor in the browser
- **Ant Design** - Professional UI components
- **React Query** - Data fetching and caching
- **Axios** - HTTP client
- **TypeScript** - Type safety

## Comparison with Legacy Console

| Feature | Legacy Console | Modern Console |
|---------|---------------|----------------|
| **Framework** | jQuery + EJS | React + TypeScript |
| **Editor** | CodeMirror 3.x | Monaco Editor (VS Code) |
| **UI Library** | Custom CSS | Ant Design |
| **Build System** | Browserify | Vite |
| **Mobile Support** | Limited | Fully responsive |
| **Export Data** | No | JSON export |
| **Keyboard Shortcuts** | Basic | Ctrl+Enter execution |
| **Loading States** | Basic | Rich loading indicators |
| **Error Handling** | Basic | Detailed error messages |

## Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Serve static files:**
   ```bash
   # Option 1: Use Vite preview
   npm run preview
   
   # Option 2: Serve dist/ with any static server
   npx serve dist
   ```

3. **Configure backend proxy** in production environment

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow TypeScript best practices
2. Use Ant Design components when possible
3. Add proper error handling
4. Test with museum API demo tables
5. Ensure mobile responsiveness