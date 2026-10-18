with open('templates/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace version v=3.6 with v=4.0 for cache busting
html = html.replace("style.css') }}?v=3.6", "style.css') }}?v=4.0")
html = html.replace("app.js') }}?v=3.6", "app.js') }}?v=4.0")

with open('templates/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("SUCCESS: Upgraded static file versions to v=4.0 in index.html to break cache!")
