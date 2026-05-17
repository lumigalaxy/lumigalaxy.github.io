#!/usr/bin/env python3
"""
把 index-standalone.html + alien-pet/ 子模块打包成单文件 HTML。
- 12 个 SVG 用 base64 内联成 data URI
- alien-pet.js 内嵌到 <script type="module"> 里
- 修一行让 SVG 加载优先走 embedded 表，离线也能完整运行
"""
import base64
import re
import sys
from pathlib import Path

ROOT      = Path(__file__).parent
ASSETS    = ROOT / 'alien-pet' / 'assets'
CLAWD_SVG = ROOT / 'clawd-desktop-opencode-main' / 'assets' / 'svg'
JS_FILE   = ROOT / 'alien-pet' / 'alien-pet.js'
# 用法：python3 build-portable.py [input.html] [output.html]
HTML_IN  = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'index-standalone.html')
HTML_OUT = ROOT / (sys.argv[2] if len(sys.argv) > 2 else 'index-portable.html')

# alien-pet 使用的 12 个状态文件名（所有物种同名，仅前缀不同）
NEEDED_STATES = [
    'idle-living', 'idle-follow', 'happy', 'working-thinking', 'working-typing',
    'sleeping', 'notification', 'error', 'static-base',
    'mini-idle', 'mini-enter', 'mini-peek',
]

# 1. 收集 SVG → data URI
embed = {}
for svg in sorted(ASSETS.glob('*.svg')):
    b64 = base64.b64encode(svg.read_bytes()).decode('ascii')
    embed[svg.name] = f'data:image/svg+xml;base64,{b64}'
print(f'embedded {len(embed)} alien svgs')

# 1b. 同步嵌入 clawd 同名状态 SVG、仅限需要的 12 个
for state in NEEDED_STATES:
    svg = CLAWD_SVG / f'clawd-{state}.svg'
    if svg.exists():
        b64 = base64.b64encode(svg.read_bytes()).decode('ascii')
        embed[svg.name] = f'data:image/svg+xml;base64,{b64}'
    else:
        print(f'  warning: {svg.name} not found')
print(f'total embedded svgs: {len(embed)}')

embed_js = ',\n'.join(f"  '{k}': '{v}'" for k, v in embed.items())
embed_block = f'const EMBEDDED_SVGS = {{\n{embed_js}\n}};'

# 2. 读 alien-pet.js，注入 embed 查找
js = JS_FILE.read_text(encoding='utf-8')
old_line = "const src = this.options.basePath.replace(/\\/?$/, '/') + file;"
new_line = "const src = EMBEDDED_SVGS[file] || (this.options.basePath.replace(/\\/?$/, '/') + file);"
assert old_line in js, '找不到目标行，alien-pet.js 结构可能变了'
js_patched = js.replace(old_line, new_line)
js_inline  = embed_block + '\n\n' + js_patched

# 3. 读 HTML。如果已烘（包含内联 EMBEDDED_SVGS 脚本），先还原为 <script src> 引用
html = HTML_IN.read_text(encoding='utf-8')
src_tag = '<script type="module" src="./alien-pet/alien-pet.js"></script>'
inline_re = re.compile(
    r'<script type="module">\s*const EMBEDDED_SVGS = \{.*?</script>',
    flags=re.DOTALL,
)
if inline_re.search(html):
    html = inline_re.sub(src_tag, html)
    print('un-baked existing inline block')

# 现在 HTML 应该包含原始的 <script src> 标签了
new_tag = '<script type="module">\n' + js_inline + '\n</script>'
assert src_tag in html, '找不到 alien-pet.js 引用标签'
html_new = html.replace(src_tag, new_tag)

HTML_OUT.write_text(html_new, encoding='utf-8')
size_kb = HTML_OUT.stat().st_size / 1024
print(f'wrote {HTML_OUT.name}: {size_kb:.1f} KB')
