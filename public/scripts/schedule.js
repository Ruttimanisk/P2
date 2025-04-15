document.addEventListener('DOMContentLoaded', () => {
    const shiftCells = document.querySelectorAll('.shift-cell');
    const statuses = ['Available', 'Sick', 'PTO', 'Maternity'];
    const colors = {
        'Available': '#1f5112',
        'Sick': '#f4081a',
        'PTO': '#1a27b8',
        'Maternity': '#e3ff79'
    };

    shiftCells.forEach(cell => {
        cell.addEventListener('click', () => {
            const current = cell.textContent.trim();
            let nextIndex = (statuses.indexOf(current) + 1) % statuses.length;
            let next = statuses[nextIndex];

            cell.textContent = next;
            cell.className = 'shift-cell ' + next.toLowerCase(); // <- sets the correct CSS class

            // Update hidden input if you're using that
            const day = cell.dataset.day;
            const input = document.querySelector(`input[name="${day}"]`);
            if (input) input.value = next;
        });
    });
});
