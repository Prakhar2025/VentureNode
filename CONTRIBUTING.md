# Contributing to VentureNode

Thanks for your interest in contributing! VentureNode is an open-source project and we welcome contributions of all kinds.

## How to Contribute

1. **Fork** the repository and create your feature branch from `main`.
2. Make your changes with clean, documented code.
3. Make sure your change doesn't break existing functionality.
4. Open a **Pull Request** with a clear description of what you changed and why.

## Development Guidelines

- Python code must follow PEP 8. Format with `black`.
- React/Next.js code must use TypeScript and follow the existing component structure.
- Never hardcode API keys. Always use `os.getenv` or Next.js env systems.
- Each agent must remain independent and testable in isolation.

## Reporting Bugs

Please file a GitHub Issue with:
- A clear title describing the problem
- Steps to reproduce
- Expected vs. actual behavior
- Your environment (OS, Python/Node versions)
