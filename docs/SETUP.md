# Development Setup Guide - AlteonV1

This guide will help you set up the AlteonV1 development environment on your local machine.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** (v8 or higher)
   - Usually comes with Node.js
   - Verify installation: `npm --version`

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation: `git --version`

4. **Oracle Instant Client** (for database connection)
   - Download from [Oracle Downloads](https://www.oracle.com/database/technologies/instant-client/downloads.html)
   - Extract to a directory and add to PATH

### Optional Software

- **VS Code** - Recommended IDE with extensions
- **Postman** - For API testing
- **Oracle SQL Developer** - For database management

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Creator101-commits/AlteonV1.git
cd AlteonV1
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Navigate to the main application
cd ProductivityHub/ProductivityHub

# Install application dependencies
npm install
```

### 3. Environment Configuration

Create a `.env` file in `ProductivityHub/ProductivityHub/`:

```env
# Database Configuration
ORACLE_USER=your_oracle_username
ORACLE_PASSWORD=your_oracle_password
ORACLE_CONNECTION_STRING=your_oracle_connection_string
ORACLE_WALLET_PATH=./server/oracle_wallet

# Alternative: PostgreSQL (if not using Oracle)
DATABASE_URL=postgresql://username:password@localhost:5432/alteon

# AI Services
GROQ_API_KEY=your_groq_api_key

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef

# Google APIs
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# Microsoft Graph API
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:5173/auth/microsoft/callback

# Notion Integration
NOTION_API_KEY=your_notion_api_key

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 4. Database Setup

#### Option A: Oracle Cloud Database (Recommended)

1. **Create Oracle Cloud Account**
   - Sign up at [Oracle Cloud](https://cloud.oracle.com/)
   - Create a new Autonomous Database

2. **Download Wallet**
   - Download the wallet files from your Oracle Cloud console
   - Extract to `ProductivityHub/ProductivityHub/server/oracle_wallet/`

3. **Set Up Schema**
   ```bash
   node server/setup-oracle-schema.cjs
   ```

4. **Test Connection**
   ```bash
   node test-oracle-connection.cjs
   ```

#### Option B: PostgreSQL (Alternative)

1. **Install PostgreSQL**
   - Download from [postgresql.org](https://www.postgresql.org/download/)
   - Create a database named `alteon`

2. **Run Migrations**
   ```bash
   npm run db:migrate
   ```

### 5. External Services Setup

#### Firebase Authentication

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication with Google provider

2. **Get Configuration**
   - Copy the Firebase config values to your `.env` file
   - Download `firebase-config.json` if needed

#### Groq AI

1. **Sign Up for Groq**
   - Go to [Groq Console](https://console.groq.com/)
   - Create an account and get your API key

2. **Add API Key**
   - Add your Groq API key to the `.env` file

#### Google APIs (Optional)

1. **Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google Classroom and Calendar APIs
   - Create OAuth 2.0 credentials

#### Microsoft Graph (Optional)

1. **Azure Portal**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Register a new application
   - Get client ID and secret

#### Notion Integration (Optional)

1. **Notion Developer**
   - Go to [Notion Developers](https://developers.notion.com/)
   - Create an integration and get API key

### 6. Start Development Server

```bash
# Start both frontend and backend
npm run dev

# Or start them separately
npm run dev:client  # Frontend only (port 5173)
npm run dev:server  # Backend only (port 5000)
```

### 7. Verify Setup

1. **Frontend**: Open http://localhost:5173
2. **Backend API**: Test http://localhost:5000/api/health
3. **Database**: Check console logs for successful connections

## Development Workflow

### File Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── charts/         # Chart components
│   └── tools/          # Feature-specific components
├── pages/              # Page components
├── contexts/           # React contexts
├── lib/                # Utility libraries
├── hooks/              # Custom React hooks
└── types/              # TypeScript type definitions

server/
├── routes.ts           # API routes
├── oracle-storage.ts   # Database operations
├── oracle-database.ts  # Database connection
├── migrations/         # Database schemas
└── middleware/         # Express middleware
```

### Coding Standards

1. **TypeScript**: Use strict typing for all code
2. **ESLint**: Follow the configured ESLint rules
3. **Prettier**: Use Prettier for code formatting
4. **Commits**: Use conventional commit messages

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## Troubleshooting

### Common Issues

#### Oracle Database Connection Issues

**Error**: `ORA-12541: TNS:no listener`
```bash
# Check if Oracle client is installed
oracledb.initOracleClient

# Verify wallet files are in correct location
ls -la server/oracle_wallet/
```

**Error**: `ORA-01017: invalid username/password`
- Verify credentials in `.env` file
- Check if user exists in Oracle database

#### Firebase Authentication Issues

**Error**: `Firebase App not initialized`
```javascript
// Ensure Firebase is properly initialized
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
```

#### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`
```bash
# Kill process using the port
lsof -ti:5000 | xargs kill -9

# Or use a different port
PORT=5001 npm run dev:server
```

#### Node Modules Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
DEBUG=alteon:* npm run dev

# Or for specific modules
DEBUG=alteon:database npm run dev
```

### Performance Issues

1. **Slow Database Queries**
   - Check database indexes
   - Use connection pooling
   - Optimize SQL queries

2. **Frontend Performance**
   - Use React DevTools Profiler
   - Check for unnecessary re-renders
   - Optimize bundle size

## Contributing

### Before Submitting

1. **Run Tests**: `npm test`
2. **Lint Code**: `npm run lint`
3. **Format Code**: `npm run format`
4. **Build**: `npm run build`

### Pull Request Process

1. Create a feature branch
2. Make your changes
3. Add tests if needed
4. Update documentation
5. Submit pull request

## Additional Resources

- [API Documentation](API.md)
- [Component Library](https://ui.shadcn.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Oracle Database Documentation](https://docs.oracle.com/en/database/)

## Getting Help

- **GitHub Issues**: [Report bugs or ask questions](https://github.com/Creator101-commits/AlteonV1/issues)
- **Discord**: [Join our community](https://discord.gg/alteon)
- **Email**: support@alteon.com

---

Happy coding! 