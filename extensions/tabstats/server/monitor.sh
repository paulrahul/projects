ps aux | grep redis-server | grep -v grep
if [ $? == 0 ]; then
  echo "DB Found"
else
  echo "DB Not found"
  rediss >/dev/null 2&>1
fi

ps aux | grep db_server | grep -v grep
if [ $? == 0 ]; then
  echo "DB Server Found"
else
  echo "DB Server Not found"
  /usr/local/bin/node ~/Codez/projects/extensions/tabstats/server/db_server.js & >/dev/null 2&>1
fi
