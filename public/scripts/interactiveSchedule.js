document.addEventListener('DOMContentLoaded', () => {
    const shiftCells = document.querySelectorAll('.shift-cell');
    const statuses = ['Choose an option', 'Default', 'Available', 'Sick', 'PTO', 'Maternity'];
    const colors = {
        'Available': '#e600ff',
        'Sick': '#fc3f4d',
        'PTO': '#44c32a',
        'Maternity': '#fff055'
    };

    shiftCells.forEach(cell => {
        // Set default background
        cell.style.backgroundColor = 'rgb(74,144,226)';

        // Create dropdown
        const select = document.createElement('select');
        select.style.display = 'none';

        statuses.forEach((status, index) => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            if (index === 0) {
                option.disabled = true;
                option.selected = true;
                option.hidden = true; // keeps it as placeholder
            }
            select.appendChild(option);
        });

        cell.appendChild(select);

        // On change
        select.addEventListener('change', () => {
            const selectedStatus = select.value;

            if (selectedStatus === 'Default') {
                cell.style.backgroundColor = 'rgb(74,144,226)';
                cell.textContent = '';
            } else if (colors[selectedStatus]) {
                cell.style.backgroundColor = colors[selectedStatus];
                cell.textContent = selectedStatus;
            }

            cell.appendChild(select);

            // Update hidden input if needed
            const day = cell.dataset.day;
            const input = document.querySelector(`input[name="${day}"]`);
            if (input) input.value = selectedStatus === 'Default' ? '' : selectedStatus;

            // Reset the dropdown so placeholder shows again
            select.selectedIndex = 0;
            select.style.display = 'none';
        });

        // Click to open
        cell.addEventListener('click', () => {
            select.style.display = 'block';
            select.focus();
        });

        // Blur hides it
        select.addEventListener('blur', () => {
            select.style.display = 'none';
        });
    });
});
