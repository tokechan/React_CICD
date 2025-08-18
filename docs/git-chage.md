# リポジトリ完全書き換え手順ガイド

既存のGitリポジトリを完全に新しいプロジェクトで置き換える手順を説明します。

## 概要

この手順により、既存のリモートリポジトリの履歴を完全に削除し、新しいプロジェクトで上書きすることができます。

⚠️ **重要な注意事項**
- この操作により既存の履歴は完全に削除されます
- 他の開発者と共有している場合は事前に通知してください
- 必要に応じて事前にバックアップを取ってください

## 手順

### 1. 既存リポジトリをクローン
```bash
git clone https://github.com/username/repository-name.git
cd repository-name
```

### 2. 既存のファイルを一括削除
```bash
# 方法1: 現在のディレクトリ内のすべてを削除
rm -rf * .*

# 方法2: ディレクトリごと削除して再作成
cd ..
rm -rf repository-name
mkdir repository-name
cd repository-name
```

### 3. 新しいプロジェクトを構築
お好みの方法で新しいプロジェクトファイルを作成・配置してください。

### 4. Gitリポジトリを初期化
```bash
git init
```

### 5. ファイルをステージングエリアに追加
```bash
git add .
```

### 6. 初回コミットを作成
```bash
git commit -m "Initial commit: 新しいプロジェクトの開始"
```

### 7. メインブランチを設定（オプション）
```bash
git branch -M main
```

### 8. リモートリポジトリを追加
```bash
git remote add origin https://github.com/username/repository-name.git
```

### 9. 強制プッシュで既存リポジトリを上書き
```bash
git push origin main --force
```

## トラブルシューティング

### "remote origin already exists" エラーが発生した場合
```bash
# 既存のoriginを削除
git remote remove origin

# 再度originを追加
git remote add origin https://github.com/username/repository-name.git

# または、URLを更新
git remote set-url origin https://github.com/username/repository-name.git
```

### プッシュが拒否された場合
`--force` オプションを使用して強制プッシュを実行してください：
```bash
git push origin main --force
```

## ベストプラクティス

1. **バックアップの作成**: 重要なデータがある場合は事前にバックアップを取ってください
2. **チーム通知**: 他の開発者がいる場合は事前に通知してください
3. **ブランチ保護の確認**: GitHubなどでブランチ保護が設定されている場合は一時的に無効にしてください
4. **README更新**: 新しいプロジェクトに合わせてREADMEファイルを更新してください

## 完了確認

以下を確認して作業が完了していることを確認してください：

- [ ] リモートリポジトリが新しいコードで更新されている
- [ ] 古い履歴が削除されている
- [ ] 新しいコミット履歴が正しく表示されている
- [ ] プロジェクトが正常に動作する

---

**作成日**: $(date +'%Y-%m-%d')  
**更新日**: $(date +'%Y-%m-%d')