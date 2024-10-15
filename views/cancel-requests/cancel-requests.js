document.addEventListener('DOMContentLoaded', async () => {
    const cancelRequestsTableBody = document.querySelector('#cancelRequestsTable tbody');

    // Fetch all cancel requests
    const response = await fetch('/api/vminds/admin/cancel-requests');
    const cancelRequests = await response.json();

    // Render the cancel requests that are not canceled
    cancelRequests.forEach(request => {
        if (!request.cancelled) {
            const row = document.createElement('tr');
            row.classList.add('request-item');
            row.innerHTML = `
                <td>${request.agreement_id}</td>
                <td>${request.user_id}</td>
                <td>${request.cancelled ? 'Yes' : 'No'}</td>
                <td><button class="mark-canceled" data-id="${request.id}">Mark as Canceled</button></td>
            `;
            cancelRequestsTableBody.appendChild(row);
        }
    });

    // Add event listeners to "Mark as Canceled" buttons
    cancelRequestsTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('mark-canceled')) {
            const requestId = e.target.getAttribute('data-id');

            // Call the API to mark the request as canceled
            const response = await fetch(`/api/vminds/admin/cancel-requests/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cancelled: true })
            });

            if (response.ok) {
                // Animation: fade out and remove the element
                const row = e.target.closest('tr');
                row.classList.add('fade-out');
                setTimeout(() => {
                    row.remove();
                }, 500);
            }
        }
    });
});
