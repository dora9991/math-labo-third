#!/usr/bin/env python3
"""指定時刻(HH:MM)まで待ってから run-all.py を全章で再開する（作成済みIDは自動スキップ）。使い方: nohup python3 docs/enemy-work/resume-at.py 01:30 &"""
import sys, time, datetime, subprocess, os
hh, mm = map(int, sys.argv[1].split(":"))
now = datetime.datetime.now(); t = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
if t <= now: t += datetime.timedelta(days=1)
print("waiting until", t, flush=True)
time.sleep((t - now).total_seconds())
root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(root)
subprocess.run(["python3", "docs/enemy-work/run-all.py"], env={**os.environ, "PATH": os.path.expanduser("~/.npm-global/bin") + ":" + os.environ["PATH"]})
