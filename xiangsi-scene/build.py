"""Bundle the local Three.js module and scene into one offline HTML document."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parent
engine = base64.b64encode((root / 'three.module.min.js').read_bytes()).decode('ascii')
controls = (root / 'orbit-controls.js').read_text(encoding='utf-8')
access_details = (root / 'access-details.js').read_text(encoding='utf-8')
scene = (root / 'scene.js').read_text(encoding='utf-8')
html = '''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#e5ebe8">
<meta name="description" content="广西民族大学相思湖校区南门三渲二微缩模型，可旋转和缩放。">
<title>广西民族大学相思湖校区南门 · 微缩场景</title>
<style>
*{box-sizing:border-box}
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#e5ebe8}
canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}
</style>
</head>
<body>
<canvas aria-label="广西民族大学相思湖校区南门微缩模型。拖拽旋转、滚轮缩放，触屏单指旋转、双指缩放，键盘方向键旋转、加减键缩放。" tabindex="0"></canvas>
<!-- 建筑参考：
https://english.gxmzu.edu.cn/info/1043/1068.htm
https://touch.travel.qunar.com/comment/10156611041
https://youimg1.c-ctrip.com/target/100c0w000000kdmzjDD95.jpg
中央重檐门楼、两侧拱门和校名依据参考重构。
街区与园林在方形底座中经过艺术化压缩，不是测绘模型。
Three.js r160, MIT License, Copyright 2010-2023 Three.js Authors.
-->
<script type="module">
'''
html += 'import * as THREE from "data:text/javascript;base64,' + engine + '";\n'
html += controls + '\n' + access_details + '\n' + scene + '\n</script>\n</body>\n</html>\n'
target = root.parent / 'gxun-south-gate.html'
target.write_text(html, encoding='utf-8')
print(f'Built {target.name}: {target.stat().st_size:,} bytes; all assets embedded.')
