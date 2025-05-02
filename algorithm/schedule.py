from fileinput import close

import pulp
import csv
import os
import json
from pymongo import MongoClient
from datetime import datetime, timedelta

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

# Funktion til at generere datoer for en uge baseret på en given mandagsdato
def generate_weekday_date_mapping(start_date_str):
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    return {
        "Monday": (start_date + timedelta(days=0)).date().isoformat(),
        "Tuesday": (start_date + timedelta(days=1)).date().isoformat(),
        "Wednesday": (start_date + timedelta(days=2)).date().isoformat(),
        "Thursday": (start_date + timedelta(days=3)).date().isoformat(),
        "Friday": (start_date + timedelta(days=4)).date().isoformat(),
    }

# Vælg hvilken uge du vil generere (mandagsdato)
week_start = "2025-04-28"
weekday_to_date = generate_weekday_date_mapping(week_start)

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
            else:
                print(f"Warning: Shift on {day} from {start} to {end} is outside opening hours ({open_start}–{open_end}) – Shift ignored.")
        else:
            raise ValueError(f"Incorrect weekdayFromDate: {day}")

# Tjek at alle CSV-filer er der
for file, name in zip([employees_file, absence_file, shifts_file], ["Employees.csv", "Absence.csv", "Shifts.csv"]):
    if not os.path.exists(file):
        print(f"{name} file not found!")
    else:
        print(f"{name} found.")

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

schedule_output = []
shift_output = []

for e in employees:
    schedule = {
        "employee": e,
        "week_start_date": week_start,
        "Monday_start": "",
        "Monday_end": "",
        "Tuesday_start": "",
        "Tuesday_end": "",
        "Wednesday_start": "",
        "Wednesday_end": "",
        "Thursday_start": "",
        "Thursday_end": "",
        "Friday_start": "",
        "Friday_end": "",
    }

    for s in shifts:
        if x[e][s].value() == 1:
            schedule[f'{s[0]}_start'] = s[1]
            schedule[f'{s[0]}_end'] = s[2]
            shift = {
                "employee": e,
                "date": weekday_to_date.get(s[0], week_start),
                "weekday": s[0],
                "start": s[1],
                "end": s[2],
            }
            shift_output.append(shift)
            print(f"{e} works on {shift['date']} from {s[1]} to {s[2]}")

    schedule_output.append(schedule)
    print(f'Schedule for {schedule['employee']} saved.')


with open("schedules.json", "w", encoding="utf-8") as f:
    json.dump(schedule_output, f, indent=4)
print("\nSchedules saved to schedules.json")

with open("shifts.json", "w", encoding="utf-8") as f:
    json.dump(shift_output, f, indent=4)
print("\nShifts saved to shifts.json")

# Upload til MongoDB
try:
    client = MongoClient("mongodb+srv://prasm24:p2gruppe7@wfm-test.nvx2k.mongodb.net/")
    db = client["WFM-Database"]
    collection = db["schedules"]

    collection.delete_many({})
    collection.insert_many(schedule_output)

    print("Schedules uploaded to MongoDB successfully.")

    collection = db["shifts"]

    collection.delete_many({})
    collection.insert_many(shift_output)

    print("Shifts uploaded to MongoDB successfully.")

except Exception as e:
    print("Failed to upload to MongoDB:", e)
