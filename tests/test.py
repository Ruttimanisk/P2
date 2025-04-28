import unittest
import algorithm.schedule

class TestAlgorithm(unittest.TestCase):

    def test_shift_hours(self):
        shifthours = algorithm.schedule.shift_hours('8:30', '16:00')
        self.assertEqual(shifthours, 7.5, 'Subtraction is wrong')
if __name__ == '_main__':
    unittest.main()