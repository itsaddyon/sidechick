"""Copy the frontend (static/) into sidechick-frontend/ for the Vercel deploy.
Also copies to FRONTEND_DEPLOY_DIR (from .env) or D:\\Btech Projects\\sidechick-frontend if it exists."""
import os, shutil

FILES = ["index.html", "favicon.svg", "css/style.css", "js/app.js"]


def read_env_dir():
    if not os.path.exists(".env"):
        return None
    for line in open(".env", encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            if k.strip() == "FRONTEND_DEPLOY_DIR":
                return v.strip().strip("\"'")
    return None


targets = ["sidechick-frontend"]
extra = read_env_dir() or r"D:\Btech Projects\sidechick-frontend"
if os.path.isdir(extra) and os.path.abspath(extra) not in map(os.path.abspath, targets):
    targets.append(extra)

for t in targets:
    for f in FILES:
        dst = os.path.join(t, f)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy(os.path.join("static", f), dst)
    print("Synced ->", t)
