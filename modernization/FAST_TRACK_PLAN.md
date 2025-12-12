# Fast Track Modernization Plan

**Status:** Tests fail on Node.js 23.x (nodeunit incompatibility)  
**Decision:** Skip downgrading Node.js, modernize directly  
**Timeline:** 12 weeks (faster than original 17-week plan)

## Why Fast Track?

1. ✅ **nodeunit is dead** - Won't work on any modern Node.js
2. ✅ **No point downgrading** - We'd just have to upgrade again
3. ✅ **Jest works everywhere** - Compatible with Node.js 14-23
4. ✅ **Faster overall** - Do it all at once instead of incrementally

## The Plan

### Week 1-2: Jest Migration (Critical Path)
**Goal:** Get tests running on Node.js 23.x

**Tasks:**
1. Install Jest in all modules
2. Create Jest config for each module
3. Convert nodeunit tests to Jest syntax
4. Get all tests passing with Jest
5. Remove nodeunit dependency

**Order:**
- Start with `modules/str-template` (smallest)
- Then `modules/uri-template`, `modules/mutable-uri`
- Then `modules/compiler`
- Then `modules/engine` (largest)
- Finally `modules/console`, `modules/app`

**Success Criteria:** All tests pass with Jest on Node.js 23.x

---

### Week 3-4: Update package.json & Core Dependencies
**Goal:** Modern, secure dependencies

**Tasks:**
1. Update `engines.node` to `>=18.0.0` in all modules
2. Update winston 0.6 → 3.x
3. Update express 2.5 → 4.x
4. Update underscore 1.3 → lodash 4.x (or native)
5. Update all other non-breaking dependencies
6. Run `npm audit fix`

**Success Criteria:** Zero critical vulnerabilities, all tests pass

---

### Week 5-6: Replace Obsolete Packages
**Goal:** Remove unmaintained dependencies

**Tasks:**
1. Replace `cluster2` → native `cluster`
2. Replace `xml2json` → `fast-xml-parser`
3. Replace `websocket` → `ws`
4. Update `mongodb` driver
5. Replace `browserify` → `esbuild`

**Success Criteria:** All modern, maintained packages

---

### Week 7-8: Code Modernization (var → const/let)
**Goal:** Modern JavaScript syntax

**Tasks:**
1. Convert all `var` → `const`/`let`
2. Add ESLint with modern rules
3. Add Prettier for formatting
4. Fix all linting errors

**Success Criteria:** No `var` declarations, ESLint passes

---

### Week 9-10: Async/Await Conversion
**Goal:** Modern async patterns

**Tasks:**
1. Add Promise wrappers for callback APIs
2. Convert internal functions to async/await
3. Keep backward-compatible public API
4. Update error handling to try/catch

**Success Criteria:** Internal code uses async/await, tests pass

---

### Week 11-12: Final Polish & Release
**Goal:** Production-ready v1.0.0

**Tasks:**
1. Add TypeScript definitions
2. Update all documentation
3. Add Docker support
4. Setup GitHub Actions CI/CD
5. Create migration guide
6. Release v1.0.0

**Success Criteria:** Released and documented

---

## Comparison: Fast Track vs Traditional

| Aspect | Traditional | Fast Track |
|--------|-------------|------------|
| **Duration** | 17 weeks | 12 weeks |
| **Node.js versions tested** | 5+ versions | 1 version |
| **Test framework migrations** | 1 (later) | 1 (first) |
| **Risk** | Lower | Medium |
| **Complexity** | Higher | Lower |
| **End result** | Same | Same |

## Next Steps

**Right now:**
1. Read this plan
2. Confirm you want Fast Track approach
3. I'll start with Jest migration in `modules/str-template`

**Your decision:**
- ✅ **Fast Track** - Start Jest migration now
- ❌ **Traditional** - Install nvm, test old Node.js versions first

---

**Recommendation:** Fast Track. Let's get tests working on Node.js 23.x immediately!
