# TodoTime

个人番茄钟与 Todo 管理工具，采用本地优先的数据模型：浏览器本地存储负责离线使用，独立的 GitHub 私有仓库负责多端 JSON 同步和版本备份。

## 仓库分工

- `Fallme/todotime`：程序代码，不存放个人任务数据。
- `Fallme/todotime_data`：必须设为 Private，仅存放 `config.json` 和 `data/YYYY/MM/YYYY-MM-DD.json`。

前端只保存个人同步密码。GitHub Token 仅由 Vercel 服务端函数读取，不能使用 `VITE_` 前缀。

## 部署变量

在 Vercel 项目中配置：

```text
GITHUB_TOKEN=<仅有 todotime_data Contents 读写权限的 fine-grained token>
GITHUB_DATA_REPO=Fallme/todotime_data
SYNC_SECRET=<各设备输入的同一个长密码>
```

可选的 `SYNC_ALLOWED_ORIGIN` 只在前端和 API 分属不同域名时使用。同域部署不需要配置。

## 本地开发

```bash
npm install
npm run dev
```

未配置同步密码时，应用保持纯本地模式，不会请求 GitHub。

## 原始 Vite 说明

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
