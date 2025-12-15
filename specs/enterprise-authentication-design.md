# Enterprise Authentication Design Document

## Overview

This document provides the high-level design and implementation plan for Phase 1 (Core Authentication Framework) and Phase 2 (OAuth 2.0 Implementation) of the enterprise authentication system for ql.io.

## Architecture Design

### Current Authentication System Analysis

The existing authentication system in ql.io has these characteristics:

```javascript
// Current implementation in httpConnector.js
if(statement.auth) {
    // auth is the compiled auth module
    self.auth = require(statement.auth);
}

// During request execution
if(verb.auth) {
    verb.auth.auth(params, args.config, function (err) {
        if(err) return cb(err);
        // Authentication succeeded, continue with the request
        makeHttpRequest();
    });
}
```

**Limitations:**
- Requires custom auth modules for each authentication method
- No built-in support for standard protocols
- Limited configuration flexibility
- No token management or caching

### Proposed Architecture

#### 1. Authentication Provider System

```
┌─────────────────────────────────────────────────────────────┐
│                    ql.io Engine                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Compiler      │    │      HTTP Connector             │ │
│  │                 │    │                                 │ │
│  │ - Parse auth    │    │ - Execute auth                  │ │
│  │   syntax        │    │ - Handle tokens                 │ │
│  │ - Validate      │    │ - Manage sessions               │ │
│  │   config        │    │                                 │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                Authentication Manager                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Provider Registry                          │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │ │
│  │  │ OAuth2  │ │   JWT   │ │ API Key │ │   Custom    │   │ │
│  │  │Provider │ │Provider │ │Provider │ │  Provider   │   │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Token Manager                            │ │
│  │  - Token caching    - Refresh logic                     │ │
│  │  - Expiration       - Security validation              │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Configuration Manager                      │ │
│  │  - Provider config  - Security settings                │ │
│  │  - Environment vars - Credential storage               │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Component Interfaces

```javascript
// Base Authentication Provider Interface
class AuthProvider {
    constructor(config) {
        this.config = config;
        this.type = 'base';
    }
    
    async authenticate(context) {
        throw new Error('authenticate() must be implemented');
    }
    
    async refresh(context) {
        throw new Error('refresh() must be implemented');
    }
    
    validate(config) {
        throw new Error('validate() must be implemented');
    }
}

// Authentication Context
class AuthContext {
    constructor(table, statement, params, config) {
        this.table = table;
        this.statement = statement;
        this.params = params;
        this.config = config;
        this.headers = {};
        this.tokens = {};
    }
}

// Token Manager Interface
class TokenManager {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.defaultTTL || 3600;
    }
    
    async getToken(key) { /* implementation */ }
    async setToken(key, token, ttl) { /* implementation */ }
    async refreshToken(key, refreshFn) { /* implementation */ }
    async invalidateToken(key) { /* implementation */ }
}
```

### Extended QL Syntax Design

#### Current Syntax
```sql
create table api.service
  on select get from "https://api.service.com/data"
  authenticate using "custom-auth-module"
```

#### Proposed Extended Syntax
```sql
-- OAuth 2.0 Client Credentials
create table enterprise.api
  on select get from "https://api.enterprise.com/data"
  authenticate using oauth2 {
    clientId: "{config.oauth.enterprise.clientId}",
    clientSecret: "{config.oauth.enterprise.clientSecret}",
    tokenUrl: "https://auth.enterprise.com/token",
    scopes: ["read:data", "write:data"],
    grantType: "client_credentials"
  }

-- OAuth 2.0 Authorization Code (for user-based auth)
create table user.api
  on select get from "https://api.user.com/data"
  authenticate using oauth2 {
    clientId: "{config.oauth.user.clientId}",
    clientSecret: "{config.oauth.user.clientSecret}",
    authUrl: "https://auth.user.com/authorize",
    tokenUrl: "https://auth.user.com/token",
    redirectUri: "{config.oauth.user.redirectUri}",
    scopes: ["profile", "email"],
    grantType: "authorization_code",
    pkce: true
  }

-- JWT Token
create table jwt.api
  on select get from "https://api.jwt.com/data"
  authenticate using jwt {
    token: "{config.jwt.token}",
    algorithm: "RS256",
    publicKey: "{config.jwt.publicKey}",
    audience: "api.jwt.com",
    issuer: "auth.jwt.com"
  }

