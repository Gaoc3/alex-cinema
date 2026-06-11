import os
import subprocess
import time
from datetime import datetime

# إعدادات المزامنة
SYNC_INTERVAL = 30  # وقت الانتظار بالثواني بين كل عملية فحص

def sync_to_github():
    try:
        # فحص إذا كان هناك تغييرات
        status_output = subprocess.check_output(['git', 'status', '--porcelain']).decode('utf-8').strip()
        
        if status_output:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Changes detected! Syncing to GitHub...")
            
            # إضافة التعديلات
            subprocess.run(['git', 'add', '-A'], check=True)
            
            # عمل Commit
            commit_msg = f"Auto-commit: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            subprocess.run(['git', 'commit', '-m', commit_msg], check=True)
            
            # رفع التعديلات
            subprocess.run(['git', 'push', 'origin', 'main'], check=True)
            
            print("Sync successful.")
        else:
            # يمكن تفعيل هذا السطر لاختبار عمل السكربت بدون تغييرات
            # print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] No changes detected.")
            pass
            
    except subprocess.CalledProcessError as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Git error: {e}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Unexpected error: {e}")

if __name__ == "__main__":
    print(f"Starting Auto-Sync to GitHub every {SYNC_INTERVAL} seconds...")
    while True:
        sync_to_github()
        time.sleep(SYNC_INTERVAL)
