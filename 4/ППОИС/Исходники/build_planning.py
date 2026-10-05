"""PPOIS6: dependency-checked project plan; estimates are not actual time sheets."""
from pathlib import Path
from datetime import date, timedelta
from collections import defaultdict
import json
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Patch

BASE=Path(__file__).resolve().parents[1]
tasks=[
    {'id':1,'name':'Уточнение требований','duration':5,'after':[], 'effort':{'Аналитик':5,'Руководитель проекта':2}},
    {'id':2,'name':'Модели и архитектура','duration':5,'after':[1], 'effort':{'Аналитик':5,'Архитектор':3}},
    {'id':3,'name':'БД и миграции','duration':6,'after':[2], 'effort':{'Backend-разработчик':6,'Администратор БД':4}},
    {'id':4,'name':'Доменная логика','duration':8,'after':[3], 'effort':{'Backend-разработчик':8,'Тестировщик':3}},
    {'id':5,'name':'Клиентские формы','duration':7,'after':[2], 'effort':{'Frontend-разработчик':7,'Аналитик':2}},
    {'id':6,'name':'Интеграция модулей','duration':4,'after':[4,5], 'effort':{'Backend-разработчик':4,'Frontend-разработчик':2,'Тестировщик':4}},
    {'id':7,'name':'Системное тестирование','duration':6,'after':[6], 'effort':{'Тестировщик':6,'Backend-разработчик':3}},
    {'id':8,'name':'Пилот и передача','duration':3,'after':[7], 'effort':{'Руководитель проекта':3,'Инженер эксплуатации':3}},
]
by_id={t['id']:t for t in tasks}; calendar=[]; d=date(2026,10,5)
while len(calendar)<100:
    if d.weekday()<5 and d!=date(2026,11,4): calendar.append(d)
    d+=timedelta(days=1)
loads=defaultdict(float)
for task in tasks:
    task['start_day']=max([by_id[i]['end_day']+1 for i in task['after']] or [0])
    task['end_day']=task['start_day']+task['duration']-1
    task['start_date']=calendar[task['start_day']].isoformat()
    task['end_date']=calendar[task['end_day']].isoformat()
    for role,effort in task['effort'].items():
        assert 0<effort<=task['duration']
        for n in range(task['start_day'],task['end_day']+1):loads[role,n]+=effort/task['duration']
assert all(v<=1.000001 for v in loads.values()),'Role capacity exceeded'
project_duration=max(t['end_day'] for t in tasks)+1
# Backward pass determines slack instead of declaring a hard-coded path.
for task in reversed(tasks):
    children=[t for t in tasks if task['id'] in t['after']]
    task['latest_end_day']=min([t['latest_start_day']-1 for t in children] or [project_duration-1])
    task['latest_start_day']=task['latest_end_day']-task['duration']+1
    task['slack_workdays']=task['latest_start_day']-task['start_day']
    assert task['slack_workdays']>=0
critical_path=[t['id'] for t in tasks if t['slack_workdays']==0]
assert critical_path==[1,2,3,4,6,7,8]
assert sum(by_id[i]['duration'] for i in critical_path)==project_duration==37
result={'kind':'project estimates, not actual completed durations','start':'2026-10-05',
    'calendar':'Monday-Friday, excluding 2026-11-04; no overtime',
    'duration_workdays':project_duration,
    'effort_person_days':sum(sum(t['effort'].values()) for t in tasks),
    'finish':max(t['end_date'] for t in tasks),'critical_path':critical_path,
    'max_role_utilization':max(loads.values()),'tasks':tasks,
    'role_effort':{role:sum(t['effort'].get(role,0) for t in tasks) for role in sorted({r for t in tasks for r in t['effort']})},
    'checks':{'dependencies':True,'role_capacity':True,'duration_effort_distinction':True,'forward_backward_pass':True}}
(BASE/'Планирование').mkdir(exist_ok=True)
(BASE/'Планирование/План_разработки.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':12})
fig,ax=plt.subplots(figsize=(12.6,5.5))
for i,task in enumerate(tasks):
    start=date.fromisoformat(task['start_date']);end=date.fromisoformat(task['end_date'])
    # Draw individual workdays: weekends and 4 November remain actual gaps.
    for index in range(task['start_day'],task['end_day']+1):
        ax.barh(i,1,left=mdates.date2num(calendar[index]),height=.55,
                color='#415a70' if task['id'] in critical_path else '#9a7a5d',edgecolor='white',linewidth=.4)
    ax.text(mdates.date2num(end)+1.5,i,f"{task['duration']} раб. дн.",va='center',fontsize=10)
ax.set_yticks(range(len(tasks)),[f"{t['id']}  {t['name']}" for t in tasks]);ax.invert_yaxis()
ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=mdates.MO))
ax.xaxis.set_major_formatter(mdates.DateFormatter('%d.%m'))
ax.grid(axis='x',alpha=.25);ax.set_axisbelow(True);ax.set_xlabel('Календарные даты 2026 года')
ax.spines[['top','right']].set_visible(False)
ax.legend(handles=[Patch(color='#415a70',label='Критический путь'),
                   Patch(color='#9a7a5d',label='Резерв 7 рабочих дней')],
          loc='upper center',bbox_to_anchor=(.5,1.16),ncol=2,frameon=False)
fig.tight_layout();fig.savefig(BASE/'Планирование/Календарный_график.png',dpi=220)
fig.savefig(BASE/'Планирование/Календарный_график.svg')
print(json.dumps({k:result[k] for k in ['duration_workdays','effort_person_days','finish','critical_path']},ensure_ascii=False))
