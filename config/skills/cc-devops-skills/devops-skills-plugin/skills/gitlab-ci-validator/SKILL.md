---
name: gitlab-ci-validator
description: Comprehensive toolkit for validating, linting, testing, and securing GitLab CI/CD pipeline configurations. Use this skill when working with GitLab CI/CD pipelines, validating pipeline syntax, debugging configuration issues, or implementing best practices.
---

# GitLab CI/CD Validator

Comprehensive toolkit for validating, linting, testing, and securing GitLab CI/CD pipeline configurations (.gitlab-ci.yml files). Use this skill when working with GitLab CI/CD pipelines, validating pipeline syntax, debugging configuration issues, implementing best practices, or performing security audits.

## When to Use This Skill

Use the **gitlab-ci-validator** skill in the following scenarios:

- ✅ Working with `.gitlab-ci.yml` files
- ✅ Validating GitLab CI/CD pipeline syntax and structure
- ✅ Debugging pipeline configuration errors
- ✅ Implementing GitLab CI/CD best practices
- ✅ Performing security audits on pipeline configurations
- ✅ Checking for hardcoded secrets or credentials
- ✅ Optimizing pipeline performance (cache, DAG, parallel execution)
- ✅ Ensuring compliance with security standards
- ✅ Code review of GitLab CI/CD configurations
- ✅ Migrating or refactoring pipeline configurations

## Features

### 1. Syntax Validation
- ✅ YAML syntax checking
- ✅ GitLab CI schema validation
- ✅ Required fields verification
- ✅ Job naming conventions
- ✅ Stage reference validation
- ✅ Dependency validation (needs, dependencies, extends)
- ✅ Rules and conditional logic validation
- ✅ Artifact and cache configuration validation

### 2. Best Practices Checking
- ✅ Cache usage for dependency installation
- ✅ Artifact expiration settings
- ✅ Proper use of 'needs' vs 'dependencies'
- ✅ Use of 'rules' vs deprecated 'only'/'except'
- ✅ Interruptible job configuration
- ✅ Retry configuration
- ✅ Timeout settings
- ✅ Docker image version pinning
- ✅ DAG (Directed Acyclic Graph) optimization opportunities
- ✅ Parallel execution opportunities
- ✅ Resource optimization (resource_group)
- ✅ Environment configuration
- ✅ Template usage with 'extends'

### 3. Security Scanning
- ✅ Hardcoded secrets and credentials detection
- ✅ Secrets exposure in logs
- ✅ Insecure Docker image usage (:latest tags)
- ✅ Dangerous script patterns (curl | bash, eval, chmod 777)
- ✅ Insecure dependency installation
- ✅ Variable security (masked, protected variables)
- ✅ Include security (unpinned references)
- ✅ Artifact security (overly broad paths)
- ✅ SSL/TLS verification bypasses
- ✅ Debug mode warnings
- ✅ **NEW:** Component include validation (GitLab 17.0+)
- ✅ **NEW:** All include types (component, project, remote, local, template)

## Core Validation Workflow

Follow this workflow when validating GitLab CI/CD pipelines to catch issues early and ensure configuration quality:

### 1. Initial Validation (Syntax & Schema)

Start with syntax validation to catch YAML errors, schema violations, and structural issues:

```bash
# Quick syntax check (fastest)
bash scripts/validate_gitlab_ci.sh --syntax-only .gitlab-ci.yml
```

**What it checks:**
- YAML syntax and structure
- GitLab CI schema compliance
- Job definitions and required fields
- Stage references and dependencies
- Include configurations (component, project, remote, local, template)
- Component format and version validation
- Circular dependency detection
- GitLab limits (500 jobs max, 255 char job names, 50 max needs, 100 max components)

**Action:** Fix all syntax errors before proceeding.

### 2. Best Practices Review

After passing syntax validation, check for optimization opportunities and best practices:

```bash
# Best practices analysis
bash scripts/validate_gitlab_ci.sh --best-practices .gitlab-ci.yml
```

**What it checks:**
- Cache usage for dependency installation
- Artifact expiration settings
- DAG optimization with 'needs'
- Parallel execution opportunities
- Image version pinning
- Deprecated syntax (only/except → rules)
- Resource optimization
- Missing timeouts and retries

**Action:** Review suggestions and apply relevant optimizations.

