# recrd
a mobile social media app where users can rank albums they've listened to and see what others like too!

## How to run:
### Back end
1. `cd \recrd\backend`
2. `python -m venv venv`
3. `.\venv\Scripts\Activate.ps1` (Windows) | `source venv/bin/activate` (Mac/Linux)
4. `pip install requirements.txt`
5. `uvicorn main:app --reload`

### Front end
1. `cd recrd`
2. `npm install`
3. `npx expo start`