path = r"D:\quicktiny\src\1-data\repository\ai.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

start = content.find("async function fetchTHSIndex(")
if start != -1:
    brace = 0
    i = content.find("{", start)
    end = i
    while end < len(content):
        if content[end] == "{": brace += 1
        elif content[end] == "}": 
            brace -= 1
            if brace == 0:
                end += 1
                break
        end += 1
    while start > 0 and content[start-1] in (" ", "\n", "\r"):
        start -= 1
    content = content[:start] + content[end:]
    print("Removed fetchTHSIndex")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
