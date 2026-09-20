# 像素工坊 Blocksmith

类马里奥制造风格的浏览器平台跳跃游戏：跑跳、踩敌、编辑关卡、立刻试玩。

**在线试玩**：https://ChuKuang.github.io/mario-maker/

## 玩法
- 移动 `A/D` 或方向键
- 跳跃 / 二段跳 `Space`
- 疾跑 `Shift`
- 暂停 `Esc` · 重开 `R` · 静音 `M`
- 编辑器：左键绘制 · 右键/`E` 擦除 · 数字键换笔刷 · `Enter` 试玩

### 敌人图例
- **绿光脚下**（板栗仔、乌龟）→ 可踩
- **红环 + 尖刺**（刺猬）→ 禁踩，碰到就死

### 内容
- 5 个官方 Demo 关（新手之路 / 坑与弹簧 / 敌阵走廊 / 冰霜高台 / 试炼工厂）
- 瓦片关卡编辑器（地面、砖、问号、弹簧、冰、熔岩、移动平台、敌人…）
- 程序化 WebAudio 背景音乐与音效
- 自定义关卡保存在浏览器 localStorage（本机，不上传）

## 本地运行

```bash
npm install
npm run dev
# http://127.0.0.1:5188
```

Windows 也可双击 `启动游戏.bat`。

```bash
npm run build    # 产出 dist/
npm test         # Playwright（可选）
```

## 发布到 GitHub Pages

1. 在 GitHub 新建仓库（本项目：`ChuKuang/mario-maker`，Public）。
2. 在本项目目录执行：

```bash
git init
git add .
git commit -m "feat: Blocksmith Mario-Maker-like web game"
git branch -M main
git remote add origin https://github.com/ChuKuang/mario-maker.git
git push -u origin main
```

3. 打开仓库 **Settings → Pages**：
   - Source: **GitHub Actions**
4. 等 Actions 跑完（工作流 `Deploy to GitHub Pages`）。
5. 访问：`https://ChuKuang.github.io/mario-maker/`

> 若 Pages 用的是 “Deploy from a branch” 且分支选 `gh-pages`，可把构建产物推到该分支；本仓库默认用 **Actions** 自动发布 `dist/`。

### 路径说明
`vite.config.ts` 里 `base` 默认为 `./`（相对路径），适配 GitHub 项目页 `https://user.github.io/repo/`。  
若使用用户主页仓库 `username.github.io`，同样可用 `./`。

## 技术
- TypeScript + Vite + Three.js
- 自定义 AABB 瓦片物理（60Hz fixed step）
- 无后端；音乐与模型均为程序化生成

## 说明
本项目为独立创作的玩法原型，未使用任天堂官方素材或商标资源，仅供学习与娱乐。
