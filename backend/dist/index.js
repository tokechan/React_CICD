import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
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
const app = new Hono();
// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('/api/*', cors({
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
export default app;
// ローカル開発用 (Node.js) - Workers環境では実行されない
// @ts-ignore
if (typeof globalThis.process !== 'undefined' && !globalThis.navigator?.userAgent?.includes('Cloudflare-Workers')) {
    // Dynamic import で Workers 環境での解析を回避
    import('@hono/node-server').then(({ serve }) => {
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