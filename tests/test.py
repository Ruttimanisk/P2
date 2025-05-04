import unittest
import algorithm.schedule
from algorithm.schedule import time_to_minutes
from algorithm.schedule import shift_hours

class TestAlgorithm(unittest.TestCase):

    def test_time_to_minutes_valid(self):
        self.assertEqual(time_to_minutes("12:30"), 750)

    def test_time_to_minutes_invalid_hour(self):
        with self.assertRaises(ValueError):
            time_to_minutes("25:00")

    def test_time_to_minutes_invalid_minute(self):
        with self.assertRaises(ValueError):
            time_to_minutes("10:61")

    def test_time_to_minutes_bad_format(self):
        with self.assertRaises(ValueError):
            time_to_minutes("12.50")

    def test_time_to_minutes_non_string(self):
        with self.assertRaises(ValueError):
            time_to_minutes(1430)

    def test_shift_hours_normal(self):
        self.assertEqual(shift_hours('08:00', '12:00'), 4.0)

    def test_shift_hours_zero(self):
        self.assertEqual(shift_hours('12:00', '12:00'), 0.0)

    def test_shift_hours_negative(self):
        with self.assertRaises(ValueError):
            shift_hours('12:00', '08:00')

    def test_shift_hours_invalid_input(self):
        with self.assertRaises(ValueError):
            shift_hours('9:00', '25:00')

if __name__ == '_main__':
    unittest.main()