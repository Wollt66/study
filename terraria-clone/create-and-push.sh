#!/bin/bash
# 创建 gitcode.com 仓库并推送
set -e

REPO_NAME="terraria-clone"
REPO_DESC="泰拉瑞亚风格2D沙盒生存游戏 - 随机地形/挖掘/建造/合成/怪物/昼夜"

# 用 git credential fill 获取凭证（不暴露在命令行）
CRED=$(printf 'protocol=https\nhost=gitcode.com\n\n' | git credential fill 2>/dev/null)
TOKEN=$(echo "$CRED" | grep "^password=" | cut -d= -f2-)
USERNAME=$(echo "$CRED" | grep "^username=" | cut -d= -f2-)

if [ -z "$TOKEN" ]; then
  echo "ERROR: 无法获取 gitcode token"
  exit 1
fi

echo "获取到凭证: username=$USERNAME"

# 用 GitLab API 创建仓库
echo "正在创建 gitcode.com 仓库 $REPO_NAME..."
HTTP_CODE=$(curl -s -o /tmp/gitcode-create-resp.json -w "%{http_code}" \
  -H "PRIVATE-TOKEN: $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST "https://gitcode.com/api/v4/projects" \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"visibility\":\"public\"}")

echo "API 响应: HTTP $HTTP_CODE"
cat /tmp/gitcode-create-resp.json | head -5

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "仓库创建成功"
elif [ "$HTTP_CODE" = "400" ]; then
  echo "仓库可能已存在，继续推送"
else
  echo "仓库创建失败 (HTTP $HTTP_CODE)"
  exit 1
fi

# 添加远程并推送
REMOTE_URL="https://$USERNAME:$TOKEN@gitcode.com/$USERNAME/$REPO_NAME.git"
git remote remove origin 2>/dev/null || true
git remote add origin "https://gitcode.com/$USERNAME/$REPO_NAME.git"

echo "正在推送代码..."
git push -u "https://$USERNAME:$TOKEN@gitcode.com/$USERNAME/$REPO_NAME.git" main 2>&1 | tail -10

echo "推送完成"
echo "GIT_URL=https://gitcode.com/$USERNAME/$REPO_NAME.git"