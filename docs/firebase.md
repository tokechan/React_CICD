# Firebase認証設定のトラブルシューティング記録

## 概要

GitHub ActionsでFirebase Hostingへの自動デプロイを設定する際に発生した問題と解決方法の記録。

## プロジェクト構成

- **リポジトリ**: `tokechan/React_CICD`
- **プロジェクト構造**: 
  ```
  nextjs-dashboard/
  ├── .github/workflows/pipeline.yaml
  └── todo-cicd/
      ├── package.json
      ├── package-lock.json
      └── src/
  ```
- **Firebase プロジェクト**: `cicd-todo-app-89c3b`

## 発生した問題と解決方法

### 1. GitHub Actionsが実行されない問題

**問題**: ワークフローがトリガーされない

**原因**: 
- `.github` フォルダが `todo-cicd` サブディレクトリにあった
- GitHub Actionsはリポジトリルートの `.github/workflows/` のみを認識

**解決方法**:
```bash
# .githubフォルダをリポジトリルートに移動
mv todo-cicd/.github .
```

### 2. ワークフローのパス設定問題

**問題**: npm install、build、testが失敗

**原因**: `working-directory` の設定不備

**解決方法**:
```yaml
# 各ステップに working-directory を追加
- name: Install dependencies
  run: npm install
  working-directory: todo-cicd

- name: Build application
  run: npm run build
  working-directory: todo-cicd
```

### 3. npm キャッシュの設定問題

**問題**: 
```
Error: Dependencies lock file is not found in /home/runner/work/React_CICD/React_CICD
```

**原因**: `cache-dependency-path` が未設定

**解決方法**:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "npm"
    cache-dependency-path: todo-cicd/package-lock.json
```

### 4. Firebase認証設定問題

**問題**: 
```
Error: Failed to authenticate, have you run firebase login?
```

**原因**: サービスアカウントキーのGitHub Secrets設定不備

#### 4.1 Secret名の不一致

**問題**: Secret名のタイポ
- ワークフロー: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- 実際のSecret: `GOOGLE_APPLICATION_CREDENTIALS`

**解決方法**: ワークフローのSecret名を修正

#### 4.2 Secret値が空

**問題**: 
```
Secret length: 0
syntax error near unexpected token '|'
```

**原因**: GitHub Secretsに値が正しく設定されていない

## Firebase認証の正しい設定手順

### 1. サービスアカウントキーの取得

Google Cloud ConsoleでFirebaseプロジェクトのサービスアカウントキーをダウンロード:
```
gen-lang-client-0629277277-b740ebb277cc.json
```

### 2. Base64エンコード

```bash
# macOS版base64コマンドを使用
base64 -i gen-lang-client-0629277277-b740ebb277cc.json -o encoded_firebase_key.txt

# ファイルサイズ確認
wc -c < encoded_firebase_key.txt
# 結果: 3213 bytes
```

### 3. GitHub Secretsに設定

1. `https://github.com/tokechan/React_CICD/settings/secrets/actions`
2. **New repository secret**
3. **Name**: `GOOGLE_APPLICATION_CREDENTIALS`
4. **Secret**: Base64エンコードされた文字列（3213文字）

### 4. ワークフローでの使用

```yaml
- name: Prepare Google Application Credentials
  run: |
    echo ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }} | base64 --decode > $HOME/private-key.json

- name: Deploy to Firebase
  env:
    GOOGLE_APPLICATION_CREDENTIALS: $HOME/private-key.json
  run: |
    firebase experiments:enable webframeworks
    firebase use cicd-todo-app-89c3b
    firebase deploy --only hosting --non-interactive
  working-directory: todo-cicd

- name: Remove private key
  if: always()
  run: rm $HOME/private-key.json
```

## 現在の状況

- **Build Phase**: ✅ 成功
- **Test Phase**: ✅ 成功  
- **Deploy Phase**: ❌ Firebase認証エラーが継続

## 次のステップ

1. GitHub Secretsの再設定確認
2. サービスアカウントキーの権限確認
3. 代替案としてFirebase CLI Tokenの検討

## 参考ファイル

- `.github/workflows/pipeline.yaml` - CI/CDワークフロー設定
- `todo-cicd/firebase.json` - Firebase設定
- `todo-cicd/.firebaserc` - Firebaseプロジェクト設定

## トラブルシューティングのポイント

1. **階層構造**: リポジトリルートと作業ディレクトリの違いを意識
2. **Secret名**: 大文字小文字、スペース、特殊文字の完全一致
3. **パス設定**: `working-directory` と `cache-dependency-path` の一貫性
4. **Base64エンコード**: macOSとLinuxの互換性に注意

---

*最終更新: 2025年8月15日*
