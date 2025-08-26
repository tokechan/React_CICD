import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';


// DynamoDBの設定（本番環境用）
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME || 'TodoApp';

// ローカル開発用のメモリストレージ
let localTodos: Todo[] = [
  {
    id: '1',
    title: 'CI/CDパイプラインを学ぶ',
    completed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Honoでバックエンドを作る',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 環境判定：ローカル開発環境かどうか
const isLocalDevelopment = () => {
  return !process.env.AWS_REGION && !process.env.TABLE_NAME;
};


//Honoのアプリケーションを作成
const app = new Hono();

// Middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('/api/*', cors({
  origin: [
    'http://localhost:5173',  // ローカル開発用（統一ポート）
    'https://cicd-todo-app-89c3b.web.app',
    'https://cicd-todo-app-89c3b.firebaseapp.com'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type']
}))



// 型定義
interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

//helper function 
const getTodos = async (): Promise<Todo[]> => {
  if (isLocalDevelopment()) {
    return localTodos;
  }
  const command = new ScanCommand({ TableName: tableName });
  const response = await docClient.send(command);
  return (response.Items as Todo[]) || [];
};

const getTodo = async (id: string): Promise<Todo | null> => {
  if (isLocalDevelopment()) {
    return localTodos.find(todo => todo.id === id) || null;
  }
  const command = new GetCommand({
    TableName: tableName,
    Key: { id },
  });
  const response = await docClient.send(command);
  return (response.Item as Todo) || null;
};

const createTodo = async (todo: Omit<Todo, 'createdAt' | 'updatedAt'>
): Promise<Todo> => {
  const now = new Date().toISOString();
  const newTodo: Todo = {
    ...todo,
    createdAt: now,
    updatedAt: now,
  };

  if (isLocalDevelopment()) {
    localTodos.push(newTodo);
    return newTodo;
  }

  const command = new PutCommand({
    TableName: tableName,
    Item: newTodo,
  });
  await docClient.send(command);
  return newTodo;
};

const updateTodo = async (
  id: string,
  updates: Partial<Todo>
): Promise<Todo | null> => {
  const existingTodo = await getTodo(id);
  if (!existingTodo) return null;

  const updatedTodo: Todo = {
    ...existingTodo,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (isLocalDevelopment()) {
    const index = localTodos.findIndex(todo => todo.id === id);
    if (index !== -1) {
      localTodos[index] = updatedTodo;
      return updatedTodo;
    }
    return null;
  }

  const command = new UpdateCommand({
    TableName: tableName,
    Key: { id },
    UpdateExpression:
     'SET title = :title, completed = :completed, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':title': updatedTodo.title,
      ':completed': updatedTodo.completed,
      ':updatedAt': updatedTodo.updatedAt,
    },
    ReturnValues: 'ALL_NEW',
  });

  const response = await docClient.send(command);
  return (response as any).Attributes as Todo || null;
};

const deleteTodo = async (id: string): Promise<boolean> => {
  if (isLocalDevelopment()) {
    const index = localTodos.findIndex(todo => todo.id === id);
    if (index !== -1) {
      localTodos.splice(index, 1);
      return true;
    }
    return false;
  }

  const command = new DeleteCommand({
    TableName: tableName,
    Key: { id },
  });

  try {
    await docClient.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting todo:', error);
    return false;
  }
};

//APi endpoints
app.get('/api/todos', async (c) => {
  try {
    const todos = await getTodos();
    return c.json({ todos });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    console.error('Error deleting todo:', error);
    return c.json({ error: 'Failed to delete todo' }, 500);
  }
});

//Lambda handler
export const handler = handle(app);



// Routes
app.get('/', (c) => {
  return c.json({
    message: 'Todo App Backend with Hono 🔥',
    version: '1.0.0',
    endpoints: {
      todos: '/api/todos',
      health: '/health'
    }
  })
})

app.get('/health', (c) => {
  return c.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  })
})



// Cloudflare Workers 用のexport
export default app

// ローカル開発用 (Node.js) - Workers環境では実行されない
// @ts-ignore
if (typeof globalThis.process !== 'undefined' && !globalThis.navigator?.userAgent?.includes('Cloudflare-Workers')) {
  // Dynamic import で Workers 環境での解析を回避
  import('@hono/node-server').then(({ serve }) => {
    const port = globalThis.process.env.PORT ? parseInt(globalThis.process.env.PORT) : 3001
    
    console.log(`🔥 Hono server starting on port ${port}`)
    serve({
      fetch: app.fetch,
      port: port
    })
  }).catch(() => {
    // Workers環境では @hono/node-server が利用できないので何もしない
  })
}