-- API Key
create table apikey.service
  on select get from "https://api.service.com/data"
  authenticate using apikey {
    key: "{config.apikey.service.key}",
    location: "header",
    name: "X-API-Key"
  }

-- Backward compatibility with custom modules
create table legacy.api
  on select get from "https://api.legacy.com/data"
  authenticate using "custom-auth-module"
```

## Implementation Plan

### Phase 1: Core Authentication Framework (Week 1-2)

#### 1.1 Authentication Manager Core
**Files to Create:**
- `modules/engine/lib/engine/auth/auth-manager.js`
- `modules/engine/lib/engine/auth/auth-provider.js`
- `modules/engine/lib/engine/auth/auth-context.js`
- `modules/engine/lib/engine/auth/token-manager.js`
- `modules/engine/lib/engine/auth/config-manager.js`

**Implementation Details:**

```javascript
// auth-manager.js
class AuthManager {
    constructor(config = {}) {
        this.providers = new Map();
        this.tokenManager = new TokenManager(config.tokenManager);
        this.configManager = new ConfigManager(config.configManager);
        this.registerBuiltInProviders();
    }
    
    registerProvider(type, providerClass) {
        this.providers.set(type, providerClass);
    }
    
    async authenticate(authConfig, context) {
        const providerType = authConfig.type || 'custom';
        const ProviderClass = this.providers.get(providerType);
        
        if (!ProviderClass) {
            throw new Error(`Unknown authentication provider: ${providerType}`);
        }
        
        const provider = new ProviderClass(authConfig);
        return await provider.authenticate(context);
    }
    
    registerBuiltInProviders() {
        // Will be implemented in Phase 2
        // this.registerProvider('oauth2', OAuth2Provider);
        // this.registerProvider('jwt', JWTProvider);
        // this.registerProvider('apikey', APIKeyProvider);
    }
}
```

#### 1.2 Compiler Extensions
**Files to Modify:**
- `modules/compiler/lib/peg/ql.pegjs` (PEG grammar file)
- `modules/compiler/lib/compiler.js`

**Grammar Extensions:**
```pegjs
// Add to ql.pegjs
AuthenticateClause
  = "authenticate" _ "using" _ authType:(AuthObject / AuthString)
  { return { type: 'authenticate', auth: authType }; }

AuthObject
  = type:Identifier _ "{" _ props:AuthProperties _ "}"
  { return { type: type, config: props }; }

AuthString
  = StringLiteral

AuthProperties
  = head:AuthProperty tail:(_ "," _ AuthProperty)*
  { return [head].concat(tail.map(t => t[3])); }

AuthProperty
  = key:Identifier _ ":" _ value:(StringLiteral / ArrayLiteral)
  { return { key: key, value: value }; }
```

#### 1.3 HTTP Connector Integration
**Files to Modify:**
- `modules/engine/lib/engine/source/httpConnector.js`

**Integration Points:**
```javascript
// Modified httpConnector.js
const AuthManager = require('../auth/auth-manager.js');

function httpConnector(table, statement, type, bag, path) {
    // ... existing code ...
    
    // Initialize auth manager
    this.authManager = new AuthManager(bag.config.authentication);
    
    // Parse authentication configuration
    if (statement.auth) {
        this.authConfig = this.parseAuthConfig(statement.auth);
    }
}

httpConnector.prototype.parseAuthConfig = function(authStatement) {
    if (typeof authStatement === 'string') {
        // Legacy custom module support
        return { type: 'custom', module: authStatement };
    } else if (typeof authStatement === 'object') {
        // New structured authentication
        return authStatement;
    }
    throw new Error('Invalid authentication configuration');
};

