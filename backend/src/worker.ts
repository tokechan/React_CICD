import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

// 型定義
interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

// In-memory storage (Cloudflare Workers用)
let todos: Todo[] = [
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
]

// Honoのアプリケーションを作成
const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', prettyJSON())

// CORS設定：Firebase Hosting用
app.use('/api/*', cors({
  origin: [
    'http://localhost:5173',  // ローカル開発用
    'https://cicd-todo-app-89c3b.web.app',  // Firebase Hosting
    'https://cicd-todo-app-89c3b.firebaseapp.com',  // Firebase Hosting (代替ドメイン)
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
}))

// Routes
app.get('/', (c) => {
  return c.json({
    message: 'Todo App Backend with Hono 🔥 (Cloudflare Workers)',
    version: '1.0.0',
    platform: 'Cloudflare Workers',
    endpoints: {
      todos: '/api/todos',
      health: '/health'
    }
  })
})

app.get('/health', (c) => {
  return c.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    platform: 'Cloudflare Workers'
  })
})

// Todo API endpoints
app.get('/api/todos', (c) => {
  return c.json({ todos })
})

app.post('/api/todos', async (c) => {
  const { title } = await c.req.json()
  
  if (!title || typeof title !== 'string') {
    return c.json({ error: 'Title is required' }, 400)
  }

  const newTodo: Todo = {
    id: crypto.randomUUID(),
    title: title.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  todos.push(newTodo)
  return c.json({ todo: newTodo }, 201)
})

app.put('/api/todos/:id', async (c) => {
  const id = c.req.param('id')
  const { title, completed } = await c.req.json()

  if (!id || typeof id !== 'string') {
    return c.json({ error: 'Invalid ID' }, 400)
  }

  const todoIndex = todos.findIndex(todo => todo.id === id)
  if (todoIndex === -1) {
    return c.json({ error: 'Todo not found' }, 404)
  }

  if (title !== undefined) {
    todos[todoIndex].title = title
  }
  if (completed !== undefined) {
    todos[todoIndex].completed = completed
  }
  todos[todoIndex].updatedAt = new Date().toISOString()

  return c.json({ todo: todos[todoIndex] })
})

app.delete('/api/todos/:id', (c) => {
  const id = c.req.param('id')

  if (!id || typeof id !== 'string') {
    return c.json({ error: 'Invalid ID' }, 400)
  }

  const todoIndex = todos.findIndex(todo => todo.id === id)
  
  if (todoIndex === -1) {
    return c.json({ error: 'Todo not found' }, 404)
  }

  todos.splice(todoIndex, 1)
  return c.json({ message: 'Todo deleted successfully' })
})

// Cloudflare Workers 用のexport
export default app
