# Phase 2: Dependency Updates - Detailed Plan

**Duration**: 4 weeks (Weeks 3-6 of Fast Track)  
**Goal**: Update all dependencies to modern, Node.js 23-compatible versions  
**Status**: Ready to execute

## Overview

Phase 2 will systematically update all dependencies across 7 modules, replacing ancient packages (2012-2013) with modern alternatives. This will unblock the remaining Jest migrations and eliminate security vulnerabilities.

## Dependency Analysis

### ✅ Already Updated (4 modules)
- **str-template**: Clean (Jest only)
- **uri-template**: Clean (Jest + underscore@latest)
- **mutable-uri**: Clean (Jest + underscore@latest)
- **compiler**: Clean (Jest + underscore@latest)

### 🔧 Needs Updates (3 modules)

#### **engine** (Most Critical - 23 dependencies)
**Blocking Issues:**
- `websocket@1.0.6` → `ws@8.x` (V8 API incompatibility)
- `xml2json@custom` → `fast-xml-parser@4.x` (node-expat issues)
- `mongodb@1.2.13` → `mongodb@6.x` (9-year gap!)
- `iconv@1.2.3` → `iconv-lite@0.6.x` (native compilation)

**All Dependencies:**
```json
{
  "winston": "0.6.2" → "3.11.x",
  "underscore": "1.3.3" → "1.13.x", 
  "xml2json": "custom" → "fast-xml-parser@4.x",
  "JSONPath": "0.9.0" → "jsonpath@1.x",
  "uri": "0.1.0" → "@hapi/uri@1.x",
  "headers": "0.9.6" → "latest",
  "mustache": "0.4.0" → "4.x",
  "ejs": "0.8.0" → "3.x",
  "async": "0.1.22" → "3.x",
  "dox": "0.3.1" → "4.x",
  "node-uuid": "1.3.3" → "uuid@10.x",
  "markdown": "0.4.0" → "marked@12.x",
  "csv": "0.0.18" → "csv-parser@3.x",
  "iconv": "1.2.3" → "iconv-lite@0.6.x",
  "charlie": "0.0.5" → "remove/replace",
  "stream-buffers": "custom" → "stream-buffers@3.x",
  "form-data": "0.0.2" → "4.x",
  "mongodb": "1.2.13" → "6.x"
}
```

#### **console** (16 dependencies)
**Blocking Issues:**
- `express@2.5.11` → `express@4.x` (10-year gap!)
- `connect@1.9.2` → built into Express 4
- `websocket@1.0.6` → `ws@8.x`
- `browserify@1.14.2` → `esbuild` or remove

#### **app** (9 dependencies)  
**Blocking Issues:**
- `cluster2@0.3.5` → native `cluster` module
- `commander@1.0.0` → `commander@11.x`

## Week-by-Week Execution Plan

### Week 3: Critical Blocking Dependencies
**Focus**: Fix compilation blockers

**Day 1-2: engine module**
1. Replace `websocket` → `ws`
2. Replace `xml2json` → `fast-xml-parser`
3. Replace `iconv` → `iconv-lite`
4. Update `mongodb` → 6.x (major changes expected)

**Day 3-4: console module**
1. Update `express` 2.x → 4.x (breaking changes)
2. Remove `connect` (built into Express 4)
3. Replace `websocket` → `ws`
4. Update `browserify` → modern bundler

**Day 5: app module**
1. Replace `cluster2` → native `cluster`
2. Update `commander` → latest

**Success Criteria**: All modules install without compilation errors

### Week 4: Remaining Dependencies
**Focus**: Update all other packages

**Day 1-2: High-impact updates**
1. `winston` 0.6.2 → 3.x (logging changes)
2. `async` 0.1.22 → 3.x (API changes)
3. `ejs` 0.8.0 → 3.x (security fixes)

**Day 3-4: Medium-impact updates**
1. `mustache` 0.4.0 → 4.x
2. `uuid` (node-uuid) → 10.x
3. `JSONPath` → jsonpath
4. `markdown` → marked

**Day 5: Final cleanup**
1. `csv` → csv-parser
2. `form-data` updates
3. `headers`, `validator` updates
4. Remove obsolete packages

**Success Criteria**: All dependencies modern, zero vulnerabilities

## Breaking Changes to Handle

### Major API Changes Expected

#### **MongoDB 1.x → 6.x**
- Connection API completely changed
- Callback → Promise/async-await
- Collection API changes
- Authentication changes

#### **Express 2.x → 4.x**
- Middleware system redesigned
- `connect` middleware built-in
- Route handling changes
- Static file serving changes

#### **Winston 0.6.x → 3.x**
- Configuration format changed
- Transport system redesigned
- Log levels and formatting

#### **Async 0.1.x → 3.x**
- Many methods renamed/removed
- Callback patterns changed
- Some utilities moved to separate packages

## Risk Mitigation

### High-Risk Updates
1. **MongoDB**: Extensive code changes needed
2. **Express**: Middleware and routing changes
3. **Winston**: Logging configuration changes

### Mitigation Strategy
1. **Update incrementally** - one major package at a time
2. **Test after each update** - ensure functionality preserved
3. **Document changes** - track what breaks and how to fix
4. **Fallback plan** - keep working versions available

## Testing Strategy

### After Each Major Update
1. **Install dependencies** - verify no compilation errors
2. **Run existing tests** - check for immediate breaks
3. **Manual smoke test** - basic functionality works
4. **Document issues** - track what needs fixing

### Final Validation
1. **All modules install cleanly**
2. **Jest tests can run** (may fail due to API changes)
3. **No critical vulnerabilities**
4. **Basic functionality preserved**

## Success Criteria

### Week 3 End
- ✅ All modules install without native compilation errors
- ✅ No websocket, xml2json, iconv, mongodb blocking issues
- ✅ Express 4.x working in console module

### Week 4 End  
- ✅ All dependencies updated to modern versions
- ✅ Zero critical security vulnerabilities
- ✅ `npm audit` shows clean results
- ✅ Basic functionality preserved (tests may need updates)

## Next Phase Preparation

After Phase 2 completion:
- **Return to Phase 1**: Complete Jest migration for engine, console, app
- **Phase 3**: Fix any breaking changes from dependency updates
- **Phase 4**: Code modernization (var → const/let)

## Files to Create

1. `modernization/scripts/phase2-dependency-updates.sh`
2. `modernization/docs/dependency-update-log.md`
3. `modernization/docs/breaking-changes-guide.md`

Ready to begin Week 3: Critical Blocking Dependencies?