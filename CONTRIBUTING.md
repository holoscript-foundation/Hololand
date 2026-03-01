# Contributing to Hololand

First off, thank you for considering contributing to Hololand! 🎉

It's people like you that make Hololand such a great tool for building the metaverse together.

## 🌟 Ways to Contribute

There are many ways to contribute to Hololand:

- 🐛 **Report bugs** - Found an issue? Let us know!
- 💡 **Suggest features** - Have an idea? We'd love to hear it!
- 📝 **Improve documentation** - Help others understand Hololand better
- 🔧 **Write code** - Fix bugs or implement new features
- 🎨 **Create examples** - Build demo VR worlds to inspire others
- 💬 **Help others** - Answer questions in discussions
- ⭐ **Spread the word** - Star the repo and share with others

## 🚀 Getting Started

### 1. Fork the Repository

Click the "Fork" button at the top right of the repository page.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR-USERNAME/Hololand.git
cd Hololand
```

### 3. Set Up Development Environment

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### 4. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes
- `chore/` - Maintenance tasks

## 📝 Development Guidelines

### HoloScript File Types

**Which format should I use for my contribution?**
- **`.holo`** → Examples, tutorials, simple demos
- **`.hsplus`** → Systems, production features, anything needing multiplayer/physics

> 📖 Details: [docs/HOLOSCRIPT_FILE_TYPES.md](docs/HOLOSCRIPT_FILE_TYPES.md)

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Code will be automatically formatted (follow existing patterns)
- **Naming**: Use clear, descriptive names for variables and functions
- **Comments**: Add comments for complex logic, but prefer self-documenting code

### TypeScript Best Practices

```typescript
// ✅ Good: Clear types and names
interface SpatialObjectConfig {
  type: string;
  position: Vector3;
  physics?: PhysicsConfig;
}

function createObject(config: SpatialObjectConfig): SpatialObject {
  // Implementation
}

// ❌ Bad: Unclear types and names
function create(cfg: any): any {
  // Implementation
}
```

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Test both success and error cases
- Test edge cases

```bash
# Run tests
pnpm test

# Run tests for specific package
cd packages/renderer
pnpm test
```

### Documentation

- Update README.md if you change user-facing behavior
- Add JSDoc comments for public APIs
- Update type definitions
- Add examples for new features

Example JSDoc:

```typescript
/**
 * Creates a new spatial object in the world
 *
 * @param config - Configuration for the spatial object
 * @returns The created SpatialObject instance
 *
 * @example
 * ```typescript
 * const ball = world.addObject({
 *   type: 'sphere',
 *   position: { x: 0, y: 5, z: 0 },
 *   physics: { enabled: true, mass: 1 }
 * });
 * ```
 */
function addObject(config: SpatialObjectConfig): SpatialObject {
  // Implementation
}
```

## 🐛 Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

### Bug Report Template

When creating a bug report, include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Detailed steps to reproduce the behavior
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**:
   - OS: [e.g., Windows 10, macOS 13]
   - Browser: [e.g., Chrome 120, Firefox 121]
   - VR Headset: [e.g., Quest 2, if applicable]
   - Package Version: [e.g., @hololand/renderer@1.0.0-alpha.1]
6. **Code Sample**: Minimal code to reproduce the issue
7. **Screenshots**: If applicable

## 💡 Suggesting Features

We love feature suggestions! Before creating one:

1. Check if it's already been suggested
2. Consider if it fits Hololand's vision
3. Think about implementation complexity

### Feature Request Template

When suggesting a feature, include:

1. **Problem**: What problem does this solve?
2. **Proposed Solution**: How would you solve it?
3. **Alternatives**: What alternatives have you considered?
4. **Use Cases**: Real-world scenarios where this would be useful
5. **Implementation Ideas**: (Optional) How might this be implemented?

## 🔧 Pull Request Process

### Before Submitting

- [ ] Code follows the style guidelines
- [ ] Tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation is updated
- [ ] Commit messages follow conventions

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```bash
# Feature
git commit -m "feat(renderer): add shadow mapping support"

# Bug fix
git commit -m "fix(world): correct collision detection for rotated objects"

# Documentation
git commit -m "docs(readme): add WebXR setup instructions"

# With body
git commit -m "feat(react-three): add usePhysics hook

Adds a new hook for controlling physics simulation.
Allows users to pause/resume physics from React components.

Closes #123"
```

### Submitting the PR

1. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub

3. **Fill out the PR template** with:
   - Description of changes
   - Related issues
   - Testing done
   - Screenshots (if UI changes)

4. **Wait for review**:
   - Maintainers will review your PR
   - Address any feedback
   - Once approved, it will be merged!

### PR Title Format

```
type(scope): description
```

Example: `feat(renderer): add VR controller support`

## 📦 Package-Specific Guidelines

### @hololand/core

- Keep zero dependencies
- Maintain backward compatibility
- Document breaking changes

### @hololand/renderer

- Test with multiple browsers
- Verify WebXR compatibility
- Include performance benchmarks for changes

### @hololand/react-three

- Follow React best practices
- Test with React 18+
- Ensure hooks don't cause unnecessary re-renders

### @hololand/world

- Maintain physics accuracy
- Profile performance-critical code
- Test with large object counts

## 🎨 Creating Examples

Examples help others learn Hololand! To contribute an example:

1. Create a new directory in `examples/`
2. Include:
   - `README.md` - Explanation and instructions
   - Working code
   - Screenshots or video
3. Keep it simple and focused on one concept
4. Add comments explaining key concepts

## 🤝 Code of Conduct

### Our Pledge

We pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Examples of behavior that contributes to a positive environment**:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes**:

- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

## ❓ Questions?

- 💬 **Discussions**: Ask in [GitHub Discussions](https://github.com/brianonbased-dev/Hololand/discussions)
- 🐛 **Issues**: File an [issue](https://github.com/brianonbased-dev/Hololand/issues)
- 📧 **Email**: (Add your contact email if desired)

## 📄 License

By contributing, you agree that your contributions will be licensed under the Elastic License 2.0.

## 🙏 Thank You!

Every contribution, no matter how small, makes a difference. Thank you for being part of the Hololand community! 🎉

---

**Happy Coding!** 🥽✨
