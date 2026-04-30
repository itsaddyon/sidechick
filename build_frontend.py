import os, shutil

os.makedirs('sidechick-frontend/css', exist_ok=True)
os.makedirs('sidechick-frontend/js', exist_ok=True)

with open('templates/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace("{{ url_for('static', filename='css/style.css') }}", 'css/style.css')
html = html.replace("{{ url_for('static', filename='js/app.js') }}", 'js/app.js')
html = html.replace("{{ url_for('static', filename='favicon.svg') }}", 'favicon.svg')

with open('sidechick-frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

shutil.copy('static/css/style.css', 'sidechick-frontend/css/style.css')
shutil.copy('static/js/app.js', 'sidechick-frontend/js/app.js')
if os.path.exists('static/favicon.svg'):
    shutil.copy('static/favicon.svg', 'sidechick-frontend/favicon.svg')

print("Frontend built successfully in sidechick-frontend/")
