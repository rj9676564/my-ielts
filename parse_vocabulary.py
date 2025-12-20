#!/usr/bin/env python3
"""
便捷脚本：从项目根目录运行 vocabulary parser
"""
import subprocess
import sys
from pathlib import Path

# 获取项目根目录和 parser.py 的路径
project_root = Path(__file__).parent
parser_path = project_root / 'src' / 'pages' / 'vocabulary' / 'parser.py'

if __name__ == '__main__':
    # 切换到 parser.py 所在目录并运行
    result = subprocess.run(
        [sys.executable, str(parser_path)],
        cwd=str(parser_path.parent),
        check=True
    )
    print("✅ vocabulary.js 已更新！")

