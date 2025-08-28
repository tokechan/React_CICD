# Todo API 更新時の title 欠落問題と解決策

## 📋 問題の概要

Todoアプリケーションで、チェックボックスを操作してタスクの完了状態を変更した際に、**タスクのテキスト（title）が消えてしまう**問題が発生していました。

## 🔍 問題の詳細

### 症状
- チェックボックスにチェックを入れると、タスクが完了済みエリアに移動する
- しかし、移動後のタスクのテキストが表示されない
- チェックを外すと、未完了エリアに戻るが、テキストが表示されない

### 影響範囲
- フロントエンド: ReactアプリケーションのUI
- バックエンド: Hono + DynamoDB API
- データ: Todoオブジェクトのtitleプロパティ

## 🕵️ 調査過程

### 1. 初期調査
- フロントエンドの型定義を確認
- CSSスタイルの問題を疑う
- コンソールログでデバッグ

### 2. 根本原因の発見
コンソールログから以下の流れを確認：

```
Before update: {id: '1', title: 'CI/CDパイプラインを学ぶ', completed: false, ...}
API Response: {todo: {id: '1', completed: true, ...}}  // titleが欠落
After update: {id: '1', completed: true, ...}  // titleが欠落
```

**問題**: APIレスポンスで`title`プロパティが欠落している

### 3. バックエンドコードの調査
- `worker.ts`の`PUT /api/todos/:id`エンドポイントを確認
- 問題のあるコードを発見

## 🐛 根本原因

### 問題のあるコード
```typescript
// backend/src/worker.ts (修正前)
app.put('/api/todos/:id', async (c) => {
  const { title, completed } = await c.req.json();
  
  const updatedTodo = await updateTodo(id, {
    title: title?.trim(),  // ← 問題の箇所
    completed,
  });
  
  return c.json({ todo: updatedTodo });
});
```

### 問題の詳細
1. **フロントエンドから送信**: `completed`のみを更新（`title`は送信しない）
2. **バックエンドで受信**: `title: undefined`として処理
3. **データベース更新**: 既存の`title`が`undefined`で上書き
4. **レスポンス**: `title`が欠落したオブジェクトを返す

## ✅ 解決策

### 修正後のコード
```typescript
// backend/src/worker.ts (修正後)
app.put('/api/todos/:id', async (c) => {
  const { title, completed } = await c.req.json();
  
  const updatedTodo = await updateTodo(id, {
    ...(title !== undefined && { title: title.trim() }),  // ← 条件付き更新
    ...(completed !== undefined && { completed }),
  });
  
  return c.json({ todo: updatedTodo });
});
```

### 修正のポイント
- **スプレッド構文**を使用して条件付き更新
- `undefined`でない場合のみフィールドを更新
- 送信されていないフィールドは既存値を保持

## 🏗️ 技術的な背景

### 環境の違い
- **ローカル環境**: メモリ内の`localTodos`配列
- **本番環境**: DynamoDB

### 影響
- ローカル環境でも本番環境でも同様の問題が発生
- データベースの種類に関係なく、APIロジックの問題

## 📚 学びとベストプラクティス

### 1. API設計の原則
- **部分更新**を行う際は、送信されていないフィールドは既存値を保持
- **条件付き更新**を使用して、意図しない上書きを防ぐ

### 2. 開発時の注意点
- 初期開発時から、エッジケースを考慮した実装
- スプレッド構文や条件付き更新の活用
- 適切なテストとデバッグ

### 3. デバッグ手法
- コンソールログによる段階的な調査
- APIレスポンスの直接確認
- フロントエンドとバックエンドの連携確認

## 🔧 修正ファイル

- `backend/src/worker.ts`: PUTエンドポイントの修正

## 📅 修正日時

- **発見**: 2025年8月28日
- **修正**: 2025年8月28日
- **確認**: 2025年8月28日

## 🎯 結果

- ✅ チェックボックス操作時のテキスト表示が正常に動作
- ✅ 完了済み/未完了エリア間の移動が正常に動作
- ✅ APIレスポンスに完全なTodoオブジェクトが返される
- ✅ ローカル環境と本番環境の両方で正常動作

---

**教訓**: 部分更新APIでは、送信されていないフィールドの扱いを慎重に設計することが重要です。
