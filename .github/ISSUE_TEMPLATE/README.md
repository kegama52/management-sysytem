# GitHub Issue Templates

This directory contains templates for reporting issues and requesting features.

## Available Templates

- **Bug Report** (`bug_report.md`) - Report a bug or unexpected behavior
- **Feature Request** (`feature_request.md`) - Suggest a new feature or enhancement

## Using Templates

When creating a new issue on GitHub, you'll see prompts to select a template. Choose the appropriate one to provide all necessary information in a structured format.

## Custom Templates

You can add more templates by:
1. Creating a new `.md` file in this directory
2. Adding `name: "Template Name"` and `about: "Brief description"` YAML frontmatter

Example:
```yaml
---
name: "Security Issue"
about: "Report a security vulnerability or concern"
---
```
