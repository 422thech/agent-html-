# agent-html-

个人学习用途。

## HTML 作品集

四个可以直接在浏览器中打开的网页项目。每个项目均附有根据成品内容精炼整理的生成提示词 TXT。

| 项目 | 入口 | 提示词 |
| --- | --- | --- |
| 鹈鹕骑行明信片 | [pelican-ride.html](pelican-ride.html) | [生成提示词](pelican-ride-提示词.txt) |
| 我的家乡，南宁 | [nanning.html](nanning.html) | [生成提示词](nanning-提示词.txt) |
| 相思湖校区南门微缩场景 | [gxun-south-gate.html](gxun-south-gate.html) | [生成提示词](gxun-south-gate-提示词.txt) |
| 内在星图人格测试 | [mbti/index.html](mbti/index.html) | [生成提示词](mbti/生成提示词.txt) |

下载仓库后，双击对应 HTML 即可使用，无需启动后端。南门场景需要浏览器支持 WebGL；源码和打包脚本位于 `xiangsi-scene/`。

## 内在星图

包含 48 道原创题目、四维度正反向计分、16 型完整解读、真实答题依据、进度保存、手机布局、PNG 分享卡片和报告打印。所有资源均内嵌，无运行时依赖。

运行计分与数据检查：

```sh
node --test mbti/test.cjs
```

`mbti/browser-check.cjs` 为开发验收脚本，需要 Playwright 和 Microsoft Edge。可用 `PLAYWRIGHT_PATH` 指向现有 Playwright 包路径；不设置时使用本地安装的 `playwright`。网页运行本身不需要这两个开发工具。

人格测试仅用于自我探索，不是心理诊断，且不是官方 MBTI 测评。

浏览器临时配置、依赖缓存和本地环境变量不纳入仓库。
