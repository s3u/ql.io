const AWS = require('aws-sdk');
const QLIOEngine = require('./qlio-engine');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Environment variables
const CACHE_TABLE = process.env.CACHE_TABLE;
const CONFIG_BUCKET = process.env.CONFIG_BUCKET;
const ENVIRONMENT = process.env.ENVIRONMENT || 'dev';

// Cache for ql.io engine instance
let engineInstance = null;

/**
 * Main Lambda handler
 */
exports.handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // Add CORS headers
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        };

        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        // Initialize engine if not cached
        if (!engineInstance) {
            engineInstance = await initializeEngine();
        }

        // Route request based on path
        const path = event.path || event.resource;
        
        switch (path) {
            case '/query':
                return await handleQuery(event, engineInstance, headers);
            case '/tables':
                return await handleTables(engineInstance, headers);
            default:
                return await handleDynamicRoute(event, engineInstance, headers);
        }

    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

/**
 * Initialize ql.io engine
 */
async function initializeEngine() {
    console.log('Initializing ql.io engine...');
    
    const engine = new QLIOEngine({
        configBucket: CONFIG_BUCKET
    });
    
    await engine.initialize();
    return engine;
}

/**
 * Handle POST /query requests
 */
async function handleQuery(event, engine, headers) {
    try {
        const body = JSON.parse(event.body || '{}');
        const query = body.query;

        if (!query) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Query is required' })
            };
        }

        // Generate cache key
        const queryHash = generateHash(query);

        // Check cache first
        const cachedResult = await getCachedResult(queryHash);
        if (cachedResult) {
            console.log('Returning cached result');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    ...cachedResult,
                    cached: true
                })
            };
        }

        // Execute query
        console.log('Executing query:', query);
        const result = await engine.exec(query);

        // Cache the result
        await cacheResult(queryHash, result);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ...result,
                cached: false
            })
        };

    } catch (error) {
        console.error('Query execution error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Query execution failed',
                message: error.message
            })
        };
    }
}

/**
 * Handle GET /tables requests
 */
async function handleTables(engine, headers) {
    try {
        const tables = engine.getTables();
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ tables })
        };

    } catch (error) {
        console.error('Tables listing error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to list tables',
                message: error.message
            })
        };
    }
}

/**
 * Handle dynamic route requests
 */
async function handleDynamicRoute(event, engine, headers) {
    try {
        // TODO: Implement dynamic route handling
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Dynamic route handler',
                path: event.path,
                method: event.httpMethod
            })
        };

    } catch (error) {
        console.error('Dynamic route error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Route execution failed',
                message: error.message
            })
        };
    }
}

/**
 * Get cached query result from DynamoDB
 */
async function getCachedResult(queryHash) {
    try {
        const params = {
            TableName: CACHE_TABLE,
            Key: { queryHash }
        };

        const result = await dynamodb.get(params).promise();
        
        if (result.Item && result.Item.ttl > Math.floor(Date.now() / 1000)) {
            return JSON.parse(result.Item.result);
        }

        return null;

    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
}

/**
 * Cache query result in DynamoDB
 */
async function cacheResult(queryHash, result) {
    try {
        const params = {
            TableName: CACHE_TABLE,
            Item: {
                queryHash,
                result: JSON.stringify(result),
                ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL
            }
        };

        await dynamodb.put(params).promise();
        console.log('Result cached successfully');

    } catch (error) {
        console.error('Cache put error:', error);
        // Don't fail the request if caching fails
    }
}

/**
 * Generate hash for query caching
 */
function generateHash(query) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(query).digest('hex');
}