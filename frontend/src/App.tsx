import { useState } from "react";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};


function App() {
  const [title, setTitle] = useState(""); 
  const [todos, setTodos] = useState<Todo[]>([]);
 

  const handleAddTodo = () => {
    if (title.trim()) {
    setTodos([
      ...todos,
      {
        id: todos.length + 1,
        title: title,
        completed: false,
      },
    ]);
    setTitle("");
    }
  };

  const handleToggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) => 
        todo.id === id ? { ...todo, completed: !todo.completed }: todo
      )
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTodo();
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-indigo-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            🧺 家事チェッカー
          </h1>

          <div className="flex gap-2 mb-6">
            <input 
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="新しい家事を入力..."
              aria-label="新しい家事を入力"
              className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={handleAddTodo}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              追加
            </button>
          </div>

          {todos.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg">全て終わったよーー👌</p>
              <p className="text-sm">共有事項を入れる？</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {todos.map((todo) => (
                <li
                key={todo.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                  todo.completed
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                } `}
                >
                  <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => handleToggleTodo(todo.id)}
                      className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span 
                        className={`flex-1 text-sm ${
                          todo.completed ? "line-through text-gray-400" : "text-gray-800"
                      }`}>
                        {todo.title}
                      </span>
                  </li>
              ))}
            </ul>
          )} 

          {todos.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                完了しておりんす！: {todos.filter((todo) => todo.completed).length} /{""}
                {todos.length}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App