// Modified send function
function send(verb, args, uri, params, cb) {
    if (verb.authConfig) {
        const context = new AuthContext(args.table, verb, params, args.config);
        
        verb.authManager.authenticate(verb.authConfig, context)
            .then(() => {
                // Apply authentication results to request
                Object.assign(args.headers, context.headers);
                makeHttpRequest();
            })
            .catch(cb);
        return;
    }
    
    // No auth required, proceed directly
    makeHttpRequest();
}
```

#### 1.4 Configuration System
**Files to Create:**
- `modules/engine/lib/engine/auth/config-manager.js`

**Configuration Structure:**
```json
{
  "authentication": {
    "tokenCache": {
      "maxSize": 1000,
      "defaultTTL": 3600,
      "cleanupInterval": 300
    },
    "providers": {
      "oauth2": {
        "timeout": 30000,
        "retries": 3
      },
      "jwt": {
        "clockTolerance": 60,
        "algorithms": ["RS256", "HS256", "ES256"]
      },
      "apikey": {
        "rateLimitRetries": 3,
        "rateLimitDelay": 1000
      }
    },
    "security": {
      "encryptTokens": true,
      "auditLog": true,
      "maxFailedAttempts": 5
    }
  }
}
```

#### 1.5 Testing Framework
**Files to Create:**
- `modules/engine/test/auth/auth-manager.test.js`
- `modules/engine/test/auth/token-manager.test.js`
- `modules/engine/test/auth/config-manager.test.js`
- `modules/compiler/test/auth-syntax.test.js`

### Phase 2: OAuth 2.0 Implementation (Week 3-4)

#### 2.1 OAuth 2.0 Provider
**Files to Create:**
- `modules/engine/lib/engine/auth/providers/oauth2-provider.js`
- `modules/engine/lib/engine/auth/providers/oauth2-flows.js`
- `modules/engine/lib/engine/auth/providers/pkce-helper.js`

**Implementation:**
```javascript
// oauth2-provider.js
const AuthProvider = require('../auth-provider.js');
const OAuth2Flows = require('./oauth2-flows.js');
const PKCEHelper = require('./pkce-helper.js');

class OAuth2Provider extends AuthProvider {
    constructor(config) {
        super(config);
        this.type = 'oauth2';
        this.flows = new OAuth2Flows();
        this.validateConfig();
    }
    
    async authenticate(context) {
        const grantType = this.config.grantType || 'client_credentials';
        
        switch (grantType) {
            case 'client_credentials':
                return await this.clientCredentialsFlow(context);
            case 'authorization_code':
                return await this.authorizationCodeFlow(context);
            default:
                throw new Error(`Unsupported grant type: ${grantType}`);
        }
    }
    
    async clientCredentialsFlow(context) {
        const cacheKey = this.generateCacheKey();
        let token = await context.tokenManager.getToken(cacheKey);
        
        if (!token || this.isTokenExpired(token)) {
            token = await this.requestClientCredentialsToken();
            await context.tokenManager.setToken(cacheKey, token, token.expires_in);
        }
        
        context.headers['Authorization'] = `Bearer ${token.access_token}`;
        return context;
    }
    
    async requestClientCredentialsToken() {
        const tokenRequest = {
            grant_type: 'client_credentials',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            scope: this.config.scopes ? this.config.scopes.join(' ') : undefined
        };
        
        // Implementation of HTTP request to token endpoint
        return await this.flows.requestToken(this.config.tokenUrl, tokenRequest);
    }
    
    validateConfig() {
        const required = ['clientId', 'clientSecret', 'tokenUrl'];
        for (const field of required) {
            if (!this.config[field]) {
                throw new Error(`OAuth2 configuration missing required field: ${field}`);
            }
        }
    }
}
```

#### 2.2 Token Management Enhancement
**Files to Modify:**
- `modules/engine/lib/engine/auth/token-manager.js`

**Enhanced Features:**
```javascript
class TokenManager {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.defaultTTL || 3600;
        this.cleanupInterval = options.cleanupInterval || 300;
        this.encryptTokens = options.encryptTokens || false;
        
        // Start cleanup timer
        this.startCleanupTimer();
    }
    
    async getToken(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return null;
        }
        
        return this.decryptToken(entry.token);
    }
    
    async setToken(key, token, ttl = this.defaultTTL) {
        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        
        const entry = {
            token: this.encryptToken(token),
            expires: Date.now() + (ttl * 1000),
            accessed: Date.now()
        };
        
        this.cache.set(key, entry);
    }
    
    async refreshToken(key, refreshFn) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        try {
            const newToken = await refreshFn(this.decryptToken(entry.token));
            await this.setToken(key, newToken);
            return newToken;
        } catch (error) {
            this.cache.delete(key);
            throw error;
        }
    }
}
```

#### 2.3 PKCE Support
**Files to Create:**
- `modules/engine/lib/engine/auth/providers/pkce-helper.js`

```javascript
const crypto = require('crypto');