### 3. Security Audit

Perform a comprehensive security scan to identify vulnerabilities:

```bash
# Security scan
bash scripts/validate_gitlab_ci.sh --security-only .gitlab-ci.yml
```

**What it checks:**
- Hardcoded secrets and credentials
- Component security (version pinning, trusted sources)
- Remote include integrity
- Insecure script patterns (curl | bash, eval)
- SSL/TLS verification bypasses
- Dangerous file permissions
- Artifact security
- Variable masking
- Path traversal in local includes

**Action:** Fix all critical and high-severity security issues immediately.

### 4. Local Pipeline Testing (Optional)

For complex changes, test pipeline execution locally before pushing:

```bash
# Install gitlab-ci-local first (requires Docker and Node.js)
bash scripts/install_tools.sh

# Test pipeline locally
gitlab-ci-local

# Or via the validator script
bash scripts/validate_gitlab_ci.sh --test-only .gitlab-ci.yml
```

**What it does:**
- Simulates pipeline execution locally
- Tests job ordering and dependencies
- Validates environment setup
- Catches runtime errors early

**Note:** Requires Docker and gitlab-ci-local installation.

### 5. Complete Validation

Run all validators together for comprehensive checking:

```bash
# Full validation pipeline
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml

# Strict mode (fail on warnings)
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml --strict
```

### Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Syntax Validation (Required)                             │
│    ├─ YAML structure                                         │
│    ├─ Schema compliance                                      │
│    ├─ Include validation (component, project, etc.)         │
│    └─ Component format & version                            │
│         ↓                                                    │
│    Fix errors → Proceed                                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Best Practices (Recommended)                             │
│    ├─ Cache optimization                                     │
│    ├─ DAG opportunities                                      │
│    ├─ Image pinning                                          │
│    └─ Resource optimization                                  │
│         ↓                                                    │
│    Review & apply → Proceed                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Security Audit (Required)                                │
│    ├─ Hardcoded secrets                                     │
│    ├─ Component security                                     │
│    ├─ Include integrity                                      │
│    └─ Dangerous patterns                                     │
│         ↓                                                    │
│    Fix critical issues → Proceed                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Local Testing (Optional)                                 │
│    └─ gitlab-ci-local execution                             │
│         ↓                                                    │
│    Test & verify → Push                                      │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Validation

To validate a GitLab CI/CD configuration file:

```bash
bash .claude/skills/gitlab-ci-validator/scripts/validate_gitlab_ci.sh <file-path>
```

**Example:**
```bash
bash .claude/skills/gitlab-ci-validator/scripts/validate_gitlab_ci.sh .gitlab-ci.yml
```

This runs all three validation layers:
1. Syntax validation
2. Best practices check
3. Security scan

### Validation Options

```bash
# Run only syntax validation
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml --syntax-only

# Run only best practices check
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml --best-practices

# Run only security scan
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml --security-only

# Skip best practices check
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml --no-best-practices

# Skip security scan
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml --no-security

# Strict mode (fail on warnings)
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml --strict
```

### Individual Validators

You can also run individual validation scripts:

```bash
# Syntax validation
python3 scripts/validate_syntax.py .gitlab-ci.yml

# Best practices check
python3 scripts/check_best_practices.py .gitlab-ci.yml

# Security scan
python3 scripts/check_security.py .gitlab-ci.yml
```

## Output Example

```
════════════════════════════════════════════════════════════════════════════════
  GitLab CI/CD Validator
════════════════════════════════════════════════════════════════════════════════

File: .gitlab-ci.yml

[1/3] Running syntax validation...

✓ Syntax validation passed

[2/3] Running best practices check...

SUGGESTIONS (2):
──────────────────────────────────────────────────────────────────────────────
  SUGGESTION: Line 15: Job 'build_app' installs dependencies but doesn't use cache [cache-missing]
  💡 Suggestion: Add 'cache' configuration to speed up dependency installation

  SUGGESTION: Line 42: Job 'deploy_production' should use resource_group [missing-resource-group]
  💡 Suggestion: Add 'resource_group' to prevent concurrent deployments

⚠  Best practices check found issues

[3/3] Running security scan...

MEDIUM SEVERITY (1):
──────────────────────────────────────────────────────────────────────────────
  MEDIUM: Line 8: Using ':latest' tag in job 'test_job' is a security risk [image-latest-tag]
  🔒 Remediation: Pin to specific version or SHA digest

✓ Security scan passed

════════════════════════════════════════════════════════════════════════════════
  Validation Summary
════════════════════════════════════════════════════════════════════════════════

Syntax Validation:      PASSED
Best Practices:         WARNINGS
Security Scan:          PASSED

════════════════════════════════════════════════════════════════════════════════

✓ All validation checks passed
```

