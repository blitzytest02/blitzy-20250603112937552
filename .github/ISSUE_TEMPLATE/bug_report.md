---
name: Bug Report
about: Create a report to help us improve the Node.js tutorial application
title: '[BUG] Brief description of the issue'
labels: ['bug', 'needs-triage']
assignees: []
---

# Bug Report - Node.js Tutorial Application

Thank you for taking the time to report a bug in our Node.js tutorial application! This template will help you provide all the necessary information for us to understand, reproduce, and fix the issue effectively.

## 🐛 Bug Summary

**Provide a clear and concise description of what the bug is**

*Example: The /hello endpoint returns a 500 error instead of 'Hello world' when accessed via curl*

<!-- 
Guidance: Provide a brief, specific description of the unexpected behavior.
Focus on what you observed versus what you expected to happen.
-->

---

## 🖥️ Environment Information

**Please provide details about your development environment:**

- **Operating System**: <!-- e.g., macOS 14.1, Windows 11, Ubuntu 22.04 -->
- **Node.js version**: <!-- Run `node --version` - Expected: v22.16.0 or higher -->
- **npm version**: <!-- Run `npm --version` - Expected: v11.4.1 or higher -->
- **Express.js version**: <!-- Check package.json - Expected: ^5.1.0 -->
- **Tutorial version**: <!-- Expected: 1.0.0 -->
- **Browser** (if applicable): <!-- e.g., Chrome 119.0.6045.105, Firefox 119.0 -->

**Environment Variables** (if any custom settings):
```bash
PORT=3000
NODE_ENV=development
# List any other environment variables you've set
```

---

## 🔄 Steps to Reproduce

**Detailed steps to reproduce the behavior:**

1. **Start from a clean state** (fresh installation):
   ```bash
   git clone [repository-url]
   cd src/backend
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   # OR
   node server.js
   ```

3. **Send the request**:
   ```bash
   curl http://localhost:3000/hello
   # OR describe browser/Postman steps
   ```

4. **Observe the error response**

<!-- 
Requirements:
- Include exact commands used
- Specify any configuration changes made
- Note any error messages encountered
- Start from a fresh installation to ensure reproducibility
-->

---

## ✅ Expected Behavior

**What you expected to happen:**

*The /hello endpoint should return 'Hello world' with HTTP 200 status and Content-Type: text/plain*

<!-- Reference the tutorial documentation or README.md for expected behavior -->

---

## ❌ Actual Behavior

**What actually happened:**

*Received HTTP 500 Internal Server Error with JSON response: {'error': 'Internal server error'}*

**Include specific details:**
- Exact error messages received
- HTTP status codes returned
- Any unexpected console output
- Response headers or body content

---

## 📋 Error Logs and Output

**Please include relevant error logs, console output, or screenshots:**

```bash
# Server console output:
Server listening on port 3000
Error: Cannot read property 'send' of undefined
    at helloRouteHandler (app.js:15:9)
    at Layer.handle [as handle_request] (/node_modules/express/lib/router/layer.js:95:5)
    at next (/node_modules/express/lib/router/route.js:144:13)
```

