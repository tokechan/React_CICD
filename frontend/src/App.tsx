import { useState, useEffect } from "react";
import { fetchTodos, createTodo, updateTodo, type Todo } from "./api/todoApi";


function App() {
  const [title, setTitle] = useState(""); 
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);

  // 初期データ取得
  useEffect(() => {
    const loadTodos = async () => {
      try {
        setLoading(true);
        const fetchedTodos = await fetchTodos();
        setTodos(fetchedTodos);
        setError("");
      } catch (err) {
        setError("データの取得に失敗しました");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTodos();
  }, []);

  const handleAddTodo = async () => {
    if (title.trim()) {
      try {
        const newTodo = await createTodo(title.trim());
        setTodos([...todos, newTodo]);
        setTitle("");
        setError("");
      } catch (err) {
        setError("Todoの追加に失敗しました");
        console.error(err);
      }
    }
  };

  const handleToggleTodo = async (id: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) return;
      
      const updatedTodo = await updateTodo(id, { 
        completed: !todoToUpdate.completed 
      });
      
      setTodos(todos.map(todo => 
        todo.id === id ? updatedTodo : todo
      ));
      
      // チェックされた場合（完了になった場合）にアニメーションを表示
      if (!todoToUpdate.completed) {
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 2000);
      }
      
      setError("");
    } catch (err) {
      setError("Todoの更新に失敗しました");
      console.error(err);
    }
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

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

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

          {loading ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg">読み込み中...</p>
            </div>
          ) : (
            <>
              {/* 未完了タスク */}
              {todos.filter(todo => !todo.completed).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-lg">全て終わったよーー👌</p>
                  <p className="text-sm">共有事項を入れる？</p>
                </div>
              ) : (
                <ul className="space-y-3 mb-6">
                  {todos.filter(todo => !todo.completed).map((todo) => (
                    <li
                      key={todo.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-white border-gray-200 hover:bg-gray-50 transition-all duration-200"
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggleTodo(todo.id)}
                        className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="flex-1 text-sm text-gray-800">
                        {todo.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* 完了済みタスク */}
              {todos.filter(todo => todo.completed).length > 0 && (
                <div className="mt-8">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-700 text-center">✅ 完了済み</h2>
                    <div className="mt-2 border-t border-gray-200"></div>
                  </div>
                  <ul className="space-y-3">
                    {todos.filter(todo => todo.completed).map((todo) => (
                      <li
                        key={todo.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-200 transition-all duration-200"
                      >
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggleTodo(todo.id)}
                          className="w-5 h-5 text-green-500 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="flex-1 text-sm line-through text-gray-400">
                          {todo.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )} 

          {todos.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                完了しておりんす！: {todos.filter((todo) => todo.completed).length} /{""}
                {todos.length}
              </p>
            </div>
          )}
          
          {/* Thank you アニメーション */}
          {showAnimation && (
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              <div className="animate-bounce bg-white rounded-lg shadow-xl p-8 text-center border-4 border-green-300">
                <div className="text-6xl mb-4 animate-pulse">🎉</div>
                <div className="text-2xl font-bold text-green-600 animate-pulse">Thank you!!</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App