## Common Validation Scenarios

### Scenario 1: Validating a New Pipeline

```bash
# Validate syntax and structure
bash scripts/validate_gitlab_ci.sh new-pipeline.gitlab-ci.yml
```

### Scenario 2: Security Audit Before Merge

```bash
# Run security scan only with strict mode
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml --security-only --strict
```

### Scenario 3: Pipeline Optimization

```bash
# Check for best practices and optimization opportunities
bash scripts/validate_gitlab_ci.sh .gitlab-ci.yml --best-practices
```

### Scenario 4: CI/CD Integration

```bash
# In your CI/CD pipeline
stages:
  - validate

validate_pipeline:
  stage: validate
  script:
    - pip3 install PyYAML
    - bash .claude/skills/gitlab-ci-validator/scripts/validate_gitlab_ci.sh .gitlab-ci.yml --strict
```

## Integration with Claude Code

When Claude Code invokes this skill, it will:

1. **Automatically detect** `.gitlab-ci.yml` files in the project
2. **Run validation** when you ask to validate, check, or review GitLab CI/CD configurations
3. **Provide actionable feedback** with line numbers and suggestions
4. **Fetch additional documentation** from Context7 or web sources when needed for custom GitLab features

**Example prompts:**
- "Validate my GitLab CI pipeline"
- "Check this .gitlab-ci.yml for security issues"
- "Review my pipeline configuration for best practices"
- "Why is my GitLab pipeline failing?"
- "Optimize my GitLab CI/CD configuration"

## Validation Rules

### Syntax Rules
- `yaml-syntax`: Valid YAML formatting
- `job-reserved-keyword`: Job names cannot use reserved keywords
- `job-missing-script`: Jobs must have script, trigger, or extends
- `job-stage-undefined`: Referenced stages must be defined
- `dependencies-undefined-job`: Referenced jobs must exist
- `rules-not-list`: Rules must be a list
- `cache-invalid-policy`: Cache policy must be pull, push, or pull-push

### Best Practice Rules
- `cache-missing`: Dependency installation jobs should use cache
- `artifact-no-expiration`: Artifacts should have expiration
- `deprecated-only-except`: Use 'rules' instead of 'only'/'except'
- `missing-interruptible`: Test jobs should be interruptible
- `missing-retry`: Potentially flaky jobs should have retry
- `image-latest-tag`: Pin Docker images to specific versions
- `dag-optimization`: Use 'needs' for faster pipeline execution
- `parallel-opportunity`: Tests could benefit from parallelization

### Security Rules
- `hardcoded-password`: Hardcoded passwords detected
- `hardcoded-api-key`: Hardcoded API keys detected
- `secret-in-logs`: Secrets may be exposed in logs
- `curl-pipe-bash`: Dangerous curl | bash pattern
- `image-latest-tag`: Using :latest is a security risk
- `include-remote-unverified`: Remote includes without verification
- `variable-hardcoded-secret`: Sensitive variables with hardcoded values
- `artifact-broad-path`: Overly broad artifact paths

## Requirements

- **Python 3.7+**
- **PyYAML**: Install with `pip3 install PyYAML`
- **Bash**: For running the orchestrator script

Install dependencies:
```bash
pip3 install PyYAML
```

## Documentation

Comprehensive documentation is included in the `docs/` directory:

- **`gitlab-ci-reference.md`**: Complete GitLab CI/CD YAML syntax reference
- **`best-practices.md`**: Detailed best practices guide
- **`common-issues.md`**: Common issues and solutions

## Examples

Example GitLab CI/CD configurations are provided in the `examples/` directory:

