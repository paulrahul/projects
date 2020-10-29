ps aux | grep file_server | grep -v grep
if [ $? == 0 ]; then
  echo "Found"
else
  echo "Not found"
  node ./file_server.js &
fi
