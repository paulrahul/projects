ps aux | grep db_server | grep -v grep
if [ $? == 0 ]; then
  echo "Found"
else
  echo "Not found"
  /usr/local/bin/node ~/Codez/projects/extensions/tabstats/server/db_server.js &
fi
