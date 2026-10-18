# Part 1: Enforce Cache Control in app.py
with open('app.py', 'r', encoding='utf-8') as f:
    app_code = f.read()

cache_header_code = """
@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    return r
"""

if "@app.after_request" not in app_code:
    app_code = app_code.replace("app.config['SECRET_KEY'] = secret_key", "app.config['SECRET_KEY'] = secret_key\n" + cache_header_code)
    print("SUCCESS: Cache Control headers injected into app.py!")
else:
    print("NOTE: Cache Control headers already present in app.py.")

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(app_code)

# Part 2: Fix the messages-empty display: grid !important bug in style.css
with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# We must remove !important from display on messages-empty so JavaScript style.display = 'none' can hide it!
old_empty_display = "display: grid !important;"
new_empty_display = "display: grid;"

if old_empty_display in css:
    css = css.replace(old_empty_display, new_empty_display)
    print("SUCCESS: Removed !important from messages-empty display!")
else:
    print("WARNING: display: grid !important; not found in style.css. Trying general replace...")
    css = css.replace("display:grid !important;", "display:grid;")
    print("SUCCESS: General display:grid replacement done!")

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)
