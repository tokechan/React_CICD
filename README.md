# React todo app CICD ver
今回はJISOUの渡邊さんのQiitaコンテンツのレビューと自分の力を試すべく実施

[Qiita content](https://qiita.com/Sicut_study/private/37cf8f31afd0f703ffb1)


## tech stack
- React
- Vite
- TailwindCSS
- TypeScript
- Vitest
- React testing library 
- Github Actions
- Firebase Hosting


[Demo page](https://cicd-todo-app-89c3b.web.app/)


## CICDで何をしているか？
CIでVitestとReact testing libraryを活用して自動テストを構築
VitestがJavaScriptで挙動する部分をテストしている
Reactなどの描画されているところはVitestでは確認ができないのでReact testing libraryが必要になる

CDはGithubActionsを使用した
具体的には```github/workflows```というフォルダを作りその中に```pipeline.yaml```というファイルを作りそこにActionsのコードを書く

## CICDのメリット
- 品質の向上：早期バグの発見、コード品質の維持、デグレード防止
- 作業効率の改善：手作業の削減、開発速度の向上、集中力の向上 
- 市場競争力の向上：迅速な機能リリース、顧客フィードバックへの対応、市場変化への対応力
- コスト削減：人的ミスにようる損失防止、開発工数の最適化、インフラ運用の効率化


## 手順

1, 環境構築（フロントエンド側）
2, TODOアプリの骨格を作る
3, CSSスタイルを当てる
4, Vitestを書いて自動テストを入れる
5, Firebase Hostingの設定＆デプロイする
6, Github ActionsでCI/CDパイプラインを構築する

