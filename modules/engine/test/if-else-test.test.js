const Engine = require('../lib/engine');

describe('if else test Tests', () => {
    let engine;

    beforeEach(() => {
        engine = new Engine();
    });

    test('if-empty', async () => {
        const q = 'z = {}\n\
         if (z) \n\
         {a = false}\n\
         else \n\
         {   }   \n\
         return a;';

        return new Promise((resolve, reject) => {
            engine.exec({script: q, cb: function(err, result) {
                if(err) {
                    reject(err);
                }
                else {
                    expect(result.body).toBe(false);
                    resolve();
                }
            }});
        });
    }, 15000);

    test('nested-if', async () => {
        const q = 'z = null \n\
            j = "happy" \n\
            if (!z) \n\
            {       \n\
                if (j )    \n\
                {             \n\
                    a = "sad"  \n\
                }              \n\
            }                  \n\
            else               \n\
            {                  \n\
                b = "enjoy"    \n\
            }                  \n\
            return a;';

        return new Promise((resolve, reject) => {
            engine.exec({script: q, cb: function(err, result) {
                if(err) {
                    reject(err);
                }
                else {
                    expect(result.body).toBe("sad");
                    resolve();
                }
            }});
        });
    }, 15000);

    test('nested-if-else', async () => {
        const q = 'z = null \n\
            j = "happy" \n\
            if (!z)    \n\
            {          \n\
                if (!j )  \n\
                {          \n\
                    a = "sad"  \n\
                }            \n\
                else         \n\
                {        \n\
                    c= "sleepy"   \n\
                }          \n\
            }             \n\
            else         \n\
            {              \n\
                b = "enjoy"   \n\
            }                 \n\
            return a || c || b;';

        return new Promise((resolve, reject) => {
            engine.exec({script: q, cb: function(err, result) {
                if(err) {
                    reject(err);
                }
                else {
                    expect(result.body).toBe("sleepy");
                    resolve();
                }
            }});
        });
    }, 15000);

    test('nested-if-else-nodefine', async () => {
        const q = 'if (!z)    \n\
            {          \n\
                if (!j )  \n\
                {          \n\
                    a = "sad"  \n\
                }            \n\
                else         \n\
                {        \n\
                    c= "sleepy"   \n\
                }          \n\
            }             \n\
            else         \n\
            {              \n\
                b = "enjoy"   \n\
            }                 \n\
            return b || c || a;';

        return new Promise((resolve, reject) => {
            engine.exec({script: q, cb: function(err, result) {
                if(err) {
                    reject(err);
                }
                else {
                    expect(result.body).toBe("sad");
                    resolve();
                }
            }});
        });
    }, 15000);

    test('nested-if-else-undefined', async () => {
        const q = 'if (x||y) \n\
            {          \n\
                q= 12345    \n\
                if (!j )    \n\
                {           \n\
                    g = "sad"  \n\
                }                 \n\
                else              \n\
                {                \n\
                    d= "sleepy"   \n\
                }                 \n\
            }                     \n\
            else                 \n\
            {                     \n\
                e = "enjoy"       \n\
            }                     \n\
            return q||g|| d||e;';

        return new Promise((resolve, reject) => {
            engine.exec({script: q, cb: function(err, result) {
                if(err) {
                    reject(err);
                }
                else {
                    expect(result.body).toBe("enjoy");
                    resolve();
                }
            }});
        });
    }, 15000);

    test('nested-else-undefined', async () => {
        const q = 'if (x||y)    \n\
            {             \n\
                q= 12345  \n\
            }             \n\
            else          \n\
            {             \n\
                if (j )   \n\
                {         \n\
                    g = "sad"   \n\
                }               \n\
                else            \n\
                {               \n\
                    d= "sleepy"  \n\
                }               \n\
                e = "enjoy"     \n\
            }                  \n\
            return g||d||e||q;';

        return new Promise((resolve, reject) => {
            engine.exec({script: q, cb: function(err, result) {
                if(err) {
                    reject(err);
                }
                else {
                    expect(result.body).toBe("sleepy");
                    resolve();
                }
            }});
        });
    }, 15000);
});