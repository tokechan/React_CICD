"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const hono_1 = require("hono");
const aws_lambda_1 = require("hono/aws-lambda");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// DynamoDBの設定
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME || 'TodoApp';
//Honoのアプリケーションを作成
const app = new hono_1.Hono();
//hepler function 
const getTodos = async () => {
    const command = new lib_dynamodb_1.ScanCommand({ TableName: tableName });
    const response = await docClient.send(command);
    return response.Items || [];
};
const getTodo = async (id) => {
    const command = new lib_dynamodb_1.GetCommand({
        TableName: tableName,
        Key: { id },
    });
    const response = await docClient.send(command);
    return response.Item || null;
};
const createTodo = async (todo) => {
    const now = new Date().toISOString();
    const newTodo = {
        ...todo,
        createdAt: now,
        updatedAt: now,
    };
    const command = new lib_dynamodb_1.PutCommand({
        TableName: tableName,
        Item: newTodo,
    });
    await docClient.send(command);
    return newTodo;
};
const updateTodo = async (id, updates) => {
    const existingTodo = await getTodo(id);
    if (!existingTodo)
        return null;
    const updatedTodo = {
        ...existingTodo,
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    const command = new lib_dynamodb_1.UpdateCommand({
        TableName: tableName,
        Key: { id },
        UpdateExpression: 'SET title = :title, completed = :completed, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
            ':title': updatedTodo.title,
            ':completed': updatedTodo.completed,
            ':updatedAt': updatedTodo.updatedAt,
        },
        ReturnValues: 'ALL_NEW',
    });
    const response = await docClient.send(command);
    return response.Attributes || null;
};
const deleteTodo = async (id) => {
    const command = new lib_dynamodb_1.DeleteCommand({
        TableName: tableName,
        Key: { id },
    });
    try {
        await docClient.send(command);
        return true;
    }
    catch (error) {
        console.error('Error deleting todo:', error);
        return false;
    }
};
//APi endpoints
app.get('/api.todos', async (c) => {
    try {
        const todos = await getTodos();
        return c.json({ todos });
    }
    catch (error) {
        console.error('Error fetching todos:', error);
        return c.json({ error: 'Failed to fetch todos' }, 500);
    }
});
app.post('/api/todos', async (c) => {
    try {
        const body = await c.req.json();
        const { title } = body;
        if (!title || typeof title !== 'string') {
            return c.json({ error: 'Title is required' }, 400);
        }
        const newTodo = await createTodo({
            id: crypto.randomUUID(),
            title: title.trim(),
            completed: false,
        });
        return c.json({ todo: newTodo }, 201);
    }
    catch (error) {
        console.error('Error creating todo:', error);
        return c.json({ error: 'Failed to create todo' }, 500);
    }
});
app.get('/api/todos/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const todo = await getTodo(id);
        if (!todo) {
            return c.json({ error: 'Todo not found' }, 404);
        }
        return c.json({ todo });
    }
    catch (error) {
        console.error('Error fetching todo:', error);
        return c.json({ error: 'Failed to fetch todo' }, 500);
    }
});
app.put('/api/todos/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { title, completed } = body;
        const updatedTodo = await updateTodo(id, {
            title: title?.trim(),
            completed,
        });
        if (!updatedTodo) {
            return c.json({ error: 'Todo not found' }, 404);
        }
        return c.json({ todo: updatedTodo });
    }
    catch (error) {
        console.error('Error updating todo:', error);
        return c.json({ error: 'Failed to update todo' }, 500);
    }
});
app.delete('/api/todos/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const success = await deleteTodo(id);
        if (!success) {
            return c.json({ error: 'Todo not found' }, 404);
        }
        return c.json({ message: 'Todo deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting todo:', error);
        return c.json({ error: 'Failed to delete todo' }, 500);
    }
});
//Lambda handler
exports.handler = (0, aws_lambda_1.handle)(app);
// Routes
app.get('/', (c) => {
    return c.json({
        message: 'Todo App Backend with Hono 🔥',
        version: '1.0.0',
        endpoints: {
            todos: '/api/todos',
            health: '/health'
        }
    }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
});
app.get('/health', (c) => {
    return c.json({ status: 'OK', timestamp: new Date().toISOString() }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
});
// Cloudflare Workers 用のexport
exports.default = app;
//# sourceMappingURL=worker.js.map