path = r"D:\quicktiny\src\4-presentation\pages\AIAnalysis\AIAnalysis.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Fix line 120: un-comment toolCallStatus
for i, line in enumerate(lines):
    if "//     thinkingText, toolCallStatus," in line:
        lines[i] = "//     thinkingText,\n" + "      toolCallStatus,\n"
        print(f"AIAnalysis.tsx L{i+1}: restored toolCallStatus")
        break

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)
print("done")
