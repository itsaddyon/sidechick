import os, shutil

# Try to find deployment directory from .env or default location
deploy_dir = None
if os.path.exists('.env'):
    try:
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    if k.strip() == 'FRONTEND_DEPLOY_DIR':
                        deploy_dir = v.strip().strip('"').strip("'")
                        break
    except Exception:
        pass

if not deploy_dir:
    default_path = r"D:\Btech Projects\sidechick-frontend"
    if os.path.exists(default_path):
        deploy_dir = default_path

# 1. Build locally inside the sidechick-frontend subfolder of the backend repository
os.makedirs('sidechick-frontend/css', exist_ok=True)
os.makedirs('sidechick-frontend/js', exist_ok=True)

with open('templates/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace Flask template tags with relative production-ready asset paths
html = html.replace("{{ url_for('static', filename='css/style.css') }}", 'css/style.css')
html = html.replace("{{ url_for('static', filename='js/app.js') }}", 'js/app.js')
html = html.replace("{{ url_for('static', filename='favicon.svg') }}", 'favicon.svg')

with open('sidechick-frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

shutil.copy('static/css/style.css', 'sidechick-frontend/css/style.css')
shutil.copy('static/js/app.js', 'sidechick-frontend/js/app.js')
if os.path.exists('static/favicon.svg'):
    shutil.copy('static/favicon.svg', 'sidechick-frontend/favicon.svg')

print("[SUCCESS] Local frontend built successfully in sidechick-frontend/")

# 2. Automatically sync to the Vercel deploy directory (leaving .git and favicon.ico untouched!)
if deploy_dir:
    if os.path.exists(deploy_dir):
        print(f"[SYNC] Syncing assets to target frontend directory: {deploy_dir}...")
        
        # Ensure css/ and js/ folders exist in destination
        os.makedirs(os.path.join(deploy_dir, 'css'), exist_ok=True)
        os.makedirs(os.path.join(deploy_dir, 'js'), exist_ok=True)
        
        # Copy built assets
        shutil.copy('sidechick-frontend/index.html', os.path.join(deploy_dir, 'index.html'))
        shutil.copy('sidechick-frontend/css/style.css', os.path.join(deploy_dir, 'css', 'style.css'))
        shutil.copy('sidechick-frontend/js/app.js', os.path.join(deploy_dir, 'js', 'app.js'))
        if os.path.exists('sidechick-frontend/favicon.svg'):
            shutil.copy('sidechick-frontend/favicon.svg', os.path.join(deploy_dir, 'favicon.svg'))
            
        print("[SUCCESS] Sync complete! Files successfully updated in sidechick-frontend directory.")
    else:
        print(f"⚠️ Target deploy directory does not exist: {deploy_dir}")

