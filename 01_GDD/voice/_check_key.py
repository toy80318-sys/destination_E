import os
print("ENV len", len(os.environ.get("ELEVENLABS_API_KEY","")))
try:
    import winreg
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER,"Environment") as r:
        v,_=winreg.QueryValueEx(r,"ELEVENLABS_API_KEY")
    print("REG exists len", len(v))
except Exception as e:
    print("REG missing:", type(e).__name__)