- **`basic-pipeline.gitlab-ci.yml`**: Simple three-stage pipeline
- **`docker-build.gitlab-ci.yml`**: Docker build and push workflow
- **`multi-stage.gitlab-ci.yml`**: Multi-stage pipeline with DAG
- **`complex-workflow.gitlab-ci.yml`**: Advanced workflow with all features
- **`component-pipeline.gitlab-ci.yml`**: **NEW** - GitLab 17.0+ pipeline using CI/CD components from the Catalog

Test the skill with examples:
```bash
bash scripts/validate_gitlab_ci.sh examples/basic-pipeline.gitlab-ci.yml

# Test component validation (GitLab 17.0+)
bash scripts/validate_gitlab_ci.sh examples/component-pipeline.gitlab-ci.yml
```

## Fetching Latest Documentation

When encountering custom GitLab features, modules, or specific version requirements, the skill can:

1. **Use Context7 MCP** to fetch version-aware GitLab documentation
2. **Use WebSearch** to find latest GitLab CI/CD documentation
3. **Use WebFetch** to retrieve specific documentation pages from docs.gitlab.com

This ensures validation rules stay current with the latest GitLab CI/CD features.

## Extending the Skill

### Adding Custom Validation Rules

Add custom rules to the validation scripts:

1. **Syntax rules**: Edit `scripts/validate_syntax.py`
2. **Best practice rules**: Edit `scripts/check_best_practices.py`
3. **Security rules**: Edit `scripts/check_security.py`

### Custom Rule Example

```python
# In check_best_practices.py
def _check_custom_rule(self):
    """Check for custom organization rule"""
    for job_name, job in self.config.items():
        if not self._is_job(job_name):
            continue

        # Your custom validation logic
        if 'tags' not in job:
            self.issues.append(BestPracticeIssue(
                'warning',
                self._get_line(job_name),
                f"Job '{job_name}' should specify runner tags",
                'custom-missing-tags',
                "Add 'tags' to select appropriate runners"
            ))
```

## Troubleshooting

### Python Module Not Found

```bash
# Install PyYAML
pip3 install PyYAML

# Or with homebrew Python
python3 -m pip install PyYAML
```

### Permission Denied

```bash
# Make scripts executable
chmod +x scripts/*.sh scripts/*.py
```

### Validation Errors

Check the documentation:
- Review `docs/gitlab-ci-reference.md` for syntax reference
- Check `docs/common-issues.md` for known issues
- Consult `docs/best-practices.md` for recommended patterns

## Version History

### v1.1.0 (2025-01-27)
- **NEW:** Complete include validation for all types (component, project, remote, local, template)
- **NEW:** CI/CD Component validation (GitLab 17.0+)
  - Component name format validation (org/project@version)
  - Version format validation (@1.0.0, @~latest, semantic versioning)
  - Component inputs structure validation
  - Component limit validation (max 100 per project)
- **NEW:** Enhanced security checks for all include types
  - Component security (version pinning, trusted sources, hardcoded inputs)
  - Remote include integrity and HTTP/HTTPS validation
  - Project include ref pinning and branch detection
  - Local include path traversal detection
  - Template deprecation warnings
- **NEW:** gitlab-ci-local integration for local pipeline testing
  - install_tools.sh script for tool installation
  - --test-only mode in validate_gitlab_ci.sh
- **NEW:** Core Validation Workflow documentation
- **NEW:** component-pipeline.gitlab-ci.yml example
- Enhanced validation rules: 40+ validation rules (was 25)
- Improved error messages with detailed remediation steps

### v1.0.0 (2025-01-18)
- Initial release
- Syntax validation with comprehensive GitLab CI schema checking
- Best practices validation with 15+ rules
- Security scanning with 25+ security checks
- Comprehensive documentation
- Example pipeline configurations
- Integration with Context7 for latest GitLab docs

## Contributing

To improve this skill:

1. Add new validation rules to appropriate scripts
2. Update documentation with new patterns
3. Add example configurations
4. Test with real-world GitLab CI/CD files

## License

This skill is part of the DevOps Skills collection.

## Support

For issues, questions, or contributions:
- Check documentation in `docs/` directory
- Review examples in `examples/` directory
- Consult GitLab CI/CD documentation: https://docs.gitlab.com/ci/

---

**Remember**: This skill validates GitLab CI/CD configurations but does not execute pipelines. Use GitLab's CI Lint tool or `gitlab-ci-local` for testing actual pipeline execution.
