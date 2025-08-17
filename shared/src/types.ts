// Todo関連の型定義
export interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTodoRequest {
  title: string
}

export interface UpdateTodoRequest {
  title?: string
  completed?: boolean
}

// API Response型
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface TodosResponse {
  todos: Todo[]
}

export interface TodoResponse {
  todo: Todo
}

// API Endpoints
export const API_ENDPOINTS = {
  TODOS: '/api/todos',
  HEALTH: '/health'
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const
