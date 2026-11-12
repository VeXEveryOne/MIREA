"""PPOIS6: reproducible WBS, dependencies, calendar and assignments in person-days."""
from pathlib import Path
from datetime import date, timedelta
from collections import defaultdict
import json

BASE = Path(__file__).resolve().parents[1]
STAGES = [
    (1, 'Уточнение требований', 5, [], {'Аналитик':5, 'Руководитель проекта':2}),
    (2, 'Модели и архитектура', 5, [1], {'Аналитик':5, 'Архитектор':3}),
    (3, 'БД и миграции', 6, [2], {'Backend-разработчик':6, 'Администратор БД':4}),
    (4, 'Доменная логика', 8, [3], {'Backend-разработчик':8, 'Тестировщик':3}),
    (5, 'Клиентские формы', 7, [2], {'Frontend-разработчик':7, 'Аналитик':2}),
    (6, 'Интеграция модулей', 4, [4,5], {'Backend-разработчик':4, 'Frontend-разработчик':2, 'Тестировщик':4}),
    (7, 'Системное тестирование', 6, [6], {'Тестировщик':6, 'Backend-разработчик':3}),
    (8, 'Пилот и передача', 3, [7], {'Руководитель проекта':3, 'Инженер эксплуатации':3}),
]
WORK = {
    1:[('Обследовать процесс',2,{'Аналитик':2}),('Согласовать требования',3,{'Аналитик':3,'Руководитель проекта':2})],
    2:[('Построить модели',2,{'Аналитик':2,'Архитектор':1}),('Спроектировать архитектуру',3,{'Аналитик':3,'Архитектор':2})],
    3:[('Разработать схему БД',3,{'Backend-разработчик':3,'Администратор БД':2}),('Подготовить миграции и данные',3,{'Backend-разработчик':3,'Администратор БД':2})],
    4:[('Реализовать подбор',4,{'Backend-разработчик':4,'Тестировщик':1}),('Реализовать расчёт',4,{'Backend-разработчик':4,'Тестировщик':2})],
    5:[('Спроектировать формы ролей',3,{'Frontend-разработчик':3,'Аналитик':2}),('Реализовать ввод и результат',4,{'Frontend-разработчик':4})],
    6:[('Соединить клиент и сервис',2,{'Backend-разработчик':2,'Frontend-разработчик':2,'Тестировщик':2}),('Проверить сквозной сценарий',2,{'Backend-разработчик':2,'Тестировщик':2})],
    7:[('Проверить функции и ошибки',3,{'Тестировщик':3}),('Устранить дефекты',3,{'Тестировщик':3,'Backend-разработчик':3})],
    8:[('Провести пилот',1,{'Руководитель проекта':1,'Инженер эксплуатации':1}),('Подготовить передачу',2,{'Руководитель проекта':2,'Инженер эксплуатации':2})],
}


def build():
    calendar = []
    day = date(2026,10,5)
    while len(calendar)<100:
        if day.weekday()<5 and day!=date(2026,11,4):
            calendar.append(day)
        day += timedelta(days=1)
    tasks = [dict(id=i,name=n,duration=d,after=a,effort=e) for i,n,d,a,e in STAGES]
    by_id = {t['id']:t for t in tasks}
    loads = defaultdict(float)
    for phase in tasks:
        phase['start_day'] = max([by_id[i]['end_day']+1 for i in phase['after']] or [0])
        phase['end_day'] = phase['start_day']+phase['duration']-1
        phase['start_date'] = calendar[phase['start_day']].isoformat()
        phase['end_date'] = calendar[phase['end_day']].isoformat()
        position = phase['start_day']
        phase['subtasks'] = []
        for j,(name,duration,effort) in enumerate(WORK[phase['id']],1):
            code = f"{phase['id']}.{j}"
            after = [f"{i}.{len(WORK[i])}" for i in phase['after']] if j==1 else [f"{phase['id']}.{j-1}"]
            item = dict(name=name,duration=duration,code=code,after=after,
                        start_day=position,end_day=position+duration-1,effort=effort,performers=list(effort))
            item['start_date'] = calendar[item['start_day']].isoformat()
            item['end_date'] = calendar[item['end_day']].isoformat()
            for role,person_days in effort.items():
                assert 0<person_days<=duration, (code,role,'overallocated')
                for n in range(item['start_day'],item['end_day']+1):
                    loads[role,n] += person_days/duration
            phase['subtasks'].append(item)
            position += duration
        assert position==phase['end_day']+1
        assert {r:sum(t['effort'].get(r,0) for t in phase['subtasks']) for r in phase['effort']}==phase['effort']
    assert all(v<=1.000001 for v in loads.values())
    total_days = max(t['end_day'] for t in tasks)+1
    for phase in reversed(tasks):
        successors = [t for t in tasks if phase['id'] in t['after']]
        phase['latest_end_day'] = min([t['latest_start_day']-1 for t in successors] or [total_days-1])
        phase['latest_start_day'] = phase['latest_end_day']-phase['duration']+1
        phase['slack_workdays'] = phase['latest_start_day']-phase['start_day']
        assert phase['slack_workdays']>=0
    critical = [t['id'] for t in tasks if t['slack_workdays']==0]
    assert critical==[1,2,3,4,6,7,8]
    assert sum(by_id[i]['duration'] for i in critical)==total_days==37
    result = dict(kind='project estimates, not actual completed durations',
                  start='2026-10-05',calendar='Monday-Friday, excluding 2026-11-04; no overtime',
                  duration_workdays=total_days,effort_person_days=sum(sum(t['effort'].values()) for t in tasks),
                  finish=max(t['end_date'] for t in tasks),critical_path=critical,
                  max_role_utilization=max(loads.values()),tasks=tasks,
                  role_effort={r:sum(t['effort'].get(r,0) for t in tasks) for r in sorted({r for t in tasks for r in t['effort']})},
                  checks=dict(dependencies=True,role_capacity=True,duration_effort_distinction=True,
                              forward_backward_pass=True,subtask_assignments=True))
    assert result['effort_person_days']==70
    target = BASE/'Планирование/План_разработки.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:result[k] for k in ('duration_workdays','effort_person_days','finish','critical_path')},ensure_ascii=False))
    return result


if __name__=='__main__':
    build()
