"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const logger_1 = require("hono/logger");
const pretty_json_1 = require("hono/pretty-json");
// In-memory storage (後でDBに変更予定)
let nextId = 3; // ID管理用カウンター
let todos = [
    {
        id: 1,
        title: 'CI/CDパイプラインを学ぶ',
        completed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        title: 'Honoでバックエンドを作る',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
const app = new hono_1.Hono();
// Middleware
app.use('*', (0, logger_1.logger)());
app.use('*', (0, pretty_json_1.prettyJSON)());
app.use('/api/*', (0, cors_1.cors)({
    origin: [
        'http://localhost:5173',
        'https://cicd-todo-app-89c3b.web.app',
        'https://cicd-todo-app-89c3b.firebaseapp.com'
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type']
}));
// Routes
app.get('/', (c) => {
    return c.json({
        message: 'Todo App Backend with Hono 🔥',
        version: '1.0.0',
        endpoints: {
            todos: '/api/todos',
            health: '/health'
        }
    });
});
app.get('/health', (c) => {
    return c.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Todo API endpoints
app.get('/api/todos', (c) => {
    return c.json({ todos });
});
app.post('/api/todos', async (c) => {
    const { title } = await c.req.json();
    if (!title || typeof title !== 'string') {
        return c.json({ error: 'Title is required' }, 400);
    }
    const newTodo = {
        id: nextId++,
        title: title.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    todos.push(newTodo);
    return c.json({ todo: newTodo }, 201);
});
app.put('/api/todos/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const { title, completed } = await c.req.json();
    if (isNaN(id)) {
        return c.json({ error: 'Invalid ID' }, 400);
    }
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) {
        return c.json({ error: 'Todo not found' }, 404);
    }
    if (title !== undefined) {
        todos[todoIndex].title = title;
    }
    if (completed !== undefined) {
        todos[todoIndex].completed = completed;
    }
    todos[todoIndex].updatedAt = new Date().toISOString();
    return c.json({ todo: todos[todoIndex] });
});
app.delete('/api/todos/:id', (c) => {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
        return c.json({ error: 'Invalid ID' }, 400);
    }
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) {
        return c.json({ error: 'Todo not found' }, 404);
    }
    todos.splice(todoIndex, 1);
    return c.json({ message: 'Todo deleted successfully' });
});
// Cloudflare Workers 用のexport
exports.default = app;
// ローカル開発用 (Node.js) - Workers環境では実行されない
// @ts-ignore
if (typeof globalThis.process !== 'undefined' && !globalThis.navigator?.userAgent?.includes('Cloudflare-Workers')) {
    // Dynamic import で Workers 環境での解析を回避
    Promise.resolve().then(() => __importStar(require('@hono/node-server'))).then(({ serve }) => {
        const port = globalThis.process.env.PORT ? parseInt(globalThis.process.env.PORT) : 3001;
        console.log(`🔥 Hono server starting on port ${port}`);
        serve({
            fetch: app.fetch,
            port: port
        });
    }).catch(() => {
        // Workers環境では @hono/node-server が利用できないので何もしない
    });
}
//# sourceMappingURL=index.js.map