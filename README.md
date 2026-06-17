## 与上游仓库的差异

本仓库基于 <https://github.com/fogsong233/Typsidian.git>, 当前主要差异:

- 上游把行间 Typst 数学公式渲染为 Typst SVG, 行内 Typst 数学公式先经 `typst2tex` 转为 LaTeX 再交给 MathJax. 本仓库的行内和行间 Typst 数学公式都直接渲染为 Typst SVG.
- 上游遇到反斜杠或 MathJax 报错时再走 LaTeX fallback. 本仓库会先识别明显的 LaTeX 写法, 并在 Typst 编译失败时回退到 Obsidian 原始 LaTeX 渲染.
- 上游导出时会把行间 Typst 数学公式上传为图片, 行内 Typst 数学公式转成 LaTeX 文本. 本仓库导出时行内和行间 Typst 数学公式都上传为图片链接.
- 移除 `tex2typst`, 并新增 `mathjax-full`.
- 提供设置 URL 加载 typst.ts compiler 和 renderer wasm.
- 修正了行间 LaTeX fallback 设置项绑定, 避免它错误读写行内 fallback 设置.

---

![](./res/title.gif)
Typsidian is a plugin of [Obsidian](https://obsidian.md/), which provides releted functions of [typst](https://typst.app), suchs as correct display of typst code, export non-typst markdown file for other markdown platform.

中文介绍看这里:  <https://zhuanlan.zhihu.com/p/1936210614520361485>

Custom area that
display typst code rather than latex code, and it provides
that(only inline) when typst parsing gets errors, display automatically
return to latex(please enable it in settings).

And when you are focus on a note, open command panel:

![](./res/image.png)
run them will duplicate file of active editor with typst code automatically transformed to latex or image(png/svg,
uploaded to github, therefore you should ensure you add
your token and other relevant setting items, otherwise it goes wrong).

Feel free to issue.

#### Usage

Open the setting panel to see what you can do,
you can enable typst rendering in
math block, math inline, and customized lang block.
