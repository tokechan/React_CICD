// Todo API Client (simple fetch version)
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://todo-app-backend.your-subdomain.workers.dev'  // 本番 URL
  : 'http://localhost:3001'  // 開発 URL

// 型定義（クライアント側専用）
export interface Todo {
  id: number
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateTodoRequest {
  title?: string
  completed?: boolean
}

// --- API 関数群 ---------------------------------------------------------
export const fetchTodos = async (): Promise<Todo[]> => {
  const res = await fetch(`${API_BASE_URL}/api/todos`)
  if (!res.ok) throw new Error('Failed to fetch todos')
  const data = await res.json()
  return data.todos as Todo[]
}

export const createTodo = async (title: string): Promise<Todo> => {
  const res = await fetch(`${API_BASE_URL}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error('Failed to create todo')
  const data = await res.json()
  return data.todo as Todo
}

export const updateTodo = async (id: number, updates: UpdateTodoRequest): Promise<Todo> => {
  const res = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update todo')
  const data = await res.json()
  return data.todo as Todo
}

export const deleteTodo = async (id: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/todos/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete todo')
}