import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

project_dir = r"C:\Users\secon\Documents\ArabSeedScraper"

print("--- Privacy Cleanup in Progress ---")

# 1. Modify README.md to remove the local paths section completely
readme_path = os.path.join(project_dir, "README.md")
if os.path.exists(readme_path):
    print("Cleaning README.md...")
    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We want to remove the section starting with "## 👨‍💻 معلومات النقل والمسارات"
    pattern = r"\n## 👨‍💻 معلومات النقل والمسارات.*$"
    cleaned_content, count = re.subn(pattern, "", content, flags=re.DOTALL | re.MULTILINE)
    
    # Also clean any specific mentions of secon if any
    cleaned_content = cleaned_content.replace(r"C:\Users\secon\Documents\ArabSeedScraper", ".")
    cleaned_content = cleaned_content.replace("secon", "user")
    
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(cleaned_content)
    print("README.md cleaned successfully!")

# Let's import re for regex substitutions
import re

# 2. Walk through all files in ArabSeedScraper and verify if they contain "secon"
for root, dirs, files in os.walk(project_dir):
    if ".git" in root or ".egg-info" in root or "dist" in root or "__pycache__" in root:
        continue
    for file in files:
        file_path = os.path.join(root, file)
        if file.endswith(('.md', '.py', '.toml', '.html', '.txt')):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            if "secon" in content or "C:\\Users" in content:
                print(f"Cleaning local path in file: {file_path}")
                content = content.replace(r"C:\Users\secon\Documents\ArabSeedScraper", ".")
                content = content.replace("secon", "user")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)

print("\n--- Privacy Cleanup Completed Locally! ---")
