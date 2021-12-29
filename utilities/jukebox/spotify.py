import base64
import json
import requests

class Spotify:
    def __init__(self, client_id, client_secret):
        self.BASE_URL = "https://api.spotify.com/v1"

        self._client_id = client_id
        self._client_secret = client_secret

        self._access_token = None

        self._get_access_token()

    def _get_access_token(self):
        # encoding = 'utf-8'
        client_cred_str = self._client_id + ':' + self._client_secret
        b64_creds = base64.b64encode(client_cred_str.encode()).decode()

        headers = {'Authorization': 'Basic ' + b64_creds,
                   'Content-Type' : 'application/x-www-form-urlencoded'}

        res = requests.post(
            'https://accounts.spotify.com/api/token', 
            data = {'grant_type': 'client_credentials'},
            headers = headers)

        if res.status_code != 200:
            print("Could not fetch Spotify access token due to: " + res.reason)
            return False

        self._access_token = json.loads(res.text)['access_token']
        return True

if __name__ == "__main__":
    file_name = "./props.txt"

    props = {}
    with open(file_name) as f:
        for l in f.readlines():
            entry = l.split('=')
            props[entry[0]] = entry[1].strip('\n')

    spotify = Spotify(
        props['spotify_client_id'], props['spotify_client_secret'])
    

