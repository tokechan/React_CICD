// Todo API Client (simple fetch version)
// 環境に応じて適切なAPIエンドポイントを使用
const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3001'  // 開発環境
  : 'https://horyjsyuf9.execute-api.us-east-1.amazonaws.com'  // 新しいHTTP API（固定）

// 開発環境でのみデバッグ情報を出力
if (import.meta.env.DEV) {
  console.log('API_BASE_URL:', API_BASE_URL)
  console.log('Environment:', {
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL
  })
}

// 型定義（クライアント側専用）
export interface Todo {
  id: string  // バックエンドに合わせてstring型に変更
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
  const url = `${API_BASE_URL}/api/todos`

  if (import.meta.env.DEV) {
    console.log('Fetching from:', url)
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (import.meta.env.DEV) {
      console.log('Response status:', res.status)
      console.log('Response headers:', Object.fromEntries(res.headers.entries()))
    }

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Response error:', errorText)
      throw new Error(`HTTP ${res.status}: ${errorText}`)
    }

    const data = await res.json()

    if (import.meta.env.DEV) {
      console.log('Response data:', data)
    }

    return data.todos as Todo[]
  } catch (error) {
    console.error('Fetch error details:', error)
    throw error
  }
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

export const updateTodo = async (id: string, updates: UpdateTodoRequest): Promise<Todo> => {
  const res = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update todo')
  const data = await res.json()
  return data.todo as Todo
}

export const deleteTodo = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/todos/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete todo')
}