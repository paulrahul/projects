import json
import requests

BASE_URL='https://radiooooo.com/'

class Radio5Session:
    def __init__(self):
        self.cookies = None

    def login_radio5(self, uname, pwd):
        res = requests.post(BASE_URL + 'account/login',
                            data = {"email": uname, "password": pwd})
        if res.status_code != 200:
            print("Login failed due to: " + res.reason)
            return False

        self.cookies = {}
        for k, v in res.cookies.iteritems():
            self.cookies[k] = v

        return True

    def fetch_radio5_likes(self, contributor_id):
        res = requests.get(
            BASE_URL + 'contributor/likes/' +
            contributor_id + '?page=1&size=50',
            cookies=self.cookies)
        if res.status_code != 200:
            print("Retrieving likes failed due to: " + res.reason)

        return json.loads(res.text)

    def import_likes(self, likes):
        for l in likes:
            print(l['title'] + ' - ' + l['artist'])

if __name__ == "__main__":
    sess = Radio5Session()

    file_name = "./props.txt"

    props = {}
    with open(file_name) as f:
        for l in f.readlines():
            entry = l.split('=')
            props[entry[0]] = entry[1].strip('\n')

    ret = sess.login_radio5(props['uname'], props['pwd'])
    if ret:
        likes = sess.fetch_radio5_likes(props['contributor_id'])
        sess.import_likes(likes)