class PKCEHelper {
    static generateCodeVerifier() {
        return crypto.randomBytes(32).toString('base64url');
    }
    
    static generateCodeChallenge(verifier) {
        return crypto.createHash('sha256')
            .update(verifier)
            .digest('base64url');
    }
    
    static createPKCEParams() {
        const verifier = this.generateCodeVerifier();
        const challenge = this.generateCodeChallenge(verifier);
        
        return {
            code_verifier: verifier,
            code_challenge: challenge,
            code_challenge_method: 'S256'
        };
    }
}
```

#### 2.4 Integration Testing
**Files to Create:**
- `modules/engine/test/auth/oauth2-provider.test.js`
- `modules/engine/test/auth/oauth2-integration.test.js`
- `demos/tables/oauth2-demo.ql`

**Demo Table:**
```sql
create table github.repos
  on select get from "https://api.github.com/user/repos"
  authenticate using oauth2 {
    clientId: "{config.oauth.github.clientId}",
    clientSecret: "{config.oauth.github.clientSecret}",
    tokenUrl: "https://github.com/login/oauth/access_token",
    authUrl: "https://github.com/login/oauth/authorize",
    scopes: ["repo", "user"],
    grantType: "client_credentials"
  }
```

## Dependencies and Package Updates

### New Dependencies
```json
{
  "dependencies": {
    "node-jose": "^2.2.0",
    "pkce-challenge": "^3.1.0",
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.6.0"
  }
}
```

### Security Considerations

1. **Token Storage**: Implement encryption for cached tokens
2. **Configuration Security**: Support environment variables for sensitive data
3. **Audit Logging**: Log all authentication attempts and failures
4. **Rate Limiting**: Implement backoff strategies for auth endpoints
5. **Validation**: Strict validation of all authentication configurations

## Testing Strategy

### Unit Tests
- Authentication provider implementations
- Token manager functionality
- Configuration validation
- Error handling scenarios

### Integration Tests
- End-to-end OAuth 2.0 flows
- Token refresh mechanisms
- Multi-provider scenarios
- Backward compatibility with existing auth modules

### Performance Tests
- Token caching efficiency
- Authentication latency
- Memory usage optimization
- Concurrent authentication handling

## Migration Strategy

### Backward Compatibility
- Existing `authenticate using "module"` syntax continues to work
- Custom auth modules remain functional
- Gradual migration path for existing tables

### Configuration Migration
```javascript
// Legacy configuration (still supported)
{
  "tables": {
    "api": {
      "auth": "custom-auth-module"
    }
  }
}

// New configuration structure
{
  "authentication": {
    "providers": {
      "oauth2": {
        "github": {
          "clientId": "...",
          "clientSecret": "..."
        }
      }
    }
  }
}
```

## Success Metrics

### Phase 1 Success Criteria
- [ ] Authentication manager framework implemented
- [ ] Compiler supports new authentication syntax
- [ ] HTTP connector integrates with auth manager
- [ ] Token management system functional
- [ ] Backward compatibility maintained
- [ ] 100% test coverage for core components

### Phase 2 Success Criteria
- [ ] OAuth 2.0 client credentials flow working
- [ ] OAuth 2.0 authorization code flow working
- [ ] PKCE support implemented
- [ ] Token refresh mechanisms functional
- [ ] Integration tests passing
- [ ] Demo tables working with real OAuth providers

## Timeline

### Phase 1: Core Framework (2 weeks)
- Week 1: Authentication manager, provider interfaces, compiler extensions
- Week 2: HTTP connector integration, token management, testing

### Phase 2: OAuth 2.0 (2 weeks)
- Week 3: OAuth 2.0 provider implementation, PKCE support
- Week 4: Integration testing, demo tables, documentation

**Total Duration**: 4 weeks for Phase 1 + Phase 2

This design provides a solid foundation for enterprise authentication while maintaining backward compatibility and setting up for future protocol implementations in subsequent phases.