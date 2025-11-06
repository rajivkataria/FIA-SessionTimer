# timer.py
import time
import csv
from pathlib import Path

RECORDS_CSV = Path("records.csv")
COMMANDS = {"exit", "quit", "q"}

records = {}

def record_to_csv(records, csv_path=RECORDS_CSV):
    # append mode so repeated runs accumulate; create header if new file
    header = ["name", "seconds", "timestamp_unix"]
    write_header = not csv_path.exists()
    with csv_path.open("a", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(header)
        ts = int(time.time())
        for name, seconds in records.items():
            writer.writerow([name, seconds, ts])

def start_timer(name):
    print(f"Starting timer for {name!r}... (press Enter to stop)")
    start = time.time()
    try:
        input() 
    except KeyboardInterrupt:
        print("\nInterrupted (Ctrl+C) — stopping timer.")
    end = time.time()
    duration = round(end - start, 2)
    return duration

def main():
    print("Simple timer. Type a name and press Enter to start. Type exit/quit/q to finish.")
    try:
        while True:
            try:
                person = input("Enter person's name (or 'exit' to quit): ").strip()
            except EOFError:
                print("\nEOF received — exiting.")
                break
            except KeyboardInterrupt:
                print("\nInterrupted — exiting.")
                break

            if not person:
                print("No name entered — please type a name (or 'exit').")
                continue

            if person.lower() in COMMANDS:
                print("Exit command received — finishing.")
                break

            try:
                duration = start_timer(person)
            except Exception as e:
                print(f"Error while timing: {e}")
                continue

            # if name repeated, add times together (optional); here we store cumulative
            previous = records.get(person, 0)
            records[person] = round(previous + duration, 2)
            print(f"{person}'s time: {duration} seconds (total: {records[person]}s)\n")

    finally:
        if records:
            print("\n=== Time Records ===")
            for name, duration in records.items():
                print(f"{name}: {duration} seconds")
            # Save to CSV
            try:
                record_to_csv(records)
                print(f"\nSaved records to {RECORDS_CSV.resolve()}")
            except Exception as e:
                print(f"Couldn't save CSV: {e}")
        else:
            print("\nNo records to save. Goodbye.")

if __name__ == "__main__":
    main()
