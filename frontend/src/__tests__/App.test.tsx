import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// component under test
import App from "../App";
// api client to mock
import * as api from "../api/todoApi";

// ---- mock API client ---------------------------------------------------
vi.mock("../api/todoApi");
const mockApi = vi.mocked(api);

// utility to wait initial fetch (loadingが消えるまで)
const waitInitialFetch = async () => {
  await waitFor(() => expect(mockApi.fetchTodos).toHaveBeenCalled());
};

beforeEach(() => {
  vi.resetAllMocks();
});

// -----------------------------------------------------------------------

describe("App (API 連携版)", () => {
  it("アプリタイトルが表示されている", async () => {
    mockApi.fetchTodos.mockResolvedValue([]);

    render(<App />);
    await waitInitialFetch();

    expect(
      screen.getByRole("heading", { name: "🧺 家事チェッカー" })
    ).toBeInTheDocument();
  });

  it("TODO を追加できる", async () => {
    mockApi.fetchTodos.mockResolvedValue([]);

    // createTodo は呼び出し毎に id をインクリメントして返す
    mockApi.createTodo.mockImplementation(async (title: string) => ({
      id: 1,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    render(<App />);
    await waitInitialFetch();

    const input = screen.getByRole("textbox", { name: "新しい家事を入力" });
    const addButton = screen.getByRole("button", { name: "追加" });

    fireEvent.change(input, { target: { value: "テストタスク" } });
    fireEvent.click(addButton);

    // createTodo が呼ばれ、一覧に表示されるまで待つ
    await waitFor(() => {
      const list = screen.getByRole("list");
      expect(within(list).getByText("テストタスク")).toBeInTheDocument();
    });
  });

  it("TODO を完了状態にできる", async () => {
    const initialTodo = {
      id: 1,
      title: "完了テストタスク",
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockApi.fetchTodos.mockResolvedValue([initialTodo]);
    mockApi.updateTodo.mockImplementation(async (id: number, updates) => ({
      ...initialTodo,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));

    render(<App />);
    await waitInitialFetch();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it("完了した TODO 数が正しく表示される", async () => {
    const todos = [
      {
        id: 1,
        title: "タスク1",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        title: "タスク2",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    mockApi.fetchTodos.mockResolvedValue(todos);
    mockApi.updateTodo.mockImplementation(async (id: number, updates) => ({
      ...todos.find((t) => t.id === id)!,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));

    render(<App />);
    await waitInitialFetch();

    // 1 件完了にする
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText(/完了しておりんす！:\s*1\s*\/\s*2/)).toBeInTheDocument();
    });
  });

  it("TODO が無い場合は空状態メッセージが表示される", async () => {
    mockApi.fetchTodos.mockResolvedValue([]);

    render(<App />);
    await waitInitialFetch();

    expect(screen.getByText("全て終わったよーー👌")).toBeInTheDocument();
    expect(screen.getByText("共有事項を入れる？")).toBeInTheDocument();
  });

  it("空の TODO は追加されない", async () => {
    mockApi.fetchTodos.mockResolvedValue([]);
    mockApi.createTodo.mockResolvedValueOnce({
      id: 1,
      title: "",
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<App />);
    await waitInitialFetch();

    const input = screen.getByRole("textbox", { name: "新しい家事を入力" });
    const addButton = screen.getByRole("button", { name: "追加" });

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(addButton);

    // 空状態メッセージが残っていることを確認
    expect(screen.getByText("全て終わったよーー👌")).toBeInTheDocument();
  });
});