# Contributing to Bitcoin Sanction Detection Microservice

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [Issues](https://github.com/your-username/bitcoin-sanction-detector/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-username/bitcoin-sanction-detector/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (optional)

### Local Development
```bash
# Clone your fork
git clone https://github.com/your-username/bitcoin-sanction-detector.git
cd bitcoin-sanction-detector

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use async/await instead of callbacks
- Add comprehensive error handling

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Testing

- Write tests for new functionality
- Ensure all tests pass before submitting
- Aim for good test coverage
- Use meaningful test descriptions

### API Documentation

- Add Swagger/OpenAPI annotations for new endpoints
- Include request/response examples
- Document all parameters and response fields
- Test the documentation in Swagger UI

## Feature Requests

We use GitHub issues to track feature requests. When proposing a new feature:

1. **Check existing issues** to avoid duplicates
2. **Provide context** - explain the problem you're trying to solve
3. **Describe the solution** - what you'd like to happen
4. **Consider alternatives** - describe alternatives you've considered
5. **Additional context** - add any other context or screenshots

## Security

If you discover a security vulnerability, please send an e-mail to the maintainers instead of using the issue tracker. All security vulnerabilities will be promptly addressed.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## Questions?

Don't hesitate to ask questions by opening an issue or reaching out to the maintainers directly.

Thank you for contributing! 🚀
