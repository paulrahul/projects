ps aux | grep db_server | grep -v grep
if [ $? == 0 ]; then
  echo "Found"
else
  echo "Not found"
  node ./db_server.js &
fi
