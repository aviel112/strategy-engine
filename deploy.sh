#!/bin/zsh
set -u
cd /tmp/strategy-engine-deploy || exit 1

T=$(cat ~/.config/aviel/github_token) || { echo "❌ לא נמצא הטוקן"; exit 1; }
echo "✅ טוקן נטען (${#T} תווים)"

echo "--- 1. בודק את הטוקן מול GitHub ---"
WHO=$(curl -s -H "Authorization: token $T" https://api.github.com/user | grep '"login"')
echo "$WHO"
if [ -z "$WHO" ]; then echo "❌ הטוקן לא תקף. צריך ליצור חדש ב-github.com/settings/tokens"; exit 1; fi

echo "--- 2. יוצר ריפו ציבורי ---"
curl -s -X POST https://api.github.com/user/repos \
  -H "Authorization: token $T" \
  -H "Accept: application/vnd.github+json" \
  -d '{"name":"strategy-engine","private":false}' | grep -E '"(full_name|message)"'

echo "--- 3. מוסיף remote ודוחף ---"
git remote remove origin 2>/dev/null
git remote add origin git@github.com:aviel112/strategy-engine.git
git push -u origin main || { echo "❌ ה-push נכשל — כנראה מפתח SSH"; exit 1; }

echo "--- 4. מפעיל GitHub Pages ---"
curl -s -X POST https://api.github.com/repos/aviel112/strategy-engine/pages \
  -H "Authorization: token $T" \
  -H "Accept: application/vnd.github+json" \
  -d '{"source":{"branch":"main","path":"/"}}' | grep -E '"(html_url|message)"'

echo ""
echo "🎯 מוכן: https://aviel112.github.io/strategy-engine/"
echo "   (לוקח 1-2 דקות לעלות בפעם הראשונה)"
