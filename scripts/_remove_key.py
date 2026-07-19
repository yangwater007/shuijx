import re

# Fix both files - remove hardcoded fallback key
for filename in ["index.ts", "index_single.ts"]:
    path = rf"D:\quicktiny\supabase\functions\mcp\{filename}"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace the fallback key with empty string
    content = content.replace(
        '?? "REDACTED";',
        '?? ""; // set SUPABASE_SERVICE_ROLE_KEY env var'
    )
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Fixed {filename}")

print("Done")
