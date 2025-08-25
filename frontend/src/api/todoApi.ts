// Todo API Client (simple fetch version)
// 環境に応じて適切なAPIエンドポイントを使用

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

// 開発環境でのみデバッグ情報を出力
if (import.meta.env.DEV) {
  console.log('API_BASE_URL:', BASE)
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
  const url = `${BASE}/api/todos`

  try {
    const res = await fetch(url)

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${body}`)
    }

    const data = await res.json()
    return data.todos as Todo[]
  } catch (error) {
    console.error('fetchTodos failed (network/CORS?):', error)
    throw error
  }
}

export const createTodo = async (title: string): Promise<Todo> => {
  const res = await fetch(`${BASE}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  const data = await res.json()
  return data.todo as Todo
}

export const updateTodo = async (id: string, updates: UpdateTodoRequest): Promise<Todo> => {
  const res = await fetch(`${BASE}/api/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  const data = await res.json()
  return data.todo as Todo
}

export const deleteTodo = async (id: string): Promise<void> => {
  const res = await fetch(`${BASE}/api/todos/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
}