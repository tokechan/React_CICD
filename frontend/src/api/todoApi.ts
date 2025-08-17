// Todo API Client
const API_BASE_URL = 'http://localhost:3001'

// 型定義（後でsharedから import予定）
interface Todo {
  id: number
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

interface UpdateTodoRequest {
  title?: string
  completed?: boolean
}

// API関数群
export const fetchTodos = async (): Promise<Todo[]> => {
  const response = await fetch(`${API_BASE_URL}/api/todos`)
  if (!response.ok) {
    throw new Error('Failed to fetch todos')
  }
  const data = await response.json()
  return data.todos
}

export const createTodo = async (title: string): Promise<Todo> => {
  const response = await fetch(`${API_BASE_URL}/api/todos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create todo')
  }
  
  const data = await response.json()
  return data.todo
}

export const updateTodo = async (id: number, updates: UpdateTodoRequest): Promise<Todo> => {
  const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })
  
  if (!response.ok) {
    throw new Error('Failed to update todo')
  }
  
  const data = await response.json()
  return data.todo
}

export const deleteTodo = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete todo')
  }
}