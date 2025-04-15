import pulp
import csv
import os

os.chdir(os.path.dirname(__file__))

def time_to_minutes(time_str):
    h, m = time_str.split(":")
    return int(h) * 60 + int(m)

def shift_hours(start, end):
    return (time_to_minutes(end) - time_to_minutes(start)) / 60

def shifts_overlap(s1, s2):
    if s1[0] != s2[0]:
        return False
    s1_start, s1_end = time_to_minutes(s1[1]), time_to_minutes(s1[2])
    s2_start, s2_end = time_to_minutes(s2[1]), time_to_minutes(s2[2])
    return s1_start < s2_end and s2_start < s1_end

opening_hours = {
    "Monday": ("07:30", "19:00"),
    "Tuesday": ("07:30", "17:00"),
    "Wednesday": ("07:30", "19:00"),
    "Thursday": ("07:30", "17:00"),
    "Friday": ("08:00", "15:30"),
}

base_dir = os.path.dirname(__file__)

employees_file = os.path.join(base_dir, "Employees.csv")
absence_file = os.path.join(base_dir, "Absence.csv")
shifts_file = os.path.join(base_dir, "Shifts.csv")

print("Trying to open Employees.csv at:", employees_file)
print("Trying to open Absence.csv at:", absence_file)
print("Trying to open Shifts.csv at:", shifts_file)

max_hours = {}
employees = []

with open(employees_file, "r") as file:
    reader = csv.DictReader(file)
    for row in reader:
        name = row["Name"]
        hours = float(row["HoursContract"])
        employees.append(name)
        max_hours[name] = hours


days_off = {}
with open(absence_file, "r", encoding="utf-8") as file:
    reader = csv.DictReader(file)
    for row in reader:
        name = row["Name"]
        day = row["Unavailable"]
        if name not in days_off:
            days_off[name] = []
        days_off[name].append(day)

shifts = []
with open(shifts_file, "r", encoding="utf-8") as file:
    reader = csv.DictReader(file)
    for row in reader:
        day, start, end = row["Day"], row["Start"], row["End"]
        if day in opening_hours:
            open_start, open_end = opening_hours[day]
            if time_to_minutes(start) >= time_to_minutes(open_start) and time_to_minutes(end) <= time_to_minutes(open_end):
                shifts.append((day, start, end))

if not os.path.exists("Employees.csv"):
    print("Employees.csv file not found!")
else:
    print("Employees.csv found.")                

if not os.path.exists("Absence.csv"):
    print("Absence.csv file not found!")
else:
    print("Absence.csv found.") 

if not os.path.exists("Shifts.csv"):
    print("Shifts.csv file not found!")
else:
    print("Shifts.csv found.") 

model = pulp.LpProblem("Shift_Scheduling", pulp.LpMinimize)

x = pulp.LpVariable.dicts("x", (employees, shifts), 0, 1, pulp.LpBinary)

model += 0

for s in shifts:
    model += pulp.lpSum(x[e][s] for e in employees) == 1

for e in employees:
    model += pulp.lpSum(x[e][s] * shift_hours(s[1], s[2]) for s in shifts) <= max_hours[e]

for e in days_off:
    for day in days_off[e]:
        for s in shifts:
            if s[0] == day:
                model += x[e][s] == 0

for e in employees:
    for i in range(len(shifts)):
        for j in range(i + 1, len(shifts)):
            if shifts_overlap(shifts[i], shifts[j]):
                model += x[e][shifts[i]] + x[e][shifts[j]] <= 1

model.solve()

print("Status:", pulp.LpStatus[model.status])
print("\nShift Plan:")
for e in employees:
    for s in shifts:
        if x[e][s].value() == 1:
            print(f"{e} works on {s[0]} from {s[1]} to {s[2]}")
print("Current working directory:", os.getcwd())

print(f"Found {len(shifts)} valid shifts:")
for s in shifts:
    print(s)

print("\nAll shifts (before filtering):")
with open(shifts_file, "r", encoding="utf-8") as file:
    reader = csv.DictReader(file)
    for row in reader:
        print(row)
