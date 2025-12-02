# Alteon

Alteon is a comprehensive, AI-powered productivity platform designed specifically for students. It combines intelligent note-taking, calendar management, assignment tracking, and AI assistance to create a unified academic workspace

![Architecture Diagram](images/software_architecture_diagram.png)

## System Architecture

Alteon follows a modern, cloud-native architecture designed for scalability, performance, and reliability. The system is built using a microservices approach with clear separation between frontend, backend, and data layers.

### Architecture Overview

The application architecture consists of six main components working together to deliver a seamless user experience:

**1. Front-End Deployment Layer**
- **Vercel**: Primary hosting platform for the React application, providing global CDN, automatic deployments, and serverless functions
- **Cloudflare**: Additional security layer offering DDoS protection, web application firewall (WAF), and performance optimization
- **Google Analytics**: User behavior tracking and application usage insights

**2. Front-End Technology Stack**
- **TypeScript**: Type-safe development ensuring code reliability and maintainability
- **Vite**: Lightning-fast build tool and development server for optimal developer experience
- **React**: Component-based UI framework for building interactive user interfaces
- **Tailwind CSS**: Utility-first CSS framework for rapid, consistent styling

**3. Authentication & External APIs**
- **Firebase SSO**: Secure authentication service supporting multiple login methods (Google, email/password)
- **Firebase SDK**: Client-side integration for real-time features and user management
- **Groq AI API**: Advanced AI capabilities for content summarization, chat assistance, and smart study recommendations
- **Google API Services**: Integration with Google Calendar, Classroom, and other productivity tools

**4. Back-End Technology Stack**
- **Node.js**: JavaScript runtime environment for server-side application logic
- **Express.js**: Minimalist web framework for building robust APIs and handling HTTP requests
- **Drizzle ORM**: Type-safe database toolkit for seamless database operations and migrations
- **WebSocket**: Real-time bidirectional communication for live updates and collaborative features

**5. Back-End Deployment Infrastructure**
- **Render**: Cloud platform hosting the Node.js backend with automatic scaling and deployment
- **Vercel Edge Network**: Global content delivery network ensuring low-latency API responses worldwide

**6. Database Layer**
- **Oracle Cloud Database**: Primary production database offering enterprise-grade reliability, security, and performance
- **PostgreSQL**: Development and backup database solution providing flexibility and local development support

### Data Flow Architecture

The system follows a unidirectional data flow pattern:

1. **User Interaction**: Users interact with the React frontend hosted on Vercel
2. **Authentication**: Firebase handles user authentication and session management
3. **API Communication**: Frontend communicates with the Express.js backend via RESTful APIs
4. **External Services**: Backend integrates with AI services (Groq) and Google APIs for enhanced functionality
5. **Data Persistence**: All application data is stored in Oracle Cloud Database with PostgreSQL as fallback
6. **Real-time Updates**: WebSocket connections enable live collaboration and instant notifications

### Infrastructure Benefits

**Scalability**: The architecture can handle growing user loads through cloud-native scaling
**Performance**: Global CDN and edge computing ensure fast response times worldwide  
**Reliability**: Multiple database options and cloud providers minimize downtime risk
**Security**: Multi-layered security with Cloudflare protection and Firebase authentication
**Developer Experience**: Modern tooling and TypeScript ensure maintainable, bug-free code
**Cost Efficiency**: Optimized use of free tiers and pay-as-you-scale pricing models

## Features

### Smart Note-Taking
- **Rich Text Editor**: Google Docs-style editor powered by Slate.js with comprehensive formatting options
- **AI Writing Assistant**: Minimalistic black-and-white AI sidebar that helps write, edit, and improve notes
- **Context-Aware AI**: AI receives note title, content, and category for intelligent suggestions
- **Coding Agent-Style Editing**: View proposed changes with line count diff (plus/minus lines) before accepting
- **Accept/Reject Changes**: Review AI edits with preview window before applying to notes
- **Clean Text Formatting**: Automatic removal of markdown symbols (asterisks, underscores, backticks) when inserting AI content
- **Text Formatting**: Bold, italic, underline, strikethrough, code, headings, and more
- **Advanced Features**: Lists (ordered/unordered), blockquotes, tables, and alignment options
- **Organization**: Categorize notes by type (lecture, homework, study, research, project, exam, general)
- **Search & Filter**: Powerful search across all notes with category and class filters
- **Pinning System**: Pin important notes for quick access
- **Class Integration**: Link notes to specific classes for better organization
- **Auto-Save**: Continuous auto-saving every 3 seconds with last saved timestamp
- **Color Customization**: Assign colors to notes for visual organization
- **Print Support**: Print notes directly from the editor

