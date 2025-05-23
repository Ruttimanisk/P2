import unittest
from algorithm.schedule_with_db import (time_to_minutes,
                                shift_hours,
                                shifts_overlap,
                                Shift,
                                generate_weekday_date_mapping)

class TestTimeToMinutes(unittest.TestCase):

    # ------------- TESTING TIME_TO_MINUTES -------------

        # --------- TESTING FORMAT OF STRING ---------

    def test_time_to_minutes_bad_format(self):
        with self.assertRaises(ValueError):
            time_to_minutes("12.50")

    def test_time_to_minutes_non_string(self):
        with self.assertRaises(ValueError):
            time_to_minutes(1430)

    def test_time_to_minutes_many_comma(self):
        with self.assertRaises(ValueError):
            time_to_minutes("12:30:")

        # ----------- TESTING IF INT IN STRING --------

    def test_time_to_minutes_non_integer(self):
        with self.assertRaises(ValueError):
            time_to_minutes("aa:30")

        # ---------- TESTING IF STATEMENT -------

    def test_time_to_minutes_invalid_hour(self):
        with self.assertRaises(ValueError):
            time_to_minutes("25:00")

    def test_time_to_minutes_invalid_minute(self):
        with self.assertRaises(ValueError):
            time_to_minutes("10:61")

    def test_time_to_minutes_negative_1(self):
        with self.assertRaises(ValueError):
            time_to_minutes("-11:30")

    def test_time_to_minutes_negative_2(self):
        with self.assertRaises(ValueError):
            time_to_minutes("11:-30")

        # ------------ TESTING VALID AND EDGE CASES ------

    def test_time_to_minutes_valid(self):
        self.assertEqual(time_to_minutes("12:30"), 750)

    def test_time_to_minutes_edge_1(self):
        self.assertEqual(time_to_minutes("00:00"), 0)

    def test_time_to_minutes_edge_2(self):
       self.assertEqual(time_to_minutes("23:59"), 1439)

class TestShiftHours(unittest.TestCase):

    # ------------- TESTING SHIFT_HOURS -------------

    def test_shift_hours_negative(self):
        with self.assertRaises(ValueError):
            shift_hours('12:00', '08:00')

    def test_shift_hours_invalid_input(self):
        with self.assertRaises(ValueError):
            shift_hours('9:00', '25:00')

    def test_shift_hours_normal(self):
        self.assertEqual(shift_hours('08:00', '12:00'), 4.0)

    def test_shift_hours_zero(self):
        self.assertEqual(shift_hours('12:00', '12:00'), 0.0)

class TestShiftsOverlap(unittest.TestCase):
    # ------------- TESTING SHIFTS_OVERLAP -------------

    def test_shifts_overlap_true(self):
        shift_1 = Shift("day", "08:30", "12:30")
        shift_2 = Shift("day", "12:00", "14:00")
        assert shifts_overlap(shift_1, shift_2) == True

    def test_shifts_overlap_different_days(self):
        shift_1 = Shift("day_1", "08:30", "11:00")
        shift_2 = Shift("day_2", "12:00", "14:00")
        assert shifts_overlap(shift_1, shift_2) == False

    def test_shifts_overlap_edge(self):
        shift_1 = Shift("day", "08:30", "12:30")
        shift_2 = Shift("day", "12:30", "14:00")
        assert shifts_overlap(shift_1, shift_2) == False

    def test_shifts_overlap_seperate(self):
        shift_1 = Shift("day", "08:30", "11:00")
        shift_2 = Shift("day", "12:00", "14:00")
        assert shifts_overlap(shift_1, shift_2) == False

    def test_shifts_overlap_simultaneous(self):
        shift_1 = Shift("day", "08:30", "12:30")
        shift_2 = Shift("day", "09:00", "11:00")
        assert shifts_overlap(shift_1, shift_2) == True

class TestGenerateWeekdayDateMapping(unittest.TestCase):
    # ---------------- TESTING GENERATE_WEEKDAY_DATE_MAPPING ----------

    def test_generate_weekday_date_mapping_invalid_input(self):
        with self.assertRaises(ValueError):
            generate_weekday_date_mapping("05-25-2025")

    def test_generate_weekday_date_mapping_valid_input(self):
        self.assertTrue(generate_weekday_date_mapping("2025-05-25"))

    # -------------- TESTING ABSENCE FILE-----------


    def test_all_shifts_valid(self):
        self.assertTrue(time_to_minutes("08:00") >= time_to_minutes("07:00") and time_to_minutes("12:00") <= time_to_minutes("13:00"))

    def test_all_shifts_invalid_argument_start(self):
        self.assertEqual(time_to_minutes("06:00") >= time_to_minutes("07:00") and time_to_minutes("12:00") <= time_to_minutes("13:00"), False)

    def test_all_shifts_invalid_argument_end(self):
        self.assertEqual(time_to_minutes("08:00") >= time_to_minutes("09:00") and time_to_minutes("12:00") <= time_to_minutes("10:00"), False)



if __name__ == '_main__':
    unittest.main()