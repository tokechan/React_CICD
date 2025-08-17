# LightningCSS Build Error Investigation (2025-08-17)

## 1. 背景

GitHub Actions の **Build Phase** が以下のエラーで失敗:

```
Cannot find module '../lightningcss.linux-x64-gnu.node'
```

ローカルでは問題なくビルド出来ていたが、monorepo へ移行した後の数コミットで CI だけ失敗し始めた。

---

## 2. タイムライン

| 時刻 | Commit | 主な変更 | CI 状態 |
|------|--------|----------|---------|
| 08-17 09:02 | `049d231` | `todo-cicd → frontend` へリネーム & Tailwind **4.1.12** 導入 | ✅ Pass |
| 08-17 09:30 | `1e9a7f5` | backend (Hono) 追加 | ✅ Pass |
| 08-17 09:45 | `3da274e` | Frontend API client 追加 | ✅ Pass |
| 08-17 10:03 | `7f74279` | **Tailwind/Plugin 4.1.12 → 4.1.0** へ変更 + `overrides.lightningcss = 1.29.1` 追加 | ❌ Fail |

---

## 3. 原因

* **TailwindCSS 4.1.0** には Linux x64 GNU 用の LightningCSS ネイティブバイナリが含まれていない。
* `overrides` で LightningCSS を 1.29.1 に固定したことで、プラグインが想定するバージョンと食い違い、Optional Dep の解決に失敗。
* その結果、CI（Ubuntu）環境で `../lightningcss.linux-x64-gnu.node` が見つからずビルド失敗。

---

## 4. 解決策

1. Tailwind / plugin を **4.1.12** へ戻す（Linux 用バイナリが含まれている）
   ```bash
   npm install tailwindcss@^4.1.12 @tailwindcss/vite@^4.1.12 -D
   ```
2. `package.json` から `overrides.lightningcss` を削除
3. キャッシュがあればパージして再実行（`actions/setup-node` の npm キャッシュも無効化推奨）
4. どうしても v4.x 最新で失敗する場合は
   * `npm install lightningcss-linux-x64-gnu -D`
   * `TAILWIND_INTERNAL_DISABLE_LIGHTNING=true` をビルドコマンドに付与

---

## 5. 調査手順メモ

```bash
# 1. 失敗したジョブのログからエラー文字列を確認
#    → lightningcss.linux-x64-gnu.node が見つからない

# 2. いつから失敗したかを確認
$ git log --oneline --since="3 days ago" --decorate --graph --all

# 3. 直近コミットでフロントエンド依存関係が変わった箇所を diff
$ git show <commit_hash> -- frontend/package.json

# 4. バージョン差分を確認
#    4.1.12 → 4.1.0 へ変更 & overrides 追加を特定

# 5. Tailwind release notes / issue を検索
#    → 4.1.0 で Linux gnu バイナリ未同梱 Issue を確認
```

---

## 6. まとめ

* **原因**: TailwindCSS/Plugin 4.1.0 + LightningCSS バージョン固定で CI 環境のネイティブバイナリを解決出来なくなった。
* **対処**: 4.1.12 に戻し overrides を削除すれば CI が再び成功する。
* **教訓**: ネイティブバイナリを含む依存は *patch/minor* の違いでも CI で壊れることがある。CI 失敗時は直前の依存バージョン変更をまず疑う。

---

## 7. 実施した最終ワークアラウンド (CI 成功)

```jsonc
// frontend/package.json
{
  // ...
  "optionalDependencies": {
    "lightningcss-linux-x64-gnu": "^1.29.1"
  }
}
```

* Linux ランナーではネイティブバイナリ `lightningcss.linux-x64-gnu.node` が必ずインストールされる。
* macOS / Windows 環境ではスキップされるため、ローカル開発に影響なし。
* **結果**: Node20 + TailwindCSS 4.1.12 のまま CI ビルドがグリーンになった。

### CI ワークフロー変更点
環境変数追加は不要になったため、最終的な `.github/workflows/pipeline.yaml` は元のまま (Node20) で OK。

---