### AI Chat Assistant
- **Groq AI Integration**: Powered by llama-3.1-8b-instant and llama-3.1-70b-versatile models
- **Multi-Purpose Chat**: Ask questions, get explanations, and receive study help
- **Content Summarization**: Summarize text, PDFs, and YouTube videos
- **AI Note Assistant**: Integrated directly into note editor for seamless writing help
- **Quick Actions**: Pre-defined prompts for common tasks (write intro, edit note, expand, outline)
- **Smart Insert**: Insert AI-generated content directly into notes with proper formatting
- **Copy Functionality**: Easy copy-to-clipboard for AI responses
- **Message History**: Keep track of conversation context for better AI responses
- **Loading States**: Clear visual feedback during AI processing

### Calendar & Scheduling
- **Unified Calendar**: View all events, assignments, and classes in one place
- **Google Calendar Sync**: Two-way synchronization with Google Calendar
- **Auto-Sync**: Automatic background synchronization every 5 minutes
- **Manual Sync**: On-demand sync with visual feedback
- **Smart Scheduling**: AI-powered optimal study time suggestions
- **Event Management**: Create, edit, and manage calendar events with full CRUD operations
- **Assignment Integration**: Automatic due date tracking linked to calendar
- **Multiple Views**: Month, week, and day views for flexible planning
- **Color Coding**: Visual distinction between different event types

### Assignment Management
- **Assignment Tracking**: Comprehensive tracking of homework, projects, and exams
- **Priority System**: Mark assignments by priority (low, medium, high)
- **Status Management**: Track completion status (pending, in-progress, completed, overdue)
- **Class Integration**: Link assignments to specific classes with color coding
- **Due Date Alerts**: Never miss important deadlines with visual indicators
- **Completion Tracking**: Mark assignments as complete and track progress
- **Filtering**: Filter by status, priority, or class for focused view
- **Calendar Integration**: Assignments automatically appear on calendar

### Study Tools
- **Flashcards**: Create and study flashcards with spaced repetition algorithm
- **Deck Management**: Organize flashcards into decks by subject or topic
- **Study Modes**: Multiple study modes including shuffle and focused review
- **Progress Tracking**: Track which cards have been mastered
- **Pomodoro Timer**: Customizable focus timer with work and break intervals
- **Session History**: View past Pomodoro sessions and total study time
- **Mood Tracking**: Monitor emotional well-being with emoji-based mood entries
- **Mood Analytics**: Visualize mood patterns over time with charts
- **Daily Journal**: Reflect on learning experiences with daily journal entries
- **Habit Tracking**: Build and maintain consistent study habits with visual streaks

### Productivity Features
- **Pomodoro Timer**: 
  - Customizable work and break durations
  - Audio notifications for session transitions
  - Background music support with volume control
  - Session statistics and total time tracking
  - Auto-start next session option
  - Fullscreen focus mode
- **Light Mode Support**: All components optimized for both light and dark themes
- **Theme Consistency**: Uniform black text in light mode, white text in dark mode
- **Responsive Design**: Mobile-friendly interface that adapts to all screen sizes
- **Offline Capability**: Local storage fallback for basic operations without internet

### Analytics & Insights
- **Progress Tracking**: Visualize academic progress with charts and graphs
- **Study Analytics**: Understand study patterns and productivity trends
- **Productivity Metrics**: Track time spent on different activities and subjects
- **Performance Insights**: Identify strengths and areas for improvement
- **Class Performance**: View performance breakdown by class
- **Time Management**: Analyze how time is distributed across subjects

