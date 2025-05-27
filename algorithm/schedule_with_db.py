# from fileinput import close
import sys
import pulp
import csv
import os
from pymongo import MongoClient
from datetime import date, datetime, timedelta
from collections import namedtuple, defaultdict

os.chdir(os.path.dirname(__file__))

week_diff = int(sys.argv[1])
print("Received param:", week_diff)

# Improved readability and renamed variables to be more intuitive. Sue me.
# - Peter

Shift = namedtuple("Shift", ["day", "start", "end"])

def time_to_minutes(time_str):
    try:
        hour, min = time_str.split(":")
        hour, min = int(hour), int(min)
        if not (0 <= hour <= 23 and 0 <= min <= 59):
            raise ValueError("Time out of range")
        return hour * 60 + min
    except (ValueError, AttributeError):
        raise ValueError("Invalid time format. Expected 'HH:MM'")

def shift_hours(start, end):
    if end < start:
        raise ValueError("Shift ends before it starts")
    return (time_to_minutes(end) - time_to_minutes(start)) / 60

def shifts_overlap(shift_1, shift_2):
    if shift_1.day != shift_2.day:
        return False
    shift_1_start, shift_1_end = time_to_minutes(shift_1.start), time_to_minutes(shift_1.end)
    shift_2_start, shift_2_end = time_to_minutes(shift_2.start), time_to_minutes(shift_2.end)
    return shift_1_start < shift_2_end and shift_2_start < shift_1_end

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
if week_diff:
    today = date.today() + timedelta(weeks=week_diff)
else:
    today = date.today()

week_start_date = today - timedelta(days=today.weekday())
week_start_datetime = datetime.combine(week_start_date, datetime.min.time())
week_start = week_start_date.isoformat()
next_week_start_date = week_start_date + timedelta(weeks=1)
next_week_start_datetime = datetime.combine(next_week_start_date, datetime.min.time())
next_week_start = next_week_start_date.isoformat()
weekday_to_date = generate_weekday_date_mapping(week_start)

opening_hours = {
    "Monday": ("07:30", "19:00"),
    "Tuesday": ("07:30", "17:00"),
    "Wednesday": ("07:30", "19:00"),
    "Thursday": ("07:30", "17:00"),
    "Friday": ("08:00", "15:30"),
}

day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

base_dir = os.path.dirname(__file__)

client = MongoClient("mongodb+srv://prasm24:p2gruppe7@wfm-test.nvx2k.mongodb.net/")
db = client["WFM-Database"]

users_db = db["users"].find().sort("first_name", 1)
absences_db = db["absences"].find({
    "archived": {"$ne": True},
    "$and": [
        { "leave_start": { "$lte": next_week_start_datetime } },
        {
            "$or": [
                { "leave_end": None },
                { "leave_end": { "$gte": week_start_datetime } }
            ]
        }
    ]
}).sort("leave_start", 1)
shifts_file = os.path.join(base_dir, "Shifts.csv")

max_hours = {}
employees = []

for user  in users_db:
    user_id = user.get("_id")
    hours = user.get("hours_per_week")
    employees.append(user_id)
    max_hours[user_id] = hours

days_off = defaultdict(list)
indefinite_leave = {}

for absence in absences_db:
    user_id = absence.get("user")
    start = absence.get("leave_start")
    end = absence.get("leave_end")
    if start and not end:
        end = next_week_start_date - timedelta(days=1)

    if start and end:
        current = start.date() if isinstance(start, datetime) else start
        end = end.date() if isinstance(end, datetime) else end
        while current <= end:
            day = day_names[current.weekday()]
            if day not in days_off[user_id]:
                days_off[user_id].append(day)
            current += timedelta(days=1)

all_shifts = []
with open(shifts_file, "r", encoding="utf-8") as file:
    reader = csv.DictReader(file)
    for row in reader:
        day, start, end = row["Day"], row["Start"], row["End"]
        if day in opening_hours:
            open_start, open_end = opening_hours[day]
            if time_to_minutes(start) >= time_to_minutes(open_start) and time_to_minutes(end) <= time_to_minutes(open_end):
                    all_shifts.append(Shift(day, start, end))
            else:
                print(f"Warning: Shift on {day} from {start} to {end} is outside opening hours ({open_start}–{open_end}) – Shift ignored.")
        else:
            raise ValueError(f"Incorrect weekdayFromDate: {day}")


model = pulp.LpProblem("Shift_Scheduling", pulp.LpMinimize)
x = pulp.LpVariable.dicts("x", (employees, all_shifts), 0, 1, pulp.LpBinary)

model += 0



for shift in all_shifts:
    model += pulp.lpSum(x[e][shift] for e in employees) == 1

for employee in employees:
    model += pulp.lpSum(x[employee][s] * shift_hours(s.start, s.end) for s in all_shifts) <= max_hours[employee]

for employee in days_off:
    for day in days_off[employee]:
        for shift in all_shifts:
            if shift.day == day:
                model += x[employee][shift] == 0

for employee in employees:
    for i in range(len(all_shifts)):
        for j in range(i + 1, len(all_shifts)):
            if shifts_overlap(all_shifts[i], all_shifts[j]):
                model += x[employee][all_shifts[i]] + x[employee][all_shifts[j]] <= 1

model.solve()

print("Status:", pulp.LpStatus[model.status])
print("\nShift Plan:")

if pulp.LpStatus[model.status] != "Optimal":
    sys.exit(1)


schedule_output = []
shift_output = []

for employee in employees:
    schedule = {
        "employee": employee,
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

    for shift in all_shifts:
        if x[employee][shift].value() == 1:
            schedule[f'{shift.day}_start'] = shift.start
            schedule[f'{shift.day}_end'] = shift.end
            applied_shift = {
                "employee": employee,
                "date": weekday_to_date.get(shift.day, week_start),
                "weekday": shift.day,
                "start": shift.start,
                "end": shift.end,
            }
            shift_output.append(applied_shift)
            print(f"{employee} works on {applied_shift['date']} from {shift.start} to {shift.end}")

    schedule_output.append(schedule)
    print(f"Schedule for {schedule['employee']} saved.")

# Upload til MongoDB
try:
    collection = db["schedules"]

    collection.delete_many({ "week_start_date": { "$gte": week_start, "$lt": next_week_start } })
    collection.insert_many(schedule_output)

    print("Schedules uploaded to MongoDB successfully.")

    collection = db["shifts"]

    collection.delete_many({ "date": { "$gte": week_start, "$lt": next_week_start } })
    collection.insert_many(shift_output)

    print("Shifts uploaded to MongoDB successfully.")

except Exception as employee:
    print("Failed to upload to MongoDB:", employee)
