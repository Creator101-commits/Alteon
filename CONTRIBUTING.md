# Contributing to Alteon

Thank you for your interest in contributing to Alteon! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- Git
- Oracle Instant Client (for database connection)

### Setup

1. **Fork the Repository**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Alteon.git
   cd Alteon
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd ProductivityHub/ProductivityHub
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Fill in the required environment variables
   - See [SETUP.md](ProductivityHub/ProductivityHub/docs/SETUP.md) for detailed instructions

4. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Process

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

Examples:
- `feature/ai-summarization`
- `fix/mood-tracker-save-issue`
- `docs/api-documentation`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Examples:
```
feat(auth): add Google OAuth integration
fix(database): resolve Oracle connection timeout
docs(api): update endpoint documentation
```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Define proper types for all functions and variables
- Use interfaces for object shapes
- Prefer `const` over `let`, avoid `var`

```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
}

const createUser = (userData: Omit<User, 'id'>): User => {
  return {
    id: generateId(),
    ...userData
  };
};

// Bad
const createUser = (userData: any) => {
  return userData;
};
```

### React Components

- Use functional components with hooks
- Use TypeScript interfaces for props
- Follow the single responsibility principle
- Use meaningful component and prop names

```typescript
// Good
interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  children,
  onClick,
  disabled = false
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Bad
export const Button = (props) => {
  return <button {...props} />;
};
```

### Database Operations

- Use prepared statements for all queries
- Handle errors gracefully
- Use transactions for multiple related operations
- Follow the repository pattern

```typescript
// Good
export class UserRepository {
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const result = await executeQuery(
        'INSERT INTO users (id, email, name) VALUES (:id, :email, :name)',
        {
          id: generateId(),
          email: userData.email,
          name: userData.name
        }
      );
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new Error('User creation failed');
    }
  }
}
```

### Error Handling

- Use specific error types
- Provide meaningful error messages
- Log errors appropriately
- Handle errors at the appropriate level

```typescript
// Good
export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateUser = (userData: any): UserData => {
  if (!userData.email) {
    throw new ValidationError('Email is required', 'email');
  }
  
  if (!isValidEmail(userData.email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
  
  return userData;
};
```

## Testing

### Unit Tests

- Write tests for all public functions
- Aim for high code coverage
- Use descriptive test names
- Test both success and error cases

```typescript
// Good
describe('UserRepository', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };
      
      const user = await userRepository.createUser(userData);
      
      expect(user).toMatchObject({
        email: userData.email,
        name: userData.name
      });
      expect(user.id).toBeDefined();
    });
    
    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User'
      };
      
      await expect(userRepository.createUser(userData))
        .rejects
        .toThrow('Invalid email format');
    });
  });
});
```

### Integration Tests

- Test API endpoints
- Test database operations
- Test external service integrations
- Use test databases

### End-to-End Tests

- Test critical user workflows
- Test cross-browser compatibility
- Test mobile responsiveness

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- UserRepository.test.ts
```

## Pull Request Process

### Before Submitting

1. **Ensure Tests Pass**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

2. **Update Documentation**
   - Update README.md if needed
   - Add/update API documentation
   - Update inline code comments

3. **Check Code Quality**
   - Run ESLint and fix issues
   - Ensure TypeScript compiles without errors
   - Check for security vulnerabilities

### Pull Request Template

Use this template when creating a pull request:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code is properly commented
- [ ] Documentation updated
- [ ] No new warnings or errors

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Related Issues
Fixes #(issue number)
```

### Review Process

1. **Automated Checks**
   - All tests must pass
   - Code must pass linting
   - Build must succeed

2. **Code Review**
   - At least one maintainer review required
   - Address all review comments
   - Ensure code quality and standards

3. **Approval and Merge**
   - Maintainer approval required
   - Merge using "Squash and merge" for feature branches
   - Delete feature branch after merge

## Issue Guidelines

### Bug Reports

Use this template for bug reports:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Windows 10, macOS 12.0]
 - Browser: [e.g. Chrome 91, Firefox 89]
 - Node.js version: [e.g. 18.0.0]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

Use this template for feature requests:

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## Development Tools

### Recommended VS Code Extensions

- TypeScript Importer
- ESLint
- Prettier
- GitLens
- REST Client
- Oracle Developer Tools

### Useful Commands

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check

# Build for production
npm run build

# Start development server
npm run dev

# Database operations
npm run db:migrate
npm run db:seed
npm run db:reset
```

## Community

### Getting Help

- **GitHub Discussions**: Use for questions and general discussion
- **Discord**: Join our community server for real-time chat
- **Issues**: Use for bug reports and feature requests

### Contributing Guidelines

- Be respectful and constructive
- Help others when you can
- Share knowledge and best practices
- Report issues promptly
- Contribute to documentation

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to Alteon! 