### User Experience
- **Modern UI Design**: Clean, minimalistic interface following modern design principles
- **Glass Morphism**: Beautiful glassmorphic design elements for premium feel
- **Smooth Animations**: Framer Motion animations for delightful interactions
- **Loading States**: Skeleton loaders and loading indicators for better UX
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages
- **Toast Notifications**: Non-intrusive notifications for user feedback
- **Empty States**: Helpful empty state designs with clear call-to-actions
- **Network Status**: Real-time network connectivity indicator
- **Accessibility**: WCAG-compliant components from Radix UI

## Architecture

### Frontend
- **React 18** with TypeScript for type-safe component development
- **Vite** for lightning-fast development and optimized production builds
- **Tailwind CSS** for utility-first styling with custom design system
- **Radix UI** for accessible, unstyled component primitives
- **Framer Motion** for smooth, performant animations and transitions
- **Wouter** for lightweight client-side routing
- **Slate.js** for rich text editing in note editor
- **Recharts** for data visualization and analytics charts
- **Lucide React** for consistent iconography
- **date-fns** for date manipulation and formatting
- **DOMPurify** for sanitizing HTML content
- **React Hook Form** for efficient form management

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **Oracle Cloud Database** (primary) with PostgreSQL fallback
- **Firebase Authentication** for user management
- **RESTful API** with comprehensive endpoints

### Database
- **Oracle Cloud Database** (primary)
- **PostgreSQL** (fallback/development)
- **Comprehensive schema** for users, notes, assignments, classes, and more
- **Data migration support** between database systems

### Integrations
- **Google Calendar API** for two-way calendar synchronization with auto-sync
- **Google Classroom API** for assignment import and tracking
- **Microsoft Graph API** for Outlook calendar integration
- **Groq AI** for intelligent features (llama-3.1-8b-instant, llama-3.1-70b-versatile)
- **Firebase Authentication** for secure user management with Google SSO
- **Firebase Firestore** for real-time data synchronization
- **YouTube API** for video content summarization
- **PDF.js** for PDF document processing and summarization

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- Oracle Instant Client (for full database features)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Creator101-commits/Alteon.git
   cd Alteon
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Navigate to main application
   cd ProductivityHub/ProductivityHub
   
   # Install application dependencies
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in `ProductivityHub/ProductivityHub/`:
   ```env
   # Database Configuration
   ORACLE_USER=your_oracle_username
   ORACLE_PASSWORD=your_oracle_password
   ORACLE_CONNECTION_STRING=your_oracle_connection_string
   ORACLE_WALLET_PATH=./server/oracle_wallet
   
   # Alternative: PostgreSQL
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
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```

4. **Start Development Server**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately
   npm run dev:client  # Frontend (port 5173)
   npm run dev:server  # Backend (port 5000)
   ```

5. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api

## Usage

### Getting Started
1. **Sign Up/Login**: Use Firebase authentication to create your account
2. **Connect Google Calendar**: Link your Google Calendar for seamless integration
3. **Create Classes**: Add your courses and subjects
4. **Start Taking Notes**: Begin organizing your academic content
5. **Track Assignments**: Add homework and project deadlines
6. **Use AI Features**: Leverage AI for study help and content summarization

### Key Workflows

#### Note-Taking with AI
1. Create a new note and select class/category
2. Start writing with rich text formatting
3. Click "AI Assistant" to open the minimalistic sidebar
4. Use quick actions or type custom prompts for help
5. Review AI suggestions with line count diff view
6. Accept changes to update your note or reject to keep original
7. Insert AI content directly into your note with clean formatting

#### Study Session Planning
1. Check your dashboard for upcoming assignments and events
2. Review calendar for the day/week with color-coded events
3. Use AI chat to generate an optimal study plan
4. Start a Pomodoro session with customized work/break intervals
5. Take notes during study with AI writing assistance
6. Track your mood and journal about the session
7. Review analytics to understand study patterns

#### Assignment Management
1. Add assignments with due dates, priority, and linked class
2. View assignments on calendar for timeline visualization
3. Filter assignments by status, priority, or class
4. Mark assignments as in-progress or completed
5. Receive visual alerts for approaching deadlines
6. Track completion progress across all classes

#### Calendar Synchronization
1. Connect your Google Calendar in settings
2. Enable auto-sync for background synchronization every 5 minutes
3. Create events in Alteon that sync to Google Calendar
4. Import events from Google Calendar to Alteon
5. Use manual sync button for immediate synchronization
6. View sync status with visual indicators

## Development

### Project Structure
```
ProductivityHub/ProductivityHub/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (shadcn/ui)
│   │   ├── charts/         # Chart components
│   │   └── tools/          # Feature-specific components
│   ├── pages/              # Page components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility libraries
├── server/
│   ├── routes.ts           # API routes
│   ├── oracle-storage.ts   # Database operations
│   ├── oracle-database.ts  # Database connection
│   └── migrations/         # Database schemas
├── shared/
│   └── schema.ts           # Shared TypeScript schemas
└── docs/                   # Documentation
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

