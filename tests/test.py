import unittest
import algorithm.schedule

class TestAlgorithm(unittest.TestCase):

    def test_shift_hours(self):
        shifthours = algorithm.schedule.shift_hours('8:00', '16:00')
        self.assertEqual(shifthours, 8.0, 'Subtraction is wrong')
if __name__ == '_main__':
    unittest.main()