import { describe, expect, test } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

describe("App", () => {
    test("アプリタイトルが表示されている", () => {
        render(<App />);
        expect(
            screen.getByRole("heading", { name: "🧺 家事チェッカー" })
        ).toBeInTheDocument();
    });

    test("TODOを追加することができる", () => {
        render(<App />);

        const input = screen.getByRole("textbox", { name: "新しい家事を入力" });
        const addButton = screen.getByRole("button", { name: "追加" });

        fireEvent.change(input, { target: { value: "テストタスク"}});
        fireEvent.click(addButton);

        const list = screen.getByRole("list");
        expect(within(list).getByText("テストタスク")).toBeInTheDocument();
    });

    test("TODOを完了にすることができる", () => {
        render(<App />);

        const input = screen.getByRole("textbox", { name: "新しい家事を入力" });
        const addButton = screen.getByRole("button", { name: "追加" });

        fireEvent.change(input, { target: { value: "完了テストタスク" } });
        fireEvent.click(addButton);

        const checkboxes = screen.getAllByRole("checkbox");
        const lastCheckbox = checkboxes[checkboxes.length - 1];
        fireEvent.click(lastCheckbox);

        expect(lastCheckbox).toBeChecked();
    });

    test("完了したTODOの数が表示されている", () => {
        render(<App />);

        const input = screen.getByRole("textbox", { name: "新しい家事を入力" });
        const addButton = screen.getByRole("button", { name: "追加" });

        fireEvent.change(input, { target: { value: "タスク1" } });
        fireEvent.click(addButton);

        fireEvent.change(input, { target: { value: "タスク2" } });
        fireEvent.click(addButton);

        const checkboxes = screen.getAllByRole("checkbox");
        fireEvent.click(checkboxes[0]);

        expect(screen.getByText(/完了しておりんす！:\s*1\s*\/\s*2/)).toBeInTheDocument();
    });

    test("TODOがない場合はから状態メッセージが表示される", () => {
        render(<App />);

        expect(screen.getByText("全て終わったよーー👌")).toBeInTheDocument();
        expect(screen.getByText("共有事項を入れる？")).toBeInTheDocument();
    });

    test("空のTODOは追加されない", () => {
        render(<App />);

        const input = screen.getByRole("textbox", { name: "新しい家事を入力" });
        const addButton = screen.getByRole("button", { name: "追加" });

        fireEvent.change(input, { target: { value: "" } });
        fireEvent.click(addButton);

        expect(screen.getByText("全て終わったよーー👌")).toBeInTheDocument();
        expect(screen.getByText("共有事項を入れる？")).toBeInTheDocument();
    });
});