### Database Setup
1. **Oracle Cloud Database** (Recommended)
   - Create Oracle Cloud account
   - Set up Autonomous Database
   - Download wallet files
   - Configure connection strings

2. **PostgreSQL** (Alternative)
   - Install PostgreSQL locally
   - Create database named `alteon`
   - Run migrations

## Configuration

### Google Calendar Integration
1. Enable Google Calendar API in Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add redirect URIs to authorized origins
4. Update environment variables

### AI Services Setup
1. **Groq AI**: Sign up for API key
2. **Firebase**: Create project and enable authentication
3. **Google APIs**: Enable Classroom and Calendar APIs

## API Documentation

The application provides a comprehensive REST API with endpoints for:
- User management and authentication
- Notes CRUD operations
- Assignment tracking
- Calendar event management
- AI-powered features
- Analytics and reporting

See [API Documentation](ProductivityHub/ProductivityHub/docs/API.md) for detailed endpoint information.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use conventional commit messages
- Write tests for new features
- Update documentation as needed

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check the [docs](ProductivityHub/ProductivityHub/docs/) folder
- **Issues**: Report bugs on [GitHub Issues](https://github.com/Creator101-commits/Alteon/issues)
- **Discord**: Join our community for support
- **Email**: support@alteon.com

## Roadmap

### Completed Features
- [x] AI Writing Assistant with coding agent-style diff view
- [x] Context-aware AI suggestions in note editor
- [x] Markdown symbol removal for clean text formatting
- [x] Accept/Reject workflow for AI edits
- [x] Light mode optimization across all components
- [x] Google Calendar auto-sync with background jobs
- [x] Minimalistic black-and-white AI design
- [x] Alteon logo integration throughout app
- [x] Auto-save functionality for notes
- [x] Quick action buttons for common AI tasks
- [x] Real-time network status monitoring
- [x] Comprehensive error handling

### Upcoming Features
- [ ] Mobile app (React Native)
- [ ] Offline support with service workers and local sync
- [ ] Advanced AI tutoring with personalized learning paths
- [ ] Collaborative study groups with real-time editing
- [ ] Integration with Canvas, Moodle, and Blackboard
- [ ] Advanced analytics dashboard with predictive insights
- [ ] Custom study plans generated by AI
- [ ] Voice notes with transcription and AI summarization
- [ ] Browser extension for quick note capture
- [ ] OCR support for handwritten notes
- [ ] Spaced repetition algorithm improvements
- [ ] AI-powered quiz generation from notes
- [ ] Multi-language support
- [ ] Export notes to PDF, Word, and Markdown
- [ ] Video call integration for study groups

### Recent Updates
- AI Writing Assistant integrated into note editor with coding agent-style diff view
- Minimalistic black-and-white design system for AI assistant
- Markdown symbol removal for clean text insertion
- Accept/Reject workflow for AI-proposed changes with line count visualization
- Light mode optimization across all components (Pomodoro, Daily Journal, Mood Tracker)
- Alteon logo integration throughout application (landing page, navigation, footer, sidebar)
- Google Calendar auto-sync with background synchronization
- Enhanced note editor with context-aware AI suggestions
- Quick action buttons for common AI tasks (write intro, edit, expand, outline)
- Improved theme consistency with foreground/background color system
- Auto-save functionality for notes with 3-second intervals
- Comprehensive error handling and loading states
- Real-time network status monitoring
- Mobile-responsive design improvements

## Acknowledgments

- Built with [React](https://reactjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Database operations with [Drizzle ORM](https://orm.drizzle.team/)
- AI integration with [Groq](https://groq.com/)

---

**Alteon** - Empowering students with AI-driven productivity tools. 