```bash
# Client response:
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
{
  "status": 500,
  "message": "Internal Server Error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

<!-- 
Guidance:
- Use code blocks for formatting
- Include both server-side and client-side output
- Remove any sensitive information
- Include full error stack traces when available
-->

---

## ⚙️ Configuration Details

### Environment Variables
<!-- List any custom environment variables set -->
- `PORT`: 3000 (default)
- `NODE_ENV`: development
- Any custom variables: _None_

### Code Modifications
<!-- Describe any changes made to the tutorial code -->
- Changes to server.js: _None_
- Modifications to app.js: _None_
- Custom middleware added: _None_

### Dependency Changes
<!-- List any additional packages installed or version changes -->
- Additional npm packages: _None_
- Version changes: _None_
- Package.json modifications: _None_

---

## 🧪 Testing Information

**Results of running the test suite:**

```bash
# npm test results:
$ npm test
PASS test/unit/server.test.js
PASS test/integration/hello-endpoint.test.js

Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
```

**Manual testing performed:**
- [ ] Tested with curl
- [ ] Tested with browser
- [ ] Tested with Postman
- [ ] Verified Node.js version
- [ ] Ran npm test successfully

---

## 🔍 Issue Isolation

**Steps taken to isolate the issue:**

- [ ] Tested with fresh installation
- [ ] Verified Node.js version (v22.16.0+)
- [ ] Checked for conflicting processes on port 3000
- [ ] Tested with different HTTP clients (curl, browser, Postman)
- [ ] Reviewed recent changes or updates
- [ ] Cleared npm cache and reinstalled dependencies

**Troubleshooting attempted:**
```bash
# Commands tried to resolve the issue:
lsof -ti:3000 | xargs kill  # Kill port conflicts
npm cache clean --force     # Clear npm cache  
rm -rf node_modules package-lock.json && npm install  # Clean reinstall
```

---

## 📚 Additional Context

**When did the issue first appear?**
<!-- e.g., After following step 3 of the tutorial, after system update, etc. -->

**Does it happen consistently or intermittently?**
<!-- Consistent, random, only under certain conditions -->

**Any recent system updates or changes?**
<!-- OS updates, Node.js version changes, other software installations -->

**Similar issues encountered in other projects?**
<!-- Any patterns or related problems -->

**Workarounds discovered?**
<!-- Any temporary solutions that work -->

---

## 🎓 Educational Impact

**How this bug affects the learning experience:**

- [ ] Prevents completion of tutorial steps
- [ ] Creates confusing error messages for beginners  
- [ ] Impacts understanding of core concepts
- [ ] Missing educational explanations

**Specific learning objectives affected:**
<!-- e.g., HTTP server concepts, Express.js routing, error handling -->

---

## 📋 Pre-submission Checklist

Please confirm you have completed the following before submitting:

- [ ] I have searched existing issues to ensure this is not a duplicate
- [ ] I have provided complete environment information
- [ ] I have included detailed reproduction steps  
- [ ] I have tested with the latest version of the tutorial (v1.0.0)
- [ ] I have included relevant error logs and output
- [ ] I have verified this issue occurs with Node.js v22.16.0 LTS
- [ ] I have confirmed Express.js v5.1.0 is being used
- [ ] I have run the test suite and included results
- [ ] I have followed the development setup guidelines
- [ ] I have considered the educational impact of this issue

---

## 🛠️ Development Setup Guidelines

For maintainers and contributors reproducing this issue:

### Essential Requirements
- **Node.js**: v22.16.0 LTS or higher ([Download](https://nodejs.org/))
- **npm**: v11.4.1 or higher (bundled with Node.js)
- **Express.js**: v5.1.0 (installed via `npm install`)

### Setup Steps
```bash
# 1. Install Node.js from nodejs.org (LTS recommended)
# 2. Verify installation
node --version  # Should show v22.16.0+
npm --version   # Should show v11.4.1+

# 3. Clone and setup project
git clone <repository-url>
cd src/backend
npm install

# 4. Verify setup
npm test       # Should pass all tests
npm start      # Should start server on port 3000

# 5. Test endpoint
curl http://localhost:3000/hello  # Should return "Hello world"
```

### Common Troubleshooting
```bash
# Port conflicts
lsof -ti:3000 | xargs kill

# Node.js version issues  
nvm use 22.16.0  # If using nvm

# Dependency issues
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 🏷️ Bug Categories Reference

To help with triage, this issue appears to be related to:

- [ ] **Server Startup Issues** - Problems with server initialization
- [ ] **Endpoint Functionality** - Issues with /hello endpoint behavior  
- [ ] **Error Handling Issues** - Problems with error responses
- [ ] **Testing Failures** - Jest test suite failures
- [ ] **Dependency Issues** - npm or package-related problems
- [ ] **Performance Issues** - Response time or resource problems
- [ ] **Documentation Issues** - Tutorial instruction problems

---

**Thank you for helping improve this educational Node.js tutorial! Your bug report helps make learning Node.js and Express.js better for everyone.**

<!-- 
For maintainers: This issue template follows educational best practices and includes:
- Comprehensive environment information
- Detailed reproduction steps  
- Educational context and impact assessment
- Development setup guidance for contributors
- Quality assurance through pre-submission checklist
- Support for community learning objectives